import { describe, expect, it } from "vitest";
import { JobsController } from "./jobs.controller";
import { JobsModule } from "./jobs.module";
import { JobsService } from "./jobs.service";

describe("JobsService", () => {
  it("reports the planned jobs module contract", () => {
    const service = new JobsService();

    expect(service.getStatus()).toEqual({
      resource: "jobs",
      queue: "not-configured",
      plannedQueueProvider: "bullmq",
      supportedKinds: ["book-generation", "asset-rendering"]
    });
  });

  it("exposes the status through its controller", () => {
    const service = new JobsService();
    const controller = new JobsController(service);

    expect(controller.getStatus()).toEqual(service.getStatus());
    expect(controller.getJobStatus("job-123")).toEqual(
      service.getJobStatus("job-123")
    );
    expect(JobsModule).toBeDefined();
  });

  it("returns a queued job status contract", () => {
    expect(new JobsService().getJobStatus("job-123")).toEqual({
      id: "job-123",
      kind: "book-generation",
      status: "queued",
      attemptsMade: 0,
      maxAttempts: 3
    });
  });
});
