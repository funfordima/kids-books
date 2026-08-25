import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException
} from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
import type { ModerationPort } from "../generation/provider.ports";
import { computeTemplateFingerprint, parseTemplatePublicationCandidate } from "./template-fingerprint";
import { checkTemplatePrivacy } from "./template-privacy";
import { scanTemplateSimilarity } from "./template-similarity";
import type {
  PublicTemplateSummary,
  SourceBookForPublication,
  TemplateGeneralizationPort,
  TemplatePublicationActor,
  TemplatePublicationDecision,
  TemplatePublicationReasonCode,
  TemplatePublicationRepository,
  TemplatePublicationResult,
  TemplateSemanticSignature,
  TemplateSimilarityPort,
  TemplatesModuleStatus,
  TemplateSummary
} from "./templates.interfaces";
import {
  TEMPLATE_FINGERPRINT_VERSION,
  TEMPLATE_GENERALIZATION_PORT,
  TEMPLATE_MODERATION_VERSION,
  TEMPLATE_PUBLICATION_MODERATION_PORT,
  TEMPLATE_PUBLICATION_PIPELINE_VERSION,
  TEMPLATE_PUBLICATION_REPOSITORY,
  TEMPLATE_SEMANTIC_VERSION,
  TEMPLATE_SIMILARITY_PORT,
  TEMPLATE_SIMILARITY_THRESHOLD
} from "./templates.interfaces";

@Injectable()
export class TemplatesService {
  public constructor(
    @Optional()
    @Inject(TEMPLATE_PUBLICATION_REPOSITORY)
    private readonly publicationRepository?: TemplatePublicationRepository,
    @Optional()
    @Inject(TEMPLATE_GENERALIZATION_PORT)
    private readonly generalizer?: TemplateGeneralizationPort,
    @Optional()
    @Inject(TEMPLATE_SIMILARITY_PORT)
    private readonly similarity?: TemplateSimilarityPort,
    @Optional()
    @Inject(TEMPLATE_PUBLICATION_MODERATION_PORT)
    private readonly moderation?: ModerationPort
  ) {}

  public getStatus(): TemplatesModuleStatus {
    return {
      resource: "templates",
      persistence: this.publicationRepository ? "configured" : "not-configured",
      supportedAudiences: ["picture-book", "early-reader"],
      versioning: this.publicationRepository
        ? TEMPLATE_PUBLICATION_PIPELINE_VERSION
        : "planned"
    };
  }

  public listTemplates(
    _parent: AuthenticatedParentContext
  ): readonly TemplateSummary[] {
    void _parent;
    return createDeferredImplementationError("Template listing");
  }

  public getTemplate(
    _parent: AuthenticatedParentContext,
    _templateId: string
  ): TemplateSummary {
    void _parent;
    void _templateId;
    return createDeferredImplementationError("Template lookup");
  }

  public async listPublicTemplates(): Promise<readonly PublicTemplateSummary[]> {
    return this.requireRepository().listPublicTemplates();
  }

  public async getPublicTemplate(
    templateId: string
  ): Promise<PublicTemplateSummary | null> {
    return this.requireRepository().getPublicTemplate(templateId);
  }

  public async publishSourceBookAsPublicTemplate(input: {
    readonly sourceBookId: string;
    readonly actor: TemplatePublicationActor;
  }): Promise<TemplatePublicationResult> {
    if (input.actor.type !== "system") {
      throw new ForbiddenException("Only the system publication worker may publish templates.");
    }

    const repository = this.requireRepository();
    const existingDecision = await repository.findDecision(
      input.sourceBookId,
      TEMPLATE_PUBLICATION_PIPELINE_VERSION
    );
    if (existingDecision) {
      return existingDecision;
    }

    const sourceBook = await repository.loadReadySourceBook(input.sourceBookId);
    if (!sourceBook) {
      return repository.recordDecision({
        sourceBookId: input.sourceBookId,
        templateId: null,
        actor: input.actor,
        decision: this.createDecision("HELD_TECHNICAL", "source_book_not_ready")
      });
    }

    return this.evaluateAndPersistCandidate(sourceBook, input.actor);
  }

  public async disablePublicTemplate(input: {
    readonly admin: AuthenticatedParentContext;
    readonly templateId: string;
  }): Promise<boolean> {
    if (input.admin.role !== "admin") {
      throw new ForbiddenException("Template administration requires an admin parent.");
    }

    return this.requireRepository().disableTemplate(input);
  }

  private async evaluateAndPersistCandidate(
    sourceBook: SourceBookForPublication,
    actor: TemplatePublicationActor
  ): Promise<TemplatePublicationResult> {
    const repository = this.requireRepository();
    const generalizer = this.requireGeneralizer();
    const candidateResult = await this.deriveCandidate(sourceBook, generalizer);
    if (!candidateResult.ok) {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision("HELD_TECHNICAL", "candidate_schema_invalid")
      });
    }

    const privacy = checkTemplatePrivacy(sourceBook, candidateResult.candidate);
    if (!privacy.passed) {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision("REJECTED_PRIVACY", "privacy_identifier_detected")
      });
    }

    const moderationPassed = await this.moderateCandidate(candidateResult.candidate);
    if (moderationPassed !== true) {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision(
          "REJECTED_MODERATION",
          moderationPassed === false ? "moderation_flagged" : "moderation_unavailable"
        )
      });
    }

    const fingerprint = computeTemplateFingerprint(candidateResult.candidate);
    const signature = await this.createSignature(candidateResult.candidate);
    if (!signature) {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision("HELD_TECHNICAL", "semantic_provider_unavailable")
      });
    }

    const catalog = await repository.listActivePublicCatalog();
    const fingerprintCollision = catalog.some(
      (entry) => entry.uniquenessFingerprint === fingerprint
    );
    const similarity = scanTemplateSimilarity({
      candidate: signature,
      catalog,
      threshold: TEMPLATE_SIMILARITY_THRESHOLD
    });

    if (!similarity.catalogReady) {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision(
          "HELD_TECHNICAL",
          similarity.invalidReason ?? "semantic_catalog_not_ready",
          { fingerprintCollision, semanticCatalogReady: false }
        )
      });
    }

    const hasSemanticMatch = similarity.matchedTemplateIds.length > 0;
    const decision = this.decide({
      fingerprintCollision,
      hasSemanticMatch,
      semanticMaxScore: similarity.maxScore,
      matchedTemplateIds: similarity.matchedTemplateIds
    });

    if (decision.outcome !== "ACCEPTED") {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision
      });
    }

    try {
      return await repository.acceptPublication({
        sourceBook,
        candidate: candidateResult.candidate,
        fingerprint,
        signature,
        decision,
        actor
      });
    } catch {
      return repository.recordDecision({
        sourceBookId: sourceBook.id,
        templateId: null,
        actor,
        decision: this.createDecision("HELD_TECHNICAL", "publication_race_lost")
      });
    }
  }

  private async deriveCandidate(
    sourceBook: SourceBookForPublication,
    generalizer: TemplateGeneralizationPort
  ): Promise<
    | { readonly ok: true; readonly candidate: ReturnType<typeof parseTemplatePublicationCandidate> }
    | { readonly ok: false }
  > {
    try {
      const candidate = parseTemplatePublicationCandidate(
        await generalizer.deriveCandidate(sourceBook)
      );
      return { ok: true, candidate };
    } catch {
      return { ok: false };
    }
  }

  private async moderateCandidate(
    candidate: ReturnType<typeof parseTemplatePublicationCandidate>
  ): Promise<boolean | "unavailable"> {
    if (!this.moderation) {
      return "unavailable";
    }

    try {
      const result = await this.moderation.moderateText(
        [
          candidate.title,
          candidate.description,
          candidate.illustrationGuidance,
          ...candidate.learningObjectives,
          ...candidate.plotBeatKeys
        ].join("\n")
      );
      return !result.flagged;
    } catch {
      return "unavailable";
    }
  }

  private async createSignature(
    candidate: ReturnType<typeof parseTemplatePublicationCandidate>
  ): Promise<TemplateSemanticSignature | null> {
    try {
      return await this.requireSimilarity().createSignature(candidate);
    } catch {
      return null;
    }
  }

  private decide(input: {
    readonly fingerprintCollision: boolean;
    readonly hasSemanticMatch: boolean;
    readonly semanticMaxScore: number | null;
    readonly matchedTemplateIds: readonly string[];
  }): TemplatePublicationDecision {
    if (input.fingerprintCollision && input.hasSemanticMatch) {
      return this.createDecision(
        "REJECTED_DUPLICATE",
        "duplicate_fingerprint_and_semantic",
        input
      );
    }

    if (input.fingerprintCollision) {
      return this.createDecision(
        "REJECTED_REVIEW_REQUIRED",
        "fingerprint_collision_only",
        input
      );
    }

    if (input.hasSemanticMatch) {
      return this.createDecision(
        "REJECTED_REVIEW_REQUIRED",
        "semantic_similarity_only",
        input
      );
    }

    return this.createDecision("ACCEPTED", "accepted_unique", input);
  }

  private createDecision(
    outcome: TemplatePublicationDecision["outcome"],
    reasonCode: TemplatePublicationReasonCode,
    partial: Partial<Pick<
      TemplatePublicationDecision,
      "fingerprintCollision" | "semanticCatalogReady" | "semanticMaxScore" | "matchedTemplateIds"
    >> = {}
  ): TemplatePublicationDecision {
    return {
      outcome,
      reasonCode,
      pipelineVersion: TEMPLATE_PUBLICATION_PIPELINE_VERSION,
      fingerprintVersion: TEMPLATE_FINGERPRINT_VERSION,
      semanticVersion: TEMPLATE_SEMANTIC_VERSION,
      moderationVersion: TEMPLATE_MODERATION_VERSION,
      threshold: TEMPLATE_SIMILARITY_THRESHOLD,
      fingerprintCollision: partial.fingerprintCollision ?? false,
      semanticCatalogReady: partial.semanticCatalogReady ?? true,
      semanticMaxScore: partial.semanticMaxScore ?? null,
      matchedTemplateIds: partial.matchedTemplateIds ?? []
    };
  }

  private requireRepository(): TemplatePublicationRepository {
    if (!this.publicationRepository) {
      throw new ServiceUnavailableException("Template persistence is not configured.");
    }

    return this.publicationRepository;
  }

  private requireGeneralizer(): TemplateGeneralizationPort {
    if (!this.generalizer) {
      throw new ServiceUnavailableException("Template generalization is not configured.");
    }

    return this.generalizer;
  }

  private requireSimilarity(): TemplateSimilarityPort {
    if (!this.similarity) {
      throw new ServiceUnavailableException("Template similarity is not configured.");
    }

    return this.similarity;
  }
}
