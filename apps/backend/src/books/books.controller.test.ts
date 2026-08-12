/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { BillingService } from "../billing/billing.service";
import { BooksController } from "./books.controller";
import type { BooksService } from "./books.service";

const parent = {
  parentId: "11111111-1111-1111-1111-111111111111",
  email: "parent@example.com",
  role: "guardian" as const
};

describe("BooksController billing entitlement", () => {
  it("checks entitlement before creating a book", async () => {
    const booksService = {
      createBook: vi.fn().mockReturnValue({
        id: "book-1",
        title: "A Story",
        status: "draft"
      })
    } as unknown as BooksService;
    const billingService = {
      assertCanGenerate: vi.fn().mockResolvedValue(undefined)
    } as unknown as BillingService;
    const controller = new BooksController(booksService, billingService);

    await controller.createBook({ parent }, {
      childName: "Mia",
      storyType: "adventure",
      ageGroup: "5-6",
      pageCount: 8
    });

    expect(billingService.assertCanGenerate).toHaveBeenCalledWith(parent);
    expect(booksService.createBook).toHaveBeenCalledOnce();
  });

  it("does not create a book when entitlement fails closed", async () => {
    const booksService = {
      createBook: vi.fn()
    } as unknown as BooksService;
    const billingService = {
      assertCanGenerate: vi
        .fn()
        .mockRejectedValue(new ForbiddenException("Active subscription required."))
    } as unknown as BillingService;
    const controller = new BooksController(booksService, billingService);

    await expect(controller.createBook({ parent }, {})).rejects.toThrow(
      ForbiddenException
    );
    expect(booksService.createBook).not.toHaveBeenCalled();
  });
});
