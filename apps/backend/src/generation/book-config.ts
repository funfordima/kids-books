import { z } from "zod";

export const ageGroups = ["3-4", "5-6", "7-9"] as const;
export const pronouns = ["he/him", "she/her", "they/them"] as const;
export const pageCounts = [8, 12, 16] as const;

export const storyTypesByAgeGroup = {
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

export const educationalSubtypes = [
  "kindness-empathy",
  "numbers-counting",
  "letters-alphabet",
  "science-discovery",
  "healthy-habits",
  "community-helpers",
  "nature-care",
  "courage-resilience"
] as const;

export const settings = [
  "forest",
  "city",
  "space",
  "ocean",
  "magical-kingdom",
  "farm",
  "arctic",
  "hometown"
] as const;

export const illustrationStyles = [
  "watercolor",
  "cartoon",
  "storybook-flat",
  "crayon",
  "pastel"
] as const;

const boundedOptionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const bookGenerationConfigSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    bookId: z.string().trim().min(1).max(128),
    childName: z.string().trim().min(1).max(80),
    ageGroup: z.enum(ageGroups),
    pronouns: z.enum(pronouns),
    friendName: z.string().trim().max(80).optional(),
    petName: z.string().trim().max(80).optional(),
    petType: z.string().trim().max(80).optional(),
    siblingName: z.string().trim().max(80).optional(),
    storyDescription: boundedOptionalText,
    storyType: z.string().trim().min(1),
    educationalSubtype: z.enum(educationalSubtypes).optional(),
    setting: z.enum(settings),
    illustrationStyle: z.enum(illustrationStyles),
    pageCount: z.union([z.literal(8), z.literal(12), z.literal(16)]),
    correlationId: z.string().trim().min(1).max(128)
  })
  .strict()
  .superRefine((config, context) => {
    const supportedStories = storyTypesByAgeGroup[config.ageGroup];

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

export type BookGenerationConfig = z.infer<typeof bookGenerationConfigSchema>;

export const parseBookGenerationConfig = (
  value: unknown
): BookGenerationConfig => bookGenerationConfigSchema.parse(value);
