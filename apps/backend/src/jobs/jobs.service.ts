import { Injectable } from "@nestjs/common";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import { createDeferredImplementationError } from "../common/not-implemented";
import type {
  GenerationJobStatus,
  JobsModuleStatus
} from "./jobs.interfaces";

@Injectable()
export class JobsService {
  public getStatus(): JobsModuleStatus {
    return {
      resource: "jobs",
      queue: "not-configured",
      plannedQueueProvider: "bullmq",
      supportedKinds: ["book-generation", "asset-rendering"]
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
