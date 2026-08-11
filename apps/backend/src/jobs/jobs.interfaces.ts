export type JobKind = "book-generation" | "picture-generation";
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
  queue: "configured" | "not-configured";
  queueProvider: "bullmq";
  supportedKinds: readonly JobKind[];
  attempts: 3;
  terminalRetentionSeconds: 86400;
}
