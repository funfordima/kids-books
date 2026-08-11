export const GENERATION_QUEUE_VERSION = 1 as const;

export const BOOK_GENERATION_QUEUE = "generation.book" as const;
export const PICTURE_GENERATION_QUEUE = "generation.picture" as const;

export const QUEUE_ATTEMPTS = 3 as const;
export const QUEUE_BACKOFF_MS = 1000 as const;
export const QUEUE_RETENTION_SECONDS = 86_400 as const;

export const DEFAULT_BOOK_WORKER_CONCURRENCY = 1 as const;
export const DEFAULT_PICTURE_WORKER_CONCURRENCY = 3 as const;
