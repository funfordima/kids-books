/** Version of the initial shared workspace contract. */
export const SHARED_PACKAGE_VERSION = "0.1.0" as const;

import { z } from "zod";

export const wizardAgeGroups = ["3-4", "5-6", "7-9"] as const;
export const wizardPronouns = ["he/him", "she/her", "they/them"] as const;
export const wizardPageCounts = [8, 12, 16] as const;

export const wizardStoryTypesByAgeGroup = {
  "3-4": [
    "educational",
    "big-feelings",
    "bedtime",
    "animals",
    "family",
    "humor",
    "identity",
    "nature"
  ],
  "5-6": [
    "educational",
    "big-feelings",
    "bedtime",
    "animals",
    "adventure",
    "family",
    "fantasy",
    "humor",
    "identity",
    "school",
    "nature"
  ],
  "7-9": [
    "educational",
    "animals",
    "adventure",
    "fantasy",
    "humor",
    "identity",
    "school",
    "nature",
    "mystery"
  ]
} as const;

export const wizardEducationalSubtypes = [
  "kindness-empathy",
  "numbers-counting",
  "letters-alphabet",
  "science-discovery",
  "healthy-habits",
  "community-helpers",
  "nature-care",
  "courage-resilience"
] as const;

export const wizardSettings = [
  "forest",
  "city",
  "space",
  "ocean",
  "magical-kingdom",
  "farm",
  "arctic",
  "hometown"
] as const;

export const wizardIllustrationStyles = [
  "watercolor",
  "cartoon",
  "storybook-flat",
  "crayon",
  "pastel"
] as const;

const boundedOptionalWizardText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const bookWizardSchema = z
  .object({
    childName: z.string().trim().min(1).max(80),
    ageGroup: z.enum(wizardAgeGroups),
    pronouns: z.enum(wizardPronouns),
    friendName: z.string().trim().max(80).optional(),
    petName: z.string().trim().max(80).optional(),
    petType: z.string().trim().max(80).optional(),
    siblingName: z.string().trim().max(80).optional(),
    storyDescription: boundedOptionalWizardText,
    storyType: z.string().trim().min(1),
    educationalSubtype: z.enum(wizardEducationalSubtypes).optional(),
    setting: z.enum(wizardSettings),
    illustrationStyle: z.enum(wizardIllustrationStyles),
    pageCount: z.union([z.literal(8), z.literal(12), z.literal(16)])
  })
  .strict()
  .superRefine((config, context) => {
    const supportedStories = wizardStoryTypesByAgeGroup[config.ageGroup];

    if (!supportedStories.includes(config.storyType as never)) {
      context.addIssue({
        code: "custom",
        path: ["storyType"],
        message: "Story type is not supported for the selected age group."
      });
    }

    if (config.storyType === "educational" && !config.educationalSubtype) {
      context.addIssue({
        code: "custom",
        path: ["educationalSubtype"],
        message: "Educational subtype is required for educational stories."
      });
    }
  });

export type BookWizardInput = z.input<typeof bookWizardSchema>;
export type BookWizardConfig = z.infer<typeof bookWizardSchema>;

export const safeReturnPathSchema = z
  .string()
  .trim()
  .max(200)
  .default("/")
  .transform((value) => {
    if (!value.startsWith("/") || value.startsWith("//")) {
      return "/";
    }

    return value;
  });
