import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { JobsController } from "./jobs.controller";
import { JobsModule } from "./jobs.module";
import { JobsService } from "./jobs.service";

describe("JobsService", () => {
  const parent = {
    parentId: "parent-123",
    email: "parent@example.local",
    role: "guardian" as const
  };

  it("reports the planned jobs module contract", () => {
    const service = new JobsService();

    expect(service.getStatus()).toEqual({
      resource: "jobs",
      queue: "not-configured",
      queueProvider: "bullmq",
      supportedKinds: ["book-generation", "picture-generation"],
      attempts: 3,
      terminalRetentionSeconds: 86400
    });
  });

  it("exposes the status through its controller", () => {
    const service = new JobsService();
    const controller = new JobsController(service);

    expect(controller.getStatus()).toEqual(service.getStatus());
    expect(() => controller.getJobStatus({ parent }, "job-123")).toThrow(
      ServiceUnavailableException
    );
    expect(JobsModule).toBeDefined();
  });

  it("returns explicit deferred errors instead of queued job data", () => {
    expect(() => new JobsService().getJobStatus(parent, "job-123")).toThrow(
      ServiceUnavailableException
    );
  });
});
