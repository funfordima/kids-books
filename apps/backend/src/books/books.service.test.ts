import { describe, expect, it } from "vitest";
import { BooksController } from "./books.controller";
import { BooksModule } from "./books.module";
import { BooksService } from "./books.service";

describe("BooksService", () => {
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
    expect(controller.listBooks()).toEqual(service.listBooks());
    expect(controller.getBook("book-local-preview")).toEqual(
      service.getBook("book-local-preview")
    );
    expect(BooksModule).toBeDefined();
  });

  it("returns local list, detail, and creation contracts", () => {
    const service = new BooksService();
    const request = {
      childName: "Mila",
      ageGroup: "5-6" as const,
      storyType: "educational",
      pageCount: 8 as const
    };

    expect(service.listBooks()).toHaveLength(1);
    expect(service.getBook("book-local-preview")?.status).toBe("draft");
    expect(service.getBook("missing-book")).toBeUndefined();
    expect(service.createBook(request)).toEqual({
      id: "book-pending-foundation",
      status: "pending",
      title: "A story for Mila",
      config: request
    });
  });
});
