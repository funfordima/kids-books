import {
  TEMPLATE_SEMANTIC_ALGORITHM,
  TEMPLATE_SEMANTIC_VERSION,
  type TemplateCatalogEntry,
  type TemplateSemanticSignature
} from "./templates.interfaces";

export interface TemplateSimilarityScan {
  readonly catalogReady: boolean;
  readonly maxScore: number | null;
  readonly matchedTemplateIds: readonly string[];
  readonly invalidReason:
    | null
    | "semantic_catalog_not_ready"
    | "semantic_vector_invalid";
}

export function scanTemplateSimilarity(input: {
  readonly candidate: TemplateSemanticSignature;
  readonly catalog: readonly TemplateCatalogEntry[];
  readonly threshold: number;
}): TemplateSimilarityScan {
  if (!isValidSignature(input.candidate)) {
    return invalidScan("semantic_vector_invalid");
  }

  let maxScore: number | null = null;
  const matchedTemplateIds: string[] = [];

  for (const entry of input.catalog) {
    if (
      entry.semanticVersion !== TEMPLATE_SEMANTIC_VERSION ||
      entry.semanticAlgorithm !== TEMPLATE_SEMANTIC_ALGORITHM ||
      !entry.semanticSignature ||
      entry.semanticSignature.length !== input.candidate.vector.length ||
      entry.semanticSignature.some((value) => !Number.isFinite(value))
    ) {
      return invalidScan("semantic_catalog_not_ready");
    }

    const score = cosine(input.candidate.vector, entry.semanticSignature);
    if (!Number.isFinite(score)) {
      return invalidScan("semantic_vector_invalid");
    }

    maxScore = maxScore === null ? score : Math.max(maxScore, score);
    if (score >= input.threshold) {
      matchedTemplateIds.push(entry.id);
    }
  }

  return {
    catalogReady: true,
    maxScore,
    matchedTemplateIds,
    invalidReason: null
  };
}

function invalidScan(
  invalidReason: NonNullable<TemplateSimilarityScan["invalidReason"]>
): TemplateSimilarityScan {
  return {
    catalogReady: false,
    maxScore: null,
    matchedTemplateIds: [],
    invalidReason
  };
}

function isValidSignature(signature: TemplateSemanticSignature): boolean {
  return (
    signature.version === TEMPLATE_SEMANTIC_VERSION &&
    signature.algorithm === TEMPLATE_SEMANTIC_ALGORITHM &&
    signature.vector.length > 0 &&
    signature.vector.every((value) => Number.isFinite(value))
  );
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return Number.NaN;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
