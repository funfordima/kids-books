CREATE TYPE "pdf_export_status" AS ENUM ('PENDING', 'READY', 'FAILED');

CREATE TABLE "pdf_exports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "book_id" UUID NOT NULL,
  "content_version" TEXT NOT NULL,
  "layout_version" TEXT NOT NULL,
  "status" "pdf_export_status" NOT NULL DEFAULT 'PENDING',
  "storage_bucket" TEXT,
  "storage_key" TEXT,
  "sha256" TEXT,
  "byte_size" INTEGER,
  "content_type" TEXT,
  "content_disposition" TEXT,
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),

  CONSTRAINT "pdf_exports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pdf_exports_book_id_content_version_layout_version_key" ON "pdf_exports"("book_id", "content_version", "layout_version");
CREATE INDEX "pdf_exports_user_id_idx" ON "pdf_exports"("user_id");
CREATE INDEX "pdf_exports_book_id_status_idx" ON "pdf_exports"("book_id", "status");

ALTER TABLE "pdf_exports" ADD CONSTRAINT "pdf_exports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pdf_exports" ADD CONSTRAINT "pdf_exports_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
