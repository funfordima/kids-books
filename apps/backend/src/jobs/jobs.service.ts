import { Injectable } from "@nestjs/common";
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

  public getJobStatus(jobId: string): GenerationJobStatus {
    return {
      id: jobId,
      kind: "book-generation",
      status: "queued",
      attemptsMade: 0,
      maxAttempts: 3
    };
  }
}
