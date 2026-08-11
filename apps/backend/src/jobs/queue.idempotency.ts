import type {
  BookGenerationPayload,
  PictureGenerationPayload
} from "./queue.payloads";

const normalizeIdSegment = (value: string): string =>
  value.replace(/[^A-Za-z0-9_-]/gu, "-");

export const createBookGenerationJobId = (
  payload: Pick<BookGenerationPayload, "bookId" | "operationVersion" | "version">
): string =>
  [
    "book",
    payload.version.toString(),
    normalizeIdSegment(payload.operationVersion),
    normalizeIdSegment(payload.bookId)
  ].join("-");

export const createPictureGenerationJobId = (
  payload: Pick<
    PictureGenerationPayload,
    "pictureId" | "operationVersion" | "version"
  >
): string =>
  [
    "picture",
    payload.version.toString(),
    normalizeIdSegment(payload.operationVersion),
    normalizeIdSegment(payload.pictureId)
  ].join("-");
