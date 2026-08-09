export type JobKind = "book-generation" | "asset-rendering";
export type JobStatus = "queued" | "generating" | "completed" | "failed";

export interface GenerationJobStatus {
  id: string;
  kind: JobKind;
  status: JobStatus;
  attemptsMade: number;
  maxAttempts: 3;
}

export interface JobsModuleStatus {
  resource: "jobs";
  queue: "not-configured";
  plannedQueueProvider: "bullmq";
  supportedKinds: readonly JobKind[];
}
