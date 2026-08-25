import type { AuthenticatedParentContext } from "../auth/authenticated-parent";

export const TEMPLATE_PUBLICATION_PIPELINE_VERSION =
  "template-publication-v1" as const;
export const TEMPLATE_FINGERPRINT_VERSION = "fingerprint-v1" as const;
export const TEMPLATE_SEMANTIC_VERSION = "semantic-v1" as const;
export const TEMPLATE_MODERATION_VERSION = "moderation-v1" as const;
export const TEMPLATE_SEMANTIC_ALGORITHM = "cosine" as const;
export const TEMPLATE_SIMILARITY_THRESHOLD = 0.9 as const;
export const TEMPLATE_PUBLICATION_REPOSITORY = Symbol(
  "TEMPLATE_PUBLICATION_REPOSITORY"
);
export const TEMPLATE_GENERALIZATION_PORT = Symbol("TEMPLATE_GENERALIZATION_PORT");
export const TEMPLATE_SIMILARITY_PORT = Symbol("TEMPLATE_SIMILARITY_PORT");
export const TEMPLATE_PUBLICATION_MODERATION_PORT = Symbol(
  "TEMPLATE_PUBLICATION_MODERATION_PORT"
);

export type TemplateAudience = "picture-book" | "early-reader";
export type TemplatePublicationOutcome =
  | "ACCEPTED"
  | "REJECTED_DUPLICATE"
  | "REJECTED_REVIEW_REQUIRED"
  | "REJECTED_PRIVACY"
  | "REJECTED_MODERATION"
  | "HELD_TECHNICAL";

export type TemplatePublicationReasonCode =
  | "accepted_unique"
  | "duplicate_fingerprint_and_semantic"
  | "fingerprint_collision_only"
  | "semantic_similarity_only"
  | "privacy_identifier_detected"
  | "moderation_flagged"
  | "moderation_unavailable"
  | "candidate_schema_invalid"
  | "semantic_catalog_not_ready"
  | "semantic_provider_unavailable"
  | "semantic_vector_invalid"
  | "publication_race_lost"
  | "source_book_not_ready";

export interface TemplateSummary {
  id: string;
  title: string;
  audience: TemplateAudience;
  storyType: "educational";
  educationalSubtype: "science-discovery";
}

export interface PublicTemplateSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly storyType: string;
  readonly educationalSubtype: string | null;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly customizableSlots: readonly string[];
  readonly learningObjectives: readonly string[];
}

export interface TemplatesModuleStatus {
  resource: "templates";
  persistence: "not-configured" | "configured";
  supportedAudiences: readonly TemplateAudience[];
  versioning: "planned" | "template-publication-v1";
}

export interface SourceBookForPublication {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly config: unknown;
  readonly storyText: unknown;
  readonly pages: readonly {
    readonly pageNumber: number;
    readonly textContent: string;
    readonly illustrationDescription: string;
  }[];
}

export interface TemplatePublicationCandidate {
  readonly title: string;
  readonly description: string;
  readonly storyType: string;
  readonly educationalSubtype: string | null;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly settingCategory: string;
  readonly characterArchetypes: readonly string[];
  readonly learningObjectives: readonly string[];
  readonly plotBeatKeys: readonly string[];
  readonly illustrationGuidance: string;
  readonly customizableSlots: readonly string[];
}

export interface TemplateSemanticSignature {
  readonly version: typeof TEMPLATE_SEMANTIC_VERSION;
  readonly model: string;
  readonly algorithm: typeof TEMPLATE_SEMANTIC_ALGORITHM;
  readonly vector: readonly number[];
}

export interface TemplatePublicationDecision {
  readonly outcome: TemplatePublicationOutcome;
  readonly reasonCode: TemplatePublicationReasonCode;
  readonly pipelineVersion: typeof TEMPLATE_PUBLICATION_PIPELINE_VERSION;
  readonly fingerprintVersion: typeof TEMPLATE_FINGERPRINT_VERSION;
  readonly semanticVersion: typeof TEMPLATE_SEMANTIC_VERSION;
  readonly moderationVersion: typeof TEMPLATE_MODERATION_VERSION;
  readonly threshold: typeof TEMPLATE_SIMILARITY_THRESHOLD;
  readonly fingerprintCollision: boolean;
  readonly semanticCatalogReady: boolean;
  readonly semanticMaxScore: number | null;
  readonly matchedTemplateIds: readonly string[];
}

export interface TemplatePublicationResult {
  readonly sourceBookId: string;
  readonly templateId: string | null;
  readonly decision: TemplatePublicationDecision;
}

export interface TemplateCatalogEntry {
  readonly id: string;
  readonly uniquenessFingerprint: string;
  readonly semanticVersion: string | null;
  readonly semanticModel: string | null;
  readonly semanticAlgorithm: string | null;
  readonly semanticSignature: readonly number[] | null;
}

export interface TemplatePublicationAuditInput {
  readonly sourceBookId: string | null;
  readonly templateId: string | null;
  readonly actor: TemplatePublicationActor;
  readonly decision: TemplatePublicationDecision;
}

export interface TemplatePublicationActor {
  readonly type: "system" | "admin";
  readonly id: string | null;
}

export interface TemplatePublicationRepository {
  loadReadySourceBook(sourceBookId: string): Promise<SourceBookForPublication | null>;
  findDecision(
    sourceBookId: string,
    pipelineVersion: typeof TEMPLATE_PUBLICATION_PIPELINE_VERSION
  ): Promise<TemplatePublicationResult | null>;
  listActivePublicCatalog(): Promise<readonly TemplateCatalogEntry[]>;
  acceptPublication(input: {
    readonly sourceBook: SourceBookForPublication;
    readonly candidate: TemplatePublicationCandidate;
    readonly fingerprint: string;
    readonly signature: TemplateSemanticSignature;
    readonly decision: TemplatePublicationDecision;
    readonly actor: TemplatePublicationActor;
  }): Promise<TemplatePublicationResult>;
  recordDecision(input: TemplatePublicationAuditInput): Promise<TemplatePublicationResult>;
  listPublicTemplates(): Promise<readonly PublicTemplateSummary[]>;
  getPublicTemplate(templateId: string): Promise<PublicTemplateSummary | null>;
  disableTemplate(input: {
    readonly admin: AuthenticatedParentContext;
    readonly templateId: string;
  }): Promise<boolean>;
}

export interface TemplateGeneralizationPort {
  deriveCandidate(
    sourceBook: SourceBookForPublication
  ): Promise<TemplatePublicationCandidate>;
}

export interface TemplateSimilarityPort {
  createSignature(
    candidate: TemplatePublicationCandidate
  ): Promise<TemplateSemanticSignature>;
}
