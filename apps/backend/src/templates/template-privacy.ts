import { normalizeTemplateText } from "./template-fingerprint";
import type {
  SourceBookForPublication,
  TemplatePublicationCandidate
} from "./templates.interfaces";

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const phonePattern =
  /(?:\+?\d[\s().-]*)?(?:\d[\s().-]*){9,}\d/u;
const addressPattern =
  /\b\d{1,6}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,5}\s+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|boulevard|blvd|court|ct|way)\b/iu;
const schoolPattern = /\b[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+school\b/iu;
const accountPattern = /\b(?:account|user|customer|stripe|google)[-_ ]?id\b/iu;

export interface TemplatePrivacyCheck {
  readonly passed: boolean;
  readonly matchedCount: number;
}

export function checkTemplatePrivacy(
  sourceBook: SourceBookForPublication,
  candidate: TemplatePublicationCandidate
): TemplatePrivacyCheck {
  const haystack = candidateText(candidate);
  const knownValues = collectKnownPersonalization(sourceBook);
  const directPatternMatches = [
    emailPattern,
    phonePattern,
    addressPattern,
    schoolPattern,
    accountPattern
  ].filter((pattern) => pattern.test(haystack)).length;
  const knownMatches = knownValues.filter((value) => haystack.includes(value));
  const matchedCount = directPatternMatches + knownMatches.length;

  return {
    passed: matchedCount === 0,
    matchedCount
  };
}

export function candidateText(candidate: TemplatePublicationCandidate): string {
  return [
    candidate.title,
    candidate.description,
    candidate.storyType,
    candidate.educationalSubtype,
    candidate.settingCategory,
    candidate.illustrationGuidance,
    ...candidate.characterArchetypes,
    ...candidate.learningObjectives,
    ...candidate.plotBeatKeys,
    ...candidate.customizableSlots
  ]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeTemplateText)
    .join("\n");
}

function collectKnownPersonalization(
  sourceBook: SourceBookForPublication
): readonly string[] {
  const values = new Set<string>();
  collectPersonalizationStrings(sourceBook.config, values);
  collectStrings(sourceBook.storyText, values);
  for (const page of sourceBook.pages) {
    collectStrings(page.textContent, values);
    collectStrings(page.illustrationDescription, values);
  }

  return [...values]
    .map(normalizeTemplateText)
    .filter((value) => value.length >= 3 && !isGenericValue(value));
}

function collectStrings(value: unknown, output: Set<string>): void {
  if (typeof value === "string") {
    output.add(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, output));
  }
}

function isGenericValue(value: string): boolean {
  return (
    value.length < 3 ||
    /^\d+$/u.test(value) ||
    [
      "true",
      "false",
      "educational",
      "adventure",
      "science",
      "fantasy",
      "picture-book",
      "early-reader"
    ].includes(value)
  );
}

function collectPersonalizationStrings(value: unknown, output: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }

  const candidate = value as Record<string, unknown>;
  [
    "childName",
    "friendName",
    "petName",
    "siblingName",
    "displayName",
    "email",
    "phone",
    "address",
    "school",
    "hometown",
    "accountId",
    "customerId",
    "googleSubject"
  ].forEach((key) => collectStrings(candidate[key], output));
  collectStrings(candidate["storyDescription"], output);
}
