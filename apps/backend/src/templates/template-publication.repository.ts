import { Injectable } from "@nestjs/common";
import type { PrismaService } from "../database/prisma.service";
import { scanTemplateSimilarity } from "./template-similarity";
import type {
  PublicTemplateSummary,
  SourceBookForPublication,
  TemplateCatalogEntry,
  TemplatePublicationAuditInput,
  TemplatePublicationDecision,
  TemplatePublicationRepository,
  TemplatePublicationResult
} from "./templates.interfaces";
import {
  TEMPLATE_PUBLICATION_PIPELINE_VERSION,
  TEMPLATE_SIMILARITY_THRESHOLD
} from "./templates.interfaces";

@Injectable()
export class PrismaTemplatePublicationRepository
  implements TemplatePublicationRepository
{
  private readonly client: TemplatePublicationPrismaClient;

  public constructor(prisma: PrismaService) {
    this.client = prisma as unknown as TemplatePublicationPrismaClient;
  }

  public async loadReadySourceBook(
    sourceBookId: string
  ): Promise<SourceBookForPublication | null> {
    const book = await this.client.book.findFirst({
      where: { id: sourceBookId, status: "READY" },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" }
        }
      }
    });
    if (!book) {
      return null;
    }

    return {
      id: book.id,
      userId: book.userId,
      title: book.title ?? "Untitled book",
      config: book.config,
      storyText: book.pages.map((page) => page.textContent).join("\n"),
      pages: book.pages.map((page) => ({
        pageNumber: page.pageNumber,
        textContent: page.textContent,
        illustrationDescription: page.illustrationDescription
      }))
    };
  }

  public async findDecision(
    sourceBookId: string,
    pipelineVersion: "template-publication-v1"
  ): Promise<TemplatePublicationResult | null> {
    const audit = await this.client.templatePublicationAudit.findFirst({
      where: { sourceBookId, pipelineVersion },
      orderBy: { createdAt: "asc" }
    });
    if (!audit) {
      return null;
    }

    return {
      sourceBookId,
      templateId: audit.templateId,
      decision: auditDecision(audit)
    };
  }

  public async listActivePublicCatalog(): Promise<readonly TemplateCatalogEntry[]> {
    return listActivePublicCatalog(this.client);
  }

  public async acceptPublication(input: Parameters<
    TemplatePublicationRepository["acceptPublication"]
  >[0]): Promise<TemplatePublicationResult> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext('template-publication-v1'))"
      );

      const existingAudit = await tx.templatePublicationAudit.findFirst({
        where: {
          sourceBookId: input.sourceBook.id,
          pipelineVersion: TEMPLATE_PUBLICATION_PIPELINE_VERSION
        },
        orderBy: { createdAt: "asc" }
      });
      if (existingAudit) {
        return {
          sourceBookId: input.sourceBook.id,
          templateId: existingAudit.templateId,
          decision: auditDecision(existingAudit)
        };
      }

      const catalog = await listActivePublicCatalog(tx);
      const finalDecision = finalPublicationDecision({
        fingerprint: input.fingerprint,
        signature: input.signature,
        catalog: catalog,
        initialDecision: input.decision
      });
      if (finalDecision.outcome !== "ACCEPTED") {
        const audit = await tx.templatePublicationAudit.create({
          data: auditCreateInput({
            sourceBookId: input.sourceBook.id,
            templateId: null,
            actor: input.actor,
            decision: finalDecision
          })
        });

        return {
          sourceBookId: input.sourceBook.id,
          templateId: null,
          decision: auditDecision(audit)
        };
      }

      const template = await tx.template.create({
        data: {
          ownerUserId: input.sourceBook.userId,
          sourceBookId: input.sourceBook.id,
          title: input.candidate.title,
          description: input.candidate.description,
          ageMin: input.candidate.ageMin,
          ageMax: input.candidate.ageMax,
          storyType: input.candidate.storyType,
          educationalSubtype: input.candidate.educationalSubtype,
          visibility: "PUBLIC",
          publicationStatus: "ACCEPTED",
          uniquenessFingerprint: input.fingerprint,
          pipelineVersion: input.decision.pipelineVersion,
          fingerprintVersion: input.decision.fingerprintVersion,
          semanticVersion: input.signature.version,
          semanticModel: input.signature.model,
          semanticAlgorithm: input.signature.algorithm,
          semanticSignature: [...input.signature.vector],
          generalizedConfig: {
            settingCategory: input.candidate.settingCategory,
            characterArchetypes: [...input.candidate.characterArchetypes],
            learningObjectives: [...input.candidate.learningObjectives],
            plotBeatKeys: [...input.candidate.plotBeatKeys],
            illustrationGuidance: input.candidate.illustrationGuidance,
            customizableSlots: [...input.candidate.customizableSlots]
          },
          safetyReview: {
            moderationVersion: input.decision.moderationVersion,
            privacyPassed: true,
            moderationPassed: true
          },
          publicationDecision: finalDecision
        }
      });
      await tx.templatePublicationAudit.create({
        data: auditCreateInput({
          sourceBookId: input.sourceBook.id,
          templateId: template.id,
          actor: input.actor,
          decision: finalDecision
        })
      });

      return {
        sourceBookId: input.sourceBook.id,
        templateId: template.id,
        decision: finalDecision
      };
    });
  }

  public async recordDecision(
    input: TemplatePublicationAuditInput
  ): Promise<TemplatePublicationResult> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext('template-publication-v1'))"
      );

      if (input.sourceBookId) {
        const existingAudit = await tx.templatePublicationAudit.findFirst({
          where: {
            sourceBookId: input.sourceBookId,
            pipelineVersion: TEMPLATE_PUBLICATION_PIPELINE_VERSION
          },
          orderBy: { createdAt: "asc" }
        });
        if (existingAudit) {
          return {
            sourceBookId: input.sourceBookId,
            templateId: existingAudit.templateId,
            decision: auditDecision(existingAudit)
          };
        }
      }

      const audit = await tx.templatePublicationAudit.create({
        data: auditCreateInput(input)
      });

      return {
        sourceBookId: input.sourceBookId ?? "",
        templateId: input.templateId,
        decision: auditDecision(audit)
      };
    });
  }

  public async listPublicTemplates(): Promise<readonly PublicTemplateSummary[]> {
    const templates = await this.client.template.findMany({
      where: {
        visibility: "PUBLIC",
        publicationStatus: "ACCEPTED",
        disabledAt: null
      },
      orderBy: { createdAt: "desc" }
    });

    return templates.map(publicSummary);
  }

  public async getPublicTemplate(
    templateId: string
  ): Promise<PublicTemplateSummary | null> {
    const template = await this.client.template.findFirst({
      where: {
        id: templateId,
        visibility: "PUBLIC",
        publicationStatus: "ACCEPTED",
        disabledAt: null
      }
    });

    return template ? publicSummary(template) : null;
  }

  public async disableTemplate(input: Parameters<
    TemplatePublicationRepository["disableTemplate"]
  >[0]): Promise<boolean> {
    await this.client.template.updateMany({
      where: {
        id: input.templateId,
        visibility: "PUBLIC",
        disabledAt: null
      },
      data: {
        disabledAt: new Date(),
        disabledByUserId: input.admin.parentId,
        publicationStatus: "REJECTED"
      }
    });

    return true;
  }
}

async function listActivePublicCatalog(
  client: TemplatePublicationPrismaClient
): Promise<readonly TemplateCatalogEntry[]> {
  const templates = await client.template.findMany({
    where: {
      visibility: "PUBLIC",
      publicationStatus: "ACCEPTED",
      disabledAt: null
    },
    select: {
      id: true,
      uniquenessFingerprint: true,
      semanticVersion: true,
      semanticModel: true,
      semanticAlgorithm: true,
      semanticSignature: true
    }
  });

  return templates.map((template) => ({
    id: template.id,
    uniquenessFingerprint: template.uniquenessFingerprint ?? "",
    semanticVersion: template.semanticVersion ?? null,
    semanticModel: template.semanticModel ?? null,
    semanticAlgorithm: template.semanticAlgorithm ?? null,
    semanticSignature: Array.isArray(template.semanticSignature)
      ? template.semanticSignature.filter(
          (value): value is number => typeof value === "number"
        )
      : null
  }));
}

function finalPublicationDecision(input: {
  readonly fingerprint: string;
  readonly signature: Parameters<typeof scanTemplateSimilarity>[0]["candidate"];
  readonly catalog: readonly TemplateCatalogEntry[];
  readonly initialDecision: TemplatePublicationDecision;
}): TemplatePublicationDecision {
  const fingerprintCollision = input.catalog.some(
    (entry) => entry.uniquenessFingerprint === input.fingerprint
  );
  const similarity = scanTemplateSimilarity({
    candidate: input.signature,
    catalog: input.catalog,
    threshold: TEMPLATE_SIMILARITY_THRESHOLD
  });

  if (!similarity.catalogReady) {
    return {
      ...input.initialDecision,
      outcome: "HELD_TECHNICAL",
      reasonCode: similarity.invalidReason ?? "semantic_catalog_not_ready",
      fingerprintCollision,
      semanticCatalogReady: false,
      semanticMaxScore: null,
      matchedTemplateIds: []
    };
  }

  if (fingerprintCollision && similarity.matchedTemplateIds.length > 0) {
    return {
      ...input.initialDecision,
      outcome: "REJECTED_DUPLICATE",
      reasonCode: "duplicate_fingerprint_and_semantic",
      fingerprintCollision: true,
      semanticCatalogReady: true,
      semanticMaxScore: similarity.maxScore,
      matchedTemplateIds: similarity.matchedTemplateIds
    };
  }

  if (fingerprintCollision) {
    return {
      ...input.initialDecision,
      outcome: "REJECTED_REVIEW_REQUIRED",
      reasonCode: "fingerprint_collision_only",
      fingerprintCollision: true,
      semanticCatalogReady: true,
      semanticMaxScore: similarity.maxScore,
      matchedTemplateIds: similarity.matchedTemplateIds
    };
  }

  if (similarity.matchedTemplateIds.length > 0) {
    return {
      ...input.initialDecision,
      outcome: "REJECTED_REVIEW_REQUIRED",
      reasonCode: "semantic_similarity_only",
      fingerprintCollision: false,
      semanticCatalogReady: true,
      semanticMaxScore: similarity.maxScore,
      matchedTemplateIds: similarity.matchedTemplateIds
    };
  }

  return {
    ...input.initialDecision,
    outcome: "ACCEPTED",
    reasonCode: "accepted_unique",
    fingerprintCollision: false,
    semanticCatalogReady: true,
    semanticMaxScore: similarity.maxScore,
    matchedTemplateIds: []
  };
}

interface TemplatePublicationPrismaClient {
  readonly book: {
    findFirst(input: unknown): Promise<PrismaBookWithPages | null>;
  };
  readonly template: {
    create(input: unknown): Promise<PrismaTemplateRecord>;
    findMany(input: unknown): Promise<PrismaTemplateRecord[]>;
    findFirst(input: unknown): Promise<PrismaTemplateRecord | null>;
    updateMany(input: unknown): Promise<unknown>;
  };
  readonly templatePublicationAudit: {
    findFirst(input: unknown): Promise<PrismaAuditRecord | null>;
    create(input: unknown): Promise<PrismaAuditRecord>;
  };
  $executeRawUnsafe(query: string): Promise<unknown>;
  $transaction<T>(
    input: (client: TemplatePublicationPrismaClient) => Promise<T>
  ): Promise<T>;
}

interface PrismaBookWithPages {
  readonly id: string;
  readonly userId: string;
  readonly title: string | null;
  readonly config: unknown;
  readonly pages: readonly {
    readonly pageNumber: number;
    readonly textContent: string;
    readonly illustrationDescription: string;
  }[];
}

interface PrismaTemplateRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly storyType: string;
  readonly educationalSubtype: string | null;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly uniquenessFingerprint?: string | null;
  readonly semanticVersion?: string | null;
  readonly semanticModel?: string | null;
  readonly semanticAlgorithm?: string | null;
  readonly semanticSignature?: unknown;
  readonly generalizedConfig: unknown;
}

interface PrismaAuditRecord {
  readonly templateId: string | null;
  readonly outcome: TemplatePublicationDecision["outcome"];
  readonly reasonCode: TemplatePublicationDecision["reasonCode"];
  readonly pipelineVersion: "template-publication-v1";
  readonly fingerprintVersion: "fingerprint-v1";
  readonly semanticVersion: "semantic-v1";
  readonly moderationVersion: "moderation-v1";
  readonly fingerprintCollision: boolean;
  readonly semanticCatalogReady: boolean;
  readonly semanticMaxScore: number | null;
  readonly matchedTemplateIds: unknown;
}

function auditCreateInput(input: TemplatePublicationAuditInput) {
  return {
    sourceBookId: input.sourceBookId,
    templateId: input.templateId,
    actorType: input.actor.type,
    actorId: input.actor.id,
    pipelineVersion: input.decision.pipelineVersion,
    fingerprintVersion: input.decision.fingerprintVersion,
    semanticVersion: input.decision.semanticVersion,
    moderationVersion: input.decision.moderationVersion,
    privacyPassed: input.decision.reasonCode !== "privacy_identifier_detected",
    moderationPassed: ![
      "moderation_flagged",
      "moderation_unavailable"
    ].includes(input.decision.reasonCode),
    fingerprintCollision: input.decision.fingerprintCollision,
    semanticCatalogReady: input.decision.semanticCatalogReady,
    semanticMaxScore: input.decision.semanticMaxScore,
    matchedTemplateIds: [...input.decision.matchedTemplateIds],
    outcome: input.decision.outcome,
    reasonCode: input.decision.reasonCode
  };
}

function auditDecision(audit: {
  outcome: TemplatePublicationDecision["outcome"];
  reasonCode: TemplatePublicationDecision["reasonCode"];
  pipelineVersion: "template-publication-v1";
  fingerprintVersion: "fingerprint-v1";
  semanticVersion: "semantic-v1";
  moderationVersion: "moderation-v1";
  fingerprintCollision: boolean;
  semanticCatalogReady: boolean;
  semanticMaxScore: number | null;
  matchedTemplateIds: unknown;
}): TemplatePublicationDecision {
  return {
    outcome: audit.outcome,
    reasonCode: audit.reasonCode,
    pipelineVersion: audit.pipelineVersion,
    fingerprintVersion: audit.fingerprintVersion,
    semanticVersion: audit.semanticVersion,
    moderationVersion: audit.moderationVersion,
    threshold: 0.9 as const,
    fingerprintCollision: audit.fingerprintCollision,
    semanticCatalogReady: audit.semanticCatalogReady,
    semanticMaxScore: audit.semanticMaxScore,
    matchedTemplateIds: Array.isArray(audit.matchedTemplateIds)
      ? audit.matchedTemplateIds.filter(
          (value): value is string => typeof value === "string"
        )
      : []
  };
}

function publicSummary(template: {
  id: string;
  title: string;
  description: string;
  storyType: string;
  educationalSubtype: string | null;
  ageMin: number;
  ageMax: number;
  generalizedConfig: unknown;
}): PublicTemplateSummary {
  const config =
    template.generalizedConfig && typeof template.generalizedConfig === "object"
      ? (template.generalizedConfig as Record<string, unknown>)
      : {};

  return {
    id: template.id,
    title: template.title,
    description: template.description,
    storyType: template.storyType,
    educationalSubtype: template.educationalSubtype,
    ageMin: template.ageMin,
    ageMax: template.ageMax,
    customizableSlots: stringArray(config["customizableSlots"]),
    learningObjectives: stringArray(config["learningObjectives"])
  };
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
