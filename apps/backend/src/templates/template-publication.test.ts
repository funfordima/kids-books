import { ForbiddenException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { computeTemplateFingerprint } from "./template-fingerprint";
import { checkTemplatePrivacy } from "./template-privacy";
import {
  DeterministicTemplateGeneralizer,
  DeterministicTemplateSimilarityPort
} from "./template-publication.ports";
import { PrismaTemplatePublicationRepository } from "./template-publication.repository";
import { scanTemplateSimilarity } from "./template-similarity";
import {
  TEMPLATE_SEMANTIC_ALGORITHM,
  TEMPLATE_SEMANTIC_VERSION,
  type SourceBookForPublication,
  type TemplatePublicationCandidate,
  type TemplatePublicationRepository,
  type TemplateSemanticSignature
} from "./templates.interfaces";
import { TemplatesService } from "./templates.service";

const sourceBook: SourceBookForPublication = {
  id: "book-1",
  userId: "parent-1",
  title: "Mila learns about stars",
  config: {
    childName: "Mila",
    ageGroup: "5-6",
    pronouns: "she/her",
    friendName: "Noah",
    storyDescription: "Mila and Noah visit Lincoln School",
    storyType: "educational",
    educationalSubtype: "science-discovery",
    setting: "space",
    illustrationStyle: "watercolor",
    pageCount: 8
  },
  storyText: "Mila and Noah look at the moon.",
  pages: [
    {
      pageNumber: 1,
      textContent: "Mila asks a question.",
      illustrationDescription: "Mila points at the sky."
    }
  ]
};

const candidate: TemplatePublicationCandidate = {
  title: "Curious Stars Template",
  description:
    "A reusable science story where a child protagonist asks careful questions about the night sky.",
  storyType: "educational",
  educationalSubtype: "science-discovery",
  ageMin: 5,
  ageMax: 6,
  settingCategory: "space",
  characterArchetypes: ["child protagonist", "supportive companion"],
  learningObjectives: ["Practice observation", "Ask science questions"],
  plotBeatKeys: ["notice mystery", "test idea", "share discovery"],
  illustrationGuidance: "Warm child-safe night scenes with no readable text.",
  customizableSlots: ["protagonist name", "companion archetype"]
};

describe("template publication helpers", () => {
  it("normalizes equivalent metadata to the same fingerprint", () => {
    const variant = {
      ...candidate,
      storyType: " Educational ",
      characterArchetypes: ["supportive companion", "CHILD   protagonist"],
      learningObjectives: ["ask science questions", "Practice Observation"],
      plotBeatKeys: ["share discovery", "notice mystery", "test idea"],
      customizableSlots: ["companion archetype", "protagonist name"]
    };

    expect(computeTemplateFingerprint(variant)).toEqual(
      computeTemplateFingerprint(candidate)
    );
  });

  it("fails privacy checks without exposing matched values", () => {
    const unsafe = {
      ...candidate,
      description: "A story for Mila at Lincoln School"
    };

    expect(checkTemplatePrivacy(sourceBook, unsafe)).toEqual({
      passed: false,
      matchedCount: 2
    });
  });

  it("marks semantic matches at the 0.90 threshold and rejects stale catalog entries", () => {
    const signature: TemplateSemanticSignature = {
      version: TEMPLATE_SEMANTIC_VERSION,
      model: "mock",
      algorithm: TEMPLATE_SEMANTIC_ALGORITHM,
      vector: [1, 0]
    };

    expect(
      scanTemplateSimilarity({
        candidate: signature,
        threshold: 0.9,
        catalog: [
          {
            id: "near",
            uniquenessFingerprint: "other",
            semanticVersion: TEMPLATE_SEMANTIC_VERSION,
            semanticModel: "mock",
            semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
            semanticSignature: [0.9, Math.sqrt(0.19)]
          }
        ]
      }).matchedTemplateIds
    ).toEqual(["near"]);

    expect(
      scanTemplateSimilarity({
        candidate: signature,
        threshold: 0.9,
        catalog: [
          {
            id: "stale",
            uniquenessFingerprint: "other",
            semanticVersion: "semantic-v0",
            semanticModel: "mock",
            semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
            semanticSignature: [1, 0]
          }
        ]
      }).invalidReason
    ).toBe("semantic_catalog_not_ready");
  });

  it("derives deterministic generalized candidates and signatures", async () => {
    const generalizer = new DeterministicTemplateGeneralizer();
    const similarity = new DeterministicTemplateSimilarityPort();

    const derived = await generalizer.deriveCandidate(sourceBook);
    const signature = await similarity.createSignature(derived);

    expect(derived.title).toBe("A Educational Template");
    expect(derived.customizableSlots).toContain("protagonist name");
    expect(signature.version).toBe(TEMPLATE_SEMANTIC_VERSION);
    expect(signature.vector).toHaveLength(8);
  });
});

describe("TemplatesService publication workflow", () => {
  it("fails closed when publication persistence is not configured", async () => {
    const service = new TemplatesService();

    await expect(
      service.publishSourceBookAsPublicTemplate({
        sourceBookId: "book-1",
        actor: { type: "system", id: null }
      })
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("reuses an existing decision for idempotent retries", async () => {
    const existing = {
      sourceBookId: "book-1",
      templateId: "template-1",
      decision: {
        outcome: "ACCEPTED" as const,
        reasonCode: "accepted_unique" as const,
        pipelineVersion: "template-publication-v1" as const,
        fingerprintVersion: "fingerprint-v1" as const,
        semanticVersion: "semantic-v1" as const,
        moderationVersion: "moderation-v1" as const,
        threshold: 0.9 as const,
        fingerprintCollision: false,
        semanticCatalogReady: true,
        semanticMaxScore: null,
        matchedTemplateIds: []
      }
    };
    const repository = repositoryStub({ existing });
    const service = serviceWith(repository);

    await expect(
      service.publishSourceBookAsPublicTemplate({
        sourceBookId: "book-1",
        actor: { type: "system", id: null }
      })
    ).resolves.toBe(existing);
    expect(mockCallCount(repository, "loadReadySourceBook")).toBe(0);
  });

  it("accepts unique privacy-clean moderated candidates", async () => {
    const repository = repositoryStub();
    const service = serviceWith(repository);

    const result = await service.publishSourceBookAsPublicTemplate({
      sourceBookId: "book-1",
      actor: { type: "system", id: null }
    });

    expect(result.templateId).toBe("template-1");
    expect(result.decision.outcome).toBe("ACCEPTED");
    expect(mockCallCount(repository, "acceptPublication")).toBe(1);
    expect(mockCallCount(repository, "recordDecision")).toBe(0);
  });

  it("keeps duplicate and suspicious candidates private", async () => {
    const fingerprint = computeTemplateFingerprint(candidate);
    const repository = repositoryStub({
      catalog: [
        {
          id: "template-existing",
          uniquenessFingerprint: fingerprint,
          semanticVersion: TEMPLATE_SEMANTIC_VERSION,
          semanticModel: "mock",
          semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
          semanticSignature: [1, 0]
        }
      ]
    });
    const service = serviceWith(repository, { vector: [1, 0] });

    const result = await service.publishSourceBookAsPublicTemplate({
      sourceBookId: "book-1",
      actor: { type: "system", id: null }
    });

    expect(result.templateId).toBeNull();
    expect(result.decision.outcome).toBe("REJECTED_DUPLICATE");
    expect(result.decision.reasonCode).toBe(
      "duplicate_fingerprint_and_semantic"
    );
    expect(mockCallCount(repository, "acceptPublication")).toBe(0);
  });

  it("requires system publication and admin disable authority", async () => {
    const repository = repositoryStub();
    const service = serviceWith(repository);

    await expect(
      service.publishSourceBookAsPublicTemplate({
        sourceBookId: "book-1",
        actor: { type: "admin", id: "admin-1" }
      })
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.disablePublicTemplate({
        templateId: "template-1",
        admin: {
          parentId: "parent-1",
          email: "parent@example.test",
          role: "guardian"
        }
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it("records fail-closed non-public decisions for unavailable inputs", async () => {
    const repository = repositoryStub({ source: null });
    const service = serviceWith(repository);

    const result = await service.publishSourceBookAsPublicTemplate({
      sourceBookId: "book-missing",
      actor: { type: "system", id: null }
    });

    expect(result.decision.reasonCode).toBe("source_book_not_ready");
    expect(mockCallCount(repository, "recordDecision")).toBe(1);
  });

  it("routes moderation and semantic uncertainty to non-public outcomes", async () => {
    const flagged = serviceWith(repositoryStub(), {}, true);
    const moderationResult = await flagged.publishSourceBookAsPublicTemplate({
      sourceBookId: "book-1",
      actor: { type: "system", id: null }
    });

    expect(moderationResult.decision.outcome).toBe("REJECTED_MODERATION");

    const staleCatalog = serviceWith(
      repositoryStub({
        catalog: [
          {
            id: "stale",
            uniquenessFingerprint: "other",
            semanticVersion: null,
            semanticModel: null,
            semanticAlgorithm: null,
            semanticSignature: null
          }
        ]
      })
    );
    const staleResult = await staleCatalog.publishSourceBookAsPublicTemplate({
      sourceBookId: "book-1",
      actor: { type: "system", id: null }
    });

    expect(staleResult.decision.reasonCode).toBe("semantic_catalog_not_ready");
  });

  it("keeps one-signal duplicate evidence in review-required outcomes", async () => {
    const fingerprintOnly = serviceWith(
      repositoryStub({
        catalog: [
          {
            id: "template-existing",
            uniquenessFingerprint: computeTemplateFingerprint(candidate),
            semanticVersion: TEMPLATE_SEMANTIC_VERSION,
            semanticModel: "mock",
            semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
            semanticSignature: [0, 1]
          }
        ]
      }),
      { vector: [1, 0] }
    );
    const semanticOnly = serviceWith(
      repositoryStub({
        catalog: [
          {
            id: "template-existing",
            uniquenessFingerprint: "different",
            semanticVersion: TEMPLATE_SEMANTIC_VERSION,
            semanticModel: "mock",
            semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
            semanticSignature: [1, 0]
          }
        ]
      }),
      { vector: [1, 0] }
    );

    await expect(
      fingerprintOnly.publishSourceBookAsPublicTemplate({
        sourceBookId: "book-1",
        actor: { type: "system", id: null }
      })
    ).resolves.toMatchObject({
      decision: { reasonCode: "fingerprint_collision_only" }
    });
    await expect(
      semanticOnly.publishSourceBookAsPublicTemplate({
        sourceBookId: "book-1",
        actor: { type: "system", id: null }
      })
    ).resolves.toMatchObject({
      decision: { reasonCode: "semantic_similarity_only" }
    });
  });

  it("delegates public listing, lookup, and admin disable to the repository", async () => {
    const repository = repositoryStub();
    const service = serviceWith(repository);

    await expect(service.listPublicTemplates()).resolves.toEqual([]);
    await expect(service.getPublicTemplate("template-1")).resolves.toBeNull();
    await expect(
      service.disablePublicTemplate({
        templateId: "template-1",
        admin: {
          parentId: "admin-1",
          email: "admin@example.test",
          role: "admin"
        }
      })
    ).resolves.toBe(true);
  });
});

describe("PrismaTemplatePublicationRepository", () => {
  it("maps ready books, active catalog signatures, and public summaries", async () => {
    const prisma = prismaStub({ transactionCatalogCollision: true });
    const repository = new PrismaTemplatePublicationRepository(prisma);

    await expect(repository.loadReadySourceBook("book-1")).resolves.toMatchObject({
      id: "book-1",
      title: "Ready Book",
      pages: [{ pageNumber: 1 }]
    });
    await expect(repository.listActivePublicCatalog()).resolves.toEqual([
      {
        id: "template-1",
        uniquenessFingerprint: "fingerprint",
        semanticVersion: TEMPLATE_SEMANTIC_VERSION,
        semanticModel: "mock",
        semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
        semanticSignature: [1, 0]
      }
    ]);
    await expect(repository.listPublicTemplates()).resolves.toEqual([
      {
        id: "template-1",
        title: "Public Template",
        description: "Reusable public story",
        storyType: "educational",
        educationalSubtype: "science-discovery",
        ageMin: 5,
        ageMax: 6,
        customizableSlots: ["protagonist name"],
        learningObjectives: ["Practice observation"]
      }
    ]);
  });

  it("records accepted and rejected publication decisions", async () => {
    const prisma = prismaStub();
    const repository = new PrismaTemplatePublicationRepository(prisma);
    const decision = acceptedDecision();

    await expect(
      repository.acceptPublication({
        sourceBook,
        candidate,
        fingerprint: "fingerprint",
        signature: {
          version: TEMPLATE_SEMANTIC_VERSION,
          model: "mock",
          algorithm: TEMPLATE_SEMANTIC_ALGORITHM,
          vector: [1, 0]
        },
        decision,
        actor: { type: "system", id: null }
      })
    ).resolves.toMatchObject({ templateId: "template-created", decision });
    await expect(
      repository.recordDecision({
        sourceBookId: "book-1",
        templateId: null,
        actor: { type: "system", id: null },
        decision
      })
    ).resolves.toMatchObject({ sourceBookId: "book-1", templateId: null });
  });

  it("rechecks the catalog under an advisory transaction lock before creating", async () => {
    const prisma = prismaStub({ transactionCatalogCollision: true });
    const repository = new PrismaTemplatePublicationRepository(prisma);

    const result = await repository.acceptPublication({
      sourceBook,
      candidate,
      fingerprint: "fingerprint",
      signature: {
        version: TEMPLATE_SEMANTIC_VERSION,
        model: "mock",
        algorithm: TEMPLATE_SEMANTIC_ALGORITHM,
        vector: [1, 0]
      },
      decision: acceptedDecision(),
      actor: { type: "system", id: null }
    });

    expect(result.templateId).toBeNull();
    expect(result.decision.outcome).toBe("REJECTED_DUPLICATE");
  });

  it("reuses an existing source pipeline decision when recording under lock", async () => {
    const prisma = prismaStub({
      existingAudit: { templateId: "template-existing", ...acceptedDecision() }
    });
    const repository = new PrismaTemplatePublicationRepository(prisma);

    await expect(
      repository.recordDecision({
        sourceBookId: "book-1",
        templateId: null,
        actor: { type: "system", id: null },
        decision: acceptedDecision()
      })
    ).resolves.toMatchObject({
      templateId: "template-existing",
      decision: { outcome: "ACCEPTED" }
    });
  });

  it("marks moderation-unavailable audit records as not moderation-passed", async () => {
    const capturedData: Record<string, unknown>[] = [];
    const prisma = prismaStub({ capturedAuditData: capturedData });
    const repository = new PrismaTemplatePublicationRepository(prisma);

    await repository.recordDecision({
      sourceBookId: "book-1",
      templateId: null,
      actor: { type: "system", id: null },
      decision: {
        ...acceptedDecision(),
        outcome: "REJECTED_MODERATION",
        reasonCode: "moderation_unavailable"
      }
    });

    expect(capturedData).toContainEqual(
      expect.objectContaining({ moderationPassed: false })
    );
  });
});

function serviceWith(
  repository: TemplatePublicationRepository,
  signature: Partial<TemplateSemanticSignature> = {},
  moderationFlagged = false
): TemplatesService {
  return new TemplatesService(
    repository,
    { deriveCandidate: vi.fn(() => Promise.resolve(candidate)) },
    {
      createSignature: vi.fn(() =>
        Promise.resolve({
          version: TEMPLATE_SEMANTIC_VERSION,
          model: "mock",
          algorithm: TEMPLATE_SEMANTIC_ALGORITHM,
          vector: [1, 0],
          ...signature
        })
      )
    },
    { moderateText: vi.fn(() => Promise.resolve({ flagged: moderationFlagged })) }
  );
}

function repositoryStub(options: {
  readonly existing?: Awaited<ReturnType<TemplatePublicationRepository["findDecision"]>>;
  readonly catalog?: Awaited<ReturnType<TemplatePublicationRepository["listActivePublicCatalog"]>>;
  readonly source?: SourceBookForPublication | null;
} = {}): TemplatePublicationRepository {
  return {
    loadReadySourceBook: vi.fn(() =>
      Promise.resolve(options.source === undefined ? sourceBook : options.source)
    ),
    findDecision: vi.fn(() => Promise.resolve(options.existing ?? null)),
    listActivePublicCatalog: vi.fn(() =>
      Promise.resolve(options.catalog ?? [])
    ),
    acceptPublication: vi.fn(
      (input: Parameters<TemplatePublicationRepository["acceptPublication"]>[0]) =>
      Promise.resolve({
        sourceBookId: sourceBook.id,
        templateId: "template-1",
        decision: input.decision
      })
    ),
    recordDecision: vi.fn(
      (input: Parameters<TemplatePublicationRepository["recordDecision"]>[0]) =>
      Promise.resolve({
        sourceBookId: input.sourceBookId ?? sourceBook.id,
        templateId: input.templateId,
        decision: input.decision
      })
    ),
    listPublicTemplates: vi.fn(() => Promise.resolve([])),
    getPublicTemplate: vi.fn(() => Promise.resolve(null)),
    disableTemplate: vi.fn(() => Promise.resolve(true))
  };
}

function mockCallCount(
  repository: TemplatePublicationRepository,
  key: keyof TemplatePublicationRepository
): number {
  return vi.mocked(repository[key]).mock.calls.length;
}

function acceptedDecision() {
  return {
    outcome: "ACCEPTED" as const,
    reasonCode: "accepted_unique" as const,
    pipelineVersion: "template-publication-v1" as const,
    fingerprintVersion: "fingerprint-v1" as const,
    semanticVersion: "semantic-v1" as const,
    moderationVersion: "moderation-v1" as const,
    threshold: 0.9 as const,
    fingerprintCollision: false,
    semanticCatalogReady: true,
    semanticMaxScore: null,
    matchedTemplateIds: []
  };
}

function prismaStub(options: {
  readonly transactionCatalogCollision?: boolean;
  readonly existingAudit?: ReturnType<typeof acceptedDecision> & {
    readonly templateId: string | null;
  };
  readonly capturedAuditData?: Record<string, unknown>[];
} = {}) {
  const templateRecord = {
    id: "template-1",
    title: "Public Template",
    description: "Reusable public story",
    storyType: "educational",
    educationalSubtype: "science-discovery",
    ageMin: 5,
    ageMax: 6,
    uniquenessFingerprint: "fingerprint",
    semanticVersion: TEMPLATE_SEMANTIC_VERSION,
    semanticModel: "mock",
    semanticAlgorithm: TEMPLATE_SEMANTIC_ALGORITHM,
    semanticSignature: [1, 0],
    generalizedConfig: {
      customizableSlots: ["protagonist name"],
      learningObjectives: ["Practice observation"]
    }
  };
  const auditRecord = {
    templateId: null,
    ...acceptedDecision()
  };
  const client = {
    book: {
      findFirst: vi.fn(() =>
        Promise.resolve({
          id: "book-1",
          userId: "parent-1",
          title: "Ready Book",
          config: sourceBook.config,
          pages: sourceBook.pages
        })
      )
    },
    template: {
      create: vi.fn(() =>
        Promise.resolve({ ...templateRecord, id: "template-created" })
      ),
      findMany: vi.fn((input: unknown) =>
        Promise.resolve(
          isCatalogQuery(input) && !options.transactionCatalogCollision
            ? []
            : [templateRecord]
        )
      ),
      findFirst: vi.fn(() => Promise.resolve(templateRecord)),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 }))
    },
    templatePublicationAudit: {
      findFirst: vi.fn(() => Promise.resolve(options.existingAudit ?? null)),
      create: vi.fn((input: unknown) =>
        {
          const data = recordData(input);
          options.capturedAuditData?.push(data);
          return Promise.resolve({
            ...auditRecord,
            ...data
          });
        }
      )
    },
    $executeRawUnsafe: vi.fn(() => Promise.resolve(1)),
    $transaction: vi.fn(
      (callback: (transactionClient: typeof client) => Promise<unknown>) =>
        callback(client)
    )
  };

  return client as never;
}

function isCatalogQuery(input: unknown): boolean {
  return (
    typeof input === "object" &&
    input !== null &&
    "select" in input &&
    !("orderBy" in input)
  );
}

function recordData(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && "data" in input
    ? (input.data as Record<string, unknown>)
    : {};
}
