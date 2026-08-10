import { describe, expect, it } from "vitest";
import { DatabaseModule } from "./database.module";
import { requireDatabaseUrl } from "./prisma.service";

describe("Prisma database boundary", () => {
  it("keeps the database module available without importing it into AppModule yet", () => {
    expect(DatabaseModule).toBeDefined();
  });

  it("fails closed when Prisma is enabled without a database URL", () => {
    expect(() => requireDatabaseUrl("")).toThrow(
      "DATABASE_URL is required before enabling PrismaService"
    );
    expect(requireDatabaseUrl("postgresql://local.example/kids_books")).toBe(
      "postgresql://local.example/kids_books"
    );
  });
});
