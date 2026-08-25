ALTER TABLE "templates"
  ADD COLUMN "pipeline_version" TEXT,
  ADD COLUMN "fingerprint_version" TEXT,
  ADD COLUMN "semantic_version" TEXT,
  ADD COLUMN "semantic_model" TEXT,
  ADD COLUMN "semantic_algorithm" TEXT,
  ADD COLUMN "semantic_signature" JSONB,
  ADD COLUMN "disabled_at" TIMESTAMPTZ(6),
  ADD COLUMN "disabled_by_user_id" UUID;

ALTER TABLE "templates"
  ADD CONSTRAINT "templates_disabled_by_user_id_fkey"
  FOREIGN KEY ("disabled_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "templates_pipeline_version_fingerprint_version_semantic_version_idx"
  ON "templates"("pipeline_version", "fingerprint_version", "semantic_version");

CREATE TABLE "template_publication_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "source_book_id" UUID,
  "template_id" UUID,
  "actor_type" TEXT NOT NULL,
  "actor_id" UUID,
  "pipeline_version" TEXT NOT NULL,
  "fingerprint_version" TEXT NOT NULL,
  "semantic_version" TEXT NOT NULL,
  "moderation_version" TEXT NOT NULL,
  "privacy_passed" BOOLEAN NOT NULL,
  "moderation_passed" BOOLEAN NOT NULL,
  "fingerprint_collision" BOOLEAN NOT NULL,
  "semantic_catalog_ready" BOOLEAN NOT NULL,
  "semantic_max_score" DOUBLE PRECISION,
  "matched_template_ids" JSONB NOT NULL,
  "outcome" TEXT NOT NULL,
  "reason_code" TEXT NOT NULL,
  "retry_of_audit_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "template_publication_audits_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "template_publication_audits"
  ADD CONSTRAINT "template_publication_audits_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "template_publication_audits"
  ADD CONSTRAINT "template_publication_audits_source_book_id_fkey"
  FOREIGN KEY ("source_book_id") REFERENCES "books"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "template_publication_audits"
  ADD CONSTRAINT "template_publication_audits_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "templates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "template_publication_audits"
  ADD CONSTRAINT "template_publication_audits_retry_of_audit_id_fkey"
  FOREIGN KEY ("retry_of_audit_id") REFERENCES "template_publication_audits"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "template_publication_audits_source_book_id_pipeline_version_idx"
  ON "template_publication_audits"("source_book_id", "pipeline_version");

CREATE UNIQUE INDEX "template_publication_audits_source_book_id_pipeline_version_key"
  ON "template_publication_audits"("source_book_id", "pipeline_version");

CREATE INDEX "template_publication_audits_template_id_idx"
  ON "template_publication_audits"("template_id");

CREATE INDEX "template_publication_audits_outcome_reason_code_idx"
  ON "template_publication_audits"("outcome", "reason_code");
