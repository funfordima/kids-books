import { describe, expect, it } from "vitest";
import { TemplatesController } from "./templates.controller";
import { TemplatesModule } from "./templates.module";
import { TemplatesService } from "./templates.service";

describe("TemplatesService", () => {
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
    expect(controller.listTemplates()).toEqual(service.listTemplates());
    expect(controller.getTemplate("template-science-spark")).toEqual(
      service.getTemplate("template-science-spark")
    );
    expect(TemplatesModule).toBeDefined();
  });

  it("returns local list and detail contracts", () => {
    const service = new TemplatesService();

    expect(service.listTemplates()).toEqual([
      {
        id: "template-science-spark",
        title: "The Backyard Science Spark",
        audience: "picture-book",
        storyType: "educational",
        educationalSubtype: "science-discovery"
      }
    ]);
    expect(service.getTemplate("missing-template")).toBeUndefined();
  });
});
