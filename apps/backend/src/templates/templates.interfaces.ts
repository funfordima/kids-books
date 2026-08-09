export type TemplateAudience = "picture-book" | "early-reader";

export interface TemplateSummary {
  id: string;
  title: string;
  audience: TemplateAudience;
  storyType: "educational";
  educationalSubtype: "science-discovery";
}

export interface TemplatesModuleStatus {
  resource: "templates";
  persistence: "not-configured";
  supportedAudiences: readonly TemplateAudience[];
  versioning: "planned";
}
