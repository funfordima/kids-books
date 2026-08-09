import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { BooksController } from "./books.controller";
import { BooksModule } from "./books.module";
import { BooksService } from "./books.service";

describe("BooksService", () => {
  const parent = {
    parentId: "parent-123",
    email: "parent@example.local",
    role: "guardian" as const
  };

  it("reports the planned book module contract", () => {
    const service = new BooksService();

    expect(service.getStatus()).toEqual({
      resource: "books",
      persistence: "not-configured",
      lifecycle: ["draft", "generating", "ready", "archived"],
      ownership: "guardian"
    });
  });

  it("exposes the status through its controller", () => {
    const service = new BooksService();
    const controller = new BooksController(service);

    expect(controller.getStatus()).toEqual(service.getStatus());
    expect(() => controller.listBooks({ parent })).toThrow(
      ServiceUnavailableException
    );
    expect(() => controller.getBook({ parent }, "book-local-preview")).toThrow(
      ServiceUnavailableException
    );
    expect(BooksModule).toBeDefined();
  });

  it("validates book creation input before deferring persistence behavior", () => {
    const service = new BooksService();
    const request = {
      childName: "Mila",
      ageGroup: "5-6" as const,
      storyType: "educational",
      pageCount: 8 as const
    };

    const validatedRequest = service.validateCreateBookRequest(request);

    expect(validatedRequest).toEqual(request);
    expect(() => service.createBook(parent, request)).toThrow(
      ServiceUnavailableException
    );
    expect(() =>
      service.createBook(parent, { ...request, pageCount: 10 })
    ).toThrow(BadRequestException);
  });
});
