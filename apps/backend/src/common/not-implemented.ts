import { ServiceUnavailableException } from "@nestjs/common";

export function createDeferredImplementationError(resource: string): never {
  throw new ServiceUnavailableException({
    code: "IMPLEMENTATION_DEFERRED",
    message: `${resource} behavior is deferred to a later SDLC step.`
  });
}
