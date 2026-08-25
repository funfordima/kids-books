import { createHash } from "node:crypto";
import { z } from "zod";
import {
  TEMPLATE_FINGERPRINT_VERSION,
  type TemplatePublicationCandidate
} from "./templates.interfaces";

const candidateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(12).max(600),
  storyType: z.string().trim().min(2).max(80),
  educationalSubtype: z.string().trim().min(2).max(80).nullable(),
  ageMin: z.number().int().min(3).max(12),
  ageMax: z.number().int().min(3).max(12),
  settingCategory: z.string().trim().min(2).max(80),
  characterArchetypes: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  learningObjectives: z.array(z.string().trim().min(2).max(120)).min(1).max(8),
  plotBeatKeys: z.array(z.string().trim().min(2).max(80)).min(3).max(12),
  illustrationGuidance: z.string().trim().min(8).max(300),
  customizableSlots: z.array(z.string().trim().min(2).max(80)).min(1).max(10)
});

export function parseTemplatePublicationCandidate(
  input: unknown
): TemplatePublicationCandidate {
  const candidate = candidateSchema.parse(input);
  if (candidate.ageMin > candidate.ageMax) {
    throw new Error("Template candidate age range is invalid.");
  }

  return candidate;
}

export function computeTemplateFingerprint(
  candidate: TemplatePublicationCandidate
): string {
  const canonical = {
    version: TEMPLATE_FINGERPRINT_VERSION,
    storyType: normalizeScalar(candidate.storyType),
    educationalSubtype: candidate.educationalSubtype
      ? normalizeScalar(candidate.educationalSubtype)
      : null,
    ageMin: candidate.ageMin,
    ageMax: candidate.ageMax,
    settingCategory: normalizeScalar(candidate.settingCategory),
    characterArchetypes: normalizeSet(candidate.characterArchetypes),
    learningObjectives: normalizeSet(candidate.learningObjectives),
    plotBeatKeys: normalizeSet(candidate.plotBeatKeys),
    customizableSlots: normalizeSet(candidate.customizableSlots)
  };

  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

export function normalizeTemplateText(value: string): string {
  return normalizeScalar(value);
}

function normalizeSet(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(normalizeScalar))].sort();
}

function normalizeScalar(value: string): string {
  return value.normalize("NFKC").toLowerCase().trim().replace(/\s+/gu, " ");
}
