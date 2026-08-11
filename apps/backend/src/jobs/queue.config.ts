import type { JobsOptions, QueueOptions, WorkerOptions } from "bullmq";
import { z } from "zod";
import {
  QUEUE_ATTEMPTS,
  QUEUE_BACKOFF_MS,
  QUEUE_RETENTION_SECONDS
} from "./queue.constants";
import { QueuePipelineError } from "./queue.errors";

const redisConfigSchema = z
  .object({
    REDIS_URL: z.string().url().refine((url) => url.startsWith("redis://"), {
      message: "REDIS_URL must use the redis:// protocol."
    })
  })
  .passthrough();

export interface RedisQueueConfig {
  url: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}

export const loadRedisQueueConfig = (
  env: NodeJS.ProcessEnv = process.env
): RedisQueueConfig => {
  const result = redisConfigSchema.safeParse(env);

  if (!result.success) {
    throw new QueuePipelineError(
      "QUEUE_CONFIG_INVALID",
      "Redis queue configuration is invalid.",
      false
    );
  }

  const parsedUrl = new URL(result.data.REDIS_URL);
  const dbPath = parsedUrl.pathname.replace("/", "");

  return {
    url: result.data.REDIS_URL,
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
    db: dbPath ? Number(dbPath) : undefined
  };
};

export const createBullMqConnection = (config: RedisQueueConfig) => ({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  db: config.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

export const createQueueOptions = (
  config: RedisQueueConfig
): QueueOptions => ({
  connection: createBullMqConnection(config)
});

export const createWorkerOptions = (
  config: RedisQueueConfig,
  concurrency: number
): WorkerOptions => ({
  connection: createBullMqConnection(config),
  concurrency
});

export const createGenerationJobOptions = (jobId: string): JobsOptions => ({
  jobId,
  attempts: QUEUE_ATTEMPTS,
  backoff: {
    type: "exponential",
    delay: QUEUE_BACKOFF_MS
  },
  removeOnComplete: {
    age: QUEUE_RETENTION_SECONDS
  },
  removeOnFail: {
    age: QUEUE_RETENTION_SECONDS
  }
});
