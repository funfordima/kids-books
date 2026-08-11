import { Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
import type {
  GenerationJobStatus,
  JobsModuleStatus
} from "./jobs.interfaces";
import { QUEUE_ATTEMPTS, QUEUE_RETENTION_SECONDS } from "./queue.constants";

@Injectable()
export class JobsService {
  public getStatus(): JobsModuleStatus {
    return {
      resource: "jobs",
      queue: process.env.REDIS_URL ? "configured" : "not-configured",
      queueProvider: "bullmq",
      supportedKinds: ["book-generation", "picture-generation"],
      attempts: QUEUE_ATTEMPTS,
      terminalRetentionSeconds: QUEUE_RETENTION_SECONDS
    };
  }

  public getJobStatus(
    _parent: AuthenticatedParentContext,
    _jobId: string
  ): GenerationJobStatus {
    void _parent;
    void _jobId;
    return createDeferredImplementationError("Job status lookup");
  }
}
