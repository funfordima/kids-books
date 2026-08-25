import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  parseBookGenerationConfig
} from "../generation/book-config";
import {
  TEMPLATE_SEMANTIC_ALGORITHM,
  TEMPLATE_SEMANTIC_VERSION,
  type SourceBookForPublication,
  type TemplateGeneralizationPort,
  type TemplatePublicationCandidate,
  type TemplateSemanticSignature,
  type TemplateSimilarityPort
} from "./templates.interfaces";

@Injectable()
export class DeterministicTemplateGeneralizer
  implements TemplateGeneralizationPort
{
  public deriveCandidate(
    sourceBook: SourceBookForPublication
  ): Promise<TemplatePublicationCandidate> {
    if (!sourceBook.config || typeof sourceBook.config !== "object") {
      throw new Error("Source book generation config is unavailable.");
    }

    const config = parseBookGenerationConfig({
      ...sourceBook.config,
      userId: sourceBook.userId,
      bookId: sourceBook.id,
      correlationId: "template-publication"
    });
    const settingCategory = config.setting || "imaginative setting";
    const storyType = config.storyType;
    const educationalSubtype = config.educationalSubtype ?? null;

    return Promise.resolve({
      title: `A ${this.titleCase(storyType)} Template`,
      description: [
        "A generalized story framework for a child protagonist, supportive companions,",
        `and a ${settingCategory} adventure with reusable choices.`
      ].join(" "),
      storyType,
      educationalSubtype,
      ageMin: Number(config.ageGroup.split("-")[0]),
      ageMax: Number(config.ageGroup.split("-")[1]),
      settingCategory,
      characterArchetypes: [
        "child protagonist",
        "supportive companion",
        "helpful guide"
      ],
      learningObjectives: educationalSubtype
        ? [`Explore ${educationalSubtype.replace(/-/gu, " ")}`]
        : ["Practice problem solving"],
      plotBeatKeys: [
        "meet challenge",
        "try a kind solution",
        "learn together",
        "celebrate growth"
      ],
      illustrationGuidance:
        "Use warm, child-safe scenes with no readable text in illustrations.",
      customizableSlots: [
        "protagonist name",
        "companion archetype",
        "setting detail",
        "lesson focus"
      ]
    });
  }

  private titleCase(value: string): string {
    return value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}

@Injectable()
export class DeterministicTemplateSimilarityPort
  implements TemplateSimilarityPort
{
  public createSignature(
    candidate: TemplatePublicationCandidate
  ): Promise<TemplateSemanticSignature> {
    const source = [
      candidate.storyType,
      candidate.educationalSubtype,
      candidate.settingCategory,
      ...candidate.characterArchetypes,
      ...candidate.learningObjectives,
      ...candidate.plotBeatKeys,
      ...candidate.customizableSlots
    ]
      .filter((value): value is string => typeof value === "string")
      .join("\n")
      .normalize("NFKC")
      .toLowerCase();
    const digest = createHash("sha256").update(source).digest();
    const vector = Array.from(digest.subarray(0, 8), (byte) => byte / 255);

    return Promise.resolve({
      version: TEMPLATE_SEMANTIC_VERSION,
      model: "deterministic-template-signature-v1",
      algorithm: TEMPLATE_SEMANTIC_ALGORITHM,
      vector
    });
  }
}
