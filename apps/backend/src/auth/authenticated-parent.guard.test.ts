import type {
  ContextType,
  ExecutionContext,
  Type
} from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AuthenticatedRequest } from "./authenticated-parent";
import { AuthenticatedParentGuard } from "./authenticated-parent.guard";

class StubExecutionContext implements ExecutionContext {
  public constructor(private readonly request: AuthenticatedRequest) {}

  public getClass<T = Type<unknown>>(): T {
    return class {} as T;
  }

  public getHandler(): () => void {
    return () => undefined;
  }

  public getArgs<T extends unknown[] = unknown[]>(): T {
    return [this.request] as T;
  }

  public getArgByIndex<T = unknown>(index: number): T {
    return this.getArgs()[index] as T;
  }

  public getType<TContext extends string = ContextType>(): TContext {
    return "http" as TContext;
  }

  public switchToHttp(): ReturnType<ExecutionContext["switchToHttp"]> {
    return {
      getRequest: <T = AuthenticatedRequest>() => this.request as T,
      getResponse: <T = unknown>() => undefined as T,
      getNext: <T = unknown>() => undefined as T
    };
  }

  public switchToRpc(): never {
    throw new Error("RPC context is not used in these tests.");
  }

  public switchToWs(): never {
    throw new Error("WebSocket context is not used in these tests.");
  }
}

describe("AuthenticatedParentGuard", () => {
  it("fails closed when no authenticated parent context exists", () => {
    expect(() =>
      new AuthenticatedParentGuard().canActivate(new StubExecutionContext({}))
    ).toThrow(UnauthorizedException);
  });

  it("allows requests with an authenticated parent context", () => {
    expect(
      new AuthenticatedParentGuard().canActivate(
        new StubExecutionContext({
          parent: {
            parentId: "parent-123",
            email: "parent@example.local",
            role: "guardian"
          }
        })
      )
    ).toBe(true);
  });
});
