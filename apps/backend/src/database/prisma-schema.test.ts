import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(__dirname, "../../prisma/schema.prisma"),
  "utf8"
);
const migration = readFileSync(
  join(
    __dirname,
    "../../prisma/migrations/20260809121500_core_entities/migration.sql"
  ),
  "utf8"
);
const ratingsMigrationTable = migration.match(
  /CREATE TABLE "ratings" \([\s\S]*?\n\);/
)?.[0];
const stripeMigration = readFileSync(
  join(
    __dirname,
    "../../prisma/migrations/20260812173000_stripe_billing/migration.sql"
  ),
  "utf8"
);
const pdfExportMigration = readFileSync(
  join(
    __dirname,
    "../../prisma/migrations/20260824120000_pdf_exports/migration.sql"
  ),
  "utf8"
);

describe("Step 4 Prisma schema", () => {
  it("models all core SDLC entities", () => {
    for (const model of [
      "User",
      "Subscription",
      "Template",
      "Book",
      "Character",
      "Picture",
      "Job",
      "Rating",
      "ReferralProgram",
      "PdfExport"
    ]) {
      expect(schema).toContain(`model ${model} {`);
    }
  });

  it("captures privacy, queue, and public-template publication contracts", () => {
    expect(schema).toContain("model BookPage {");
    expect(schema).toContain("shareTokenHash");
    expect(schema).toContain("uniquenessFingerprint");
    expect(schema).toContain("publicationDecision");
    expect(schema).toContain("moderationResult");
    expect(schema).toContain("enum JobType");
    expect(schema).toContain("PICTURE_GENERATION");
  });

  it("enforces the accepted thumbs-up/down per-book rating contract", () => {
    expect(schema).toContain("enum RatingValue");
    expect(schema).toContain("THUMBS_UP");
    expect(schema).toContain("THUMBS_DOWN");
    expect(schema).toContain("@@unique([userId, bookId])");
    expect(schema).not.toContain("score      Int");
    expect(schema).not.toContain("comment    String?");
    expect(schema).not.toContain("templateId String?  @map(\"template_id\")");

    expect(migration).toContain(
      "CREATE TYPE \"rating_value\" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN');"
    );
    expect(migration).toContain(
      "CREATE UNIQUE INDEX \"ratings_user_id_book_id_key\" ON \"ratings\"(\"user_id\", \"book_id\");"
    );
    expect(migration).not.toContain("\"score\" INTEGER");
    expect(ratingsMigrationTable).toBeDefined();
    expect(ratingsMigrationTable).not.toContain("\"template_id\" UUID");
  });

  it("requires ownership links that prevent orphan domain records", () => {
    expect(schema).toContain("bookId      String        @map(\"book_id\") @db.Uuid");
    expect(schema).toContain("pageId          String        @unique @map(\"page_id\") @db.Uuid");
    expect(schema).toContain("bookId    String      @map(\"book_id\") @db.Uuid");

    expect(migration).toContain("\"book_id\" UUID NOT NULL");
    expect(migration).toContain("\"page_id\" UUID NOT NULL");
    expect(migration).toContain(
      "ALTER TABLE \"characters\" ADD CONSTRAINT \"characters_book_id_fkey\" FOREIGN KEY (\"book_id\") REFERENCES \"books\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;"
    );
    expect(migration).toContain(
      "ALTER TABLE \"pictures\" ADD CONSTRAINT \"pictures_page_id_fkey\" FOREIGN KEY (\"page_id\") REFERENCES \"book_pages\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;"
    );
    expect(migration).toContain(
      "ALTER TABLE \"ratings\" ADD CONSTRAINT \"ratings_book_id_fkey\" FOREIGN KEY (\"book_id\") REFERENCES \"books\"(\"id\") ON DELETE CASCADE ON UPDATE CASCADE;"
    );
  });

  it("keeps database-critical unique constraints and referential actions visible in the migration", () => {
    for (const statement of [
      "CREATE UNIQUE INDEX \"book_pages_book_id_page_number_key\" ON \"book_pages\"(\"book_id\", \"page_number\");",
      "CREATE UNIQUE INDEX \"referral_programs_user_id_key\" ON \"referral_programs\"(\"user_id\");",
      "CREATE UNIQUE INDEX \"referral_programs_referral_code_key\" ON \"referral_programs\"(\"referral_code\");",
      "CREATE UNIQUE INDEX \"pictures_page_id_key\" ON \"pictures\"(\"page_id\");",
      "CREATE UNIQUE INDEX \"jobs_external_job_id_key\" ON \"jobs\"(\"external_job_id\");"
    ]) {
      expect(migration).toContain(statement);
    }
  });

  it("records safe Stripe billing state and unique webhook receipts", () => {
    expect(schema).toContain("enum StripeEventProcessingStatus");
    expect(schema).toContain("model StripeWebhookEvent {");
    expect(schema).toContain("stripeCustomerId     String?            @map(\"stripe_customer_id\")");
    expect(schema).toContain("latestEventCreatedAt DateTime?          @map(\"latest_event_created_at\")");
    expect(schema).toContain("stripeEventId    String                      @unique @map(\"stripe_event_id\")");
    expect(schema).not.toContain("rawPayload");
    expect(schema).not.toContain("card");

    expect(stripeMigration).toContain(
      "CREATE TYPE \"stripe_event_processing_status\" AS ENUM ('PROCESSED', 'IGNORED', 'FAILED');"
    );
    expect(stripeMigration).toContain(
      "CREATE UNIQUE INDEX \"stripe_webhook_events_stripe_event_id_key\" ON \"stripe_webhook_events\"(\"stripe_event_id\");"
    );
    expect(stripeMigration).not.toContain("payload");
    expect(stripeMigration).not.toContain("signature");
  });

  it("records private deterministic PDF export metadata without binary storage", () => {
    expect(schema).toContain("enum PdfExportStatus");
    expect(schema).toContain("model PdfExport {");
    expect(schema).toContain("contentVersion");
    expect(schema).toContain("@@unique([bookId, contentVersion, layoutVersion])");
    expect(schema).toContain("pdfExports");
    expect(schema).not.toContain("pdfBytes");
    expect(schema).not.toContain("publicUrl");

    expect(pdfExportMigration).toContain(
      "CREATE TYPE \"pdf_export_status\" AS ENUM ('PENDING', 'READY', 'FAILED');"
    );
    expect(pdfExportMigration).toContain(
      "CREATE UNIQUE INDEX \"pdf_exports_book_id_content_version_layout_version_key\" ON \"pdf_exports\"(\"book_id\", \"content_version\", \"layout_version\");"
    );
    expect(pdfExportMigration).not.toContain("BYTEA");
    expect(pdfExportMigration).not.toContain("public_url");
  });
});
