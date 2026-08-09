import { Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
import type {
  TemplatesModuleStatus,
  TemplateSummary
} from "./templates.interfaces";

@Injectable()
export class TemplatesService {
  public getStatus(): TemplatesModuleStatus {
    return {
      resource: "templates",
      persistence: "not-configured",
      supportedAudiences: ["picture-book", "early-reader"],
      versioning: "planned"
    };
  }

  public listTemplates(
    _parent: AuthenticatedParentContext
  ): readonly TemplateSummary[] {
    void _parent;
    return createDeferredImplementationError("Template listing");
  }

  public getTemplate(
    _parent: AuthenticatedParentContext,
    _templateId: string
  ): TemplateSummary {
    void _parent;
    void _templateId;
    return createDeferredImplementationError("Template lookup");
  }
}
