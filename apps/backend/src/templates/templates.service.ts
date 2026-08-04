import { Injectable } from "@nestjs/common";
import type {
  TemplatesModuleStatus,
  TemplateSummary
} from "./templates.interfaces";

@Injectable()
export class TemplatesService {
  private readonly templates: readonly TemplateSummary[] = [
    {
      id: "template-science-spark",
      title: "The Backyard Science Spark",
      audience: "picture-book",
      storyType: "educational",
      educationalSubtype: "science-discovery"
    }
  ];

  public getStatus(): TemplatesModuleStatus {
    return {
      resource: "templates",
      persistence: "not-configured",
      supportedAudiences: ["picture-book", "early-reader"],
      versioning: "planned"
    };
  }

  public listTemplates(): readonly TemplateSummary[] {
    return this.templates;
  }

  public getTemplate(templateId: string): TemplateSummary | undefined {
    return this.templates.find((template) => template.id === templateId);
  }
}
