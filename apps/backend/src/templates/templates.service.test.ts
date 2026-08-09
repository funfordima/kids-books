import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { TemplatesController } from "./templates.controller";
import { TemplatesModule } from "./templates.module";
import { TemplatesService } from "./templates.service";

describe("TemplatesService", () => {
  const parent = {
    parentId: "parent-123",
    email: "parent@example.local",
    role: "guardian" as const
  };

  it("reports the planned template module contract", () => {
    const service = new TemplatesService();

    expect(service.getStatus()).toEqual({
      resource: "templates",
      persistence: "not-configured",
      supportedAudiences: ["picture-book", "early-reader"],
      versioning: "planned"
    });
  });

  it("exposes the status through its controller", () => {
    const service = new TemplatesService();
    const controller = new TemplatesController(service);

    expect(controller.getStatus()).toEqual(service.getStatus());
    expect(() => controller.listTemplates({ parent })).toThrow(
      ServiceUnavailableException
    );
    expect(() =>
      controller.getTemplate({ parent }, "template-science-spark")
    ).toThrow(ServiceUnavailableException);
    expect(TemplatesModule).toBeDefined();
  });

  it("returns explicit deferred errors instead of template data", () => {
    const service = new TemplatesService();

    expect(() => service.listTemplates(parent)).toThrow(
      ServiceUnavailableException
    );
    expect(() => service.getTemplate(parent, "missing-template")).toThrow(
      ServiceUnavailableException
    );
  });
});
