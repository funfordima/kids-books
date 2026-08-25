import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Req,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import { validateNonEmptyIdentifier } from "../common/validation";
import type {
  PublicTemplateSummary,
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

  @Get("public")
  public listPublicTemplates(): Promise<readonly PublicTemplateSummary[]> {
    return this.templatesService.listPublicTemplates();
  }

  @Get("public/:templateId")
  public getPublicTemplate(
    @Param("templateId") templateId: string
  ): Promise<PublicTemplateSummary | null> {
    return this.templatesService.getPublicTemplate(
      validateNonEmptyIdentifier(templateId, "templateId")
    );
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get()
  public listTemplates(
    @Req() request: AuthenticatedRequest
  ): readonly TemplateSummary[] {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.templatesService.listTemplates(request.parent);
  }

  @UseGuards(AuthenticatedParentGuard)
  @Get(":templateId")
  public getTemplate(
    @Req() request: AuthenticatedRequest,
    @Param("templateId") templateId: string
  ): TemplateSummary {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.templatesService.getTemplate(
      request.parent,
      validateNonEmptyIdentifier(templateId, "templateId")
    );
  }

  @UseGuards(AuthenticatedParentGuard)
  @Delete(":templateId/publication")
  public disablePublicTemplate(
    @Req() request: AuthenticatedRequest,
    @Param("templateId") templateId: string
  ): Promise<boolean> {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.templatesService.disablePublicTemplate({
      admin: request.parent,
      templateId: validateNonEmptyIdentifier(templateId, "templateId")
    });
  }
}
