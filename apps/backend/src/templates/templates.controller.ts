import { Controller, Get, Inject, Param } from "@nestjs/common";
import type {
  TemplatesModuleStatus,
  TemplateSummary
} from "./templates.interfaces";
import { TemplatesService } from "./templates.service";

@Controller("templates")
export class TemplatesController {
  public constructor(
    @Inject(TemplatesService)
    private readonly templatesService: TemplatesService
  ) {}

  @Get("status")
  public getStatus(): TemplatesModuleStatus {
    return this.templatesService.getStatus();
  }

  @Get()
  public listTemplates(): readonly TemplateSummary[] {
    return this.templatesService.listTemplates();
  }

  @Get(":templateId")
  public getTemplate(
    @Param("templateId") templateId: string
  ): TemplateSummary | undefined {
    return this.templatesService.getTemplate(templateId);
  }
}
