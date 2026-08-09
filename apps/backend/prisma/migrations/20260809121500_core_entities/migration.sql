CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "user_role" AS ENUM ('GUARDIAN', 'ADMIN');
CREATE TYPE "subscription_status" AS ENUM ('INACTIVE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');
CREATE TYPE "book_status" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "template_visibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "template_publication_status" AS ENUM ('DRAFT', 'CANDIDATE', 'ACCEPTED', 'REJECTED');
CREATE TYPE "character_kind" AS ENUM ('PARENT', 'CHILD', 'FRIEND', 'PET', 'SIBLING', 'OTHER');
CREATE TYPE "picture_status" AS ENUM ('PENDING', 'GENERATING', 'READY', 'FAILED');
CREATE TYPE "job_type" AS ENUM ('BOOK_GENERATION', 'PICTURE_GENERATION', 'TEMPLATE_PUBLICATION', 'PDF_EXPORT');
CREATE TYPE "job_status" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELED', 'EXPIRED');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "display_name" TEXT,
  "google_subject" TEXT,
  "role" "user_role" NOT NULL DEFAULT 'GUARDIAN',
  "stripe_customer_id" TEXT,
  "subscription_status" "subscription_status" NOT NULL DEFAULT 'INACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "stripe_subscription_id" TEXT,
  "plan" TEXT NOT NULL,
  "status" "subscription_status" NOT NULL,
  "current_period_end" TIMESTAMPTZ(6),
  "trial_ends_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_user_id" UUID,
  "source_book_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "story_type" TEXT NOT NULL,
  "educational_subtype" TEXT,
  "age_min" INTEGER NOT NULL,
  "age_max" INTEGER NOT NULL,
  "visibility" "template_visibility" NOT NULL DEFAULT 'PRIVATE',
  "publication_status" "template_publication_status" NOT NULL DEFAULT 'DRAFT',
  "uniqueness_fingerprint" TEXT,
  "generalized_config" JSONB NOT NULL,
  "safety_review" JSONB,
  "publication_decision" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "books" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "template_id" UUID,
  "title" TEXT,
  "status" "book_status" NOT NULL DEFAULT 'DRAFT',
  "config" JSONB NOT NULL,
  "story_text" JSONB,
  "moderation_result" JSONB,
  "share_token_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "characters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "book_id" UUID,
  "kind" "character_kind" NOT NULL,
  "display_name" TEXT NOT NULL,
  "attributes" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "book_pages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "book_id" UUID NOT NULL,
  "page_number" INTEGER NOT NULL,
  "text_content" TEXT NOT NULL,
  "illustration_description" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "book_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pictures" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "book_id" UUID NOT NULL,
  "page_id" UUID,
  "job_id" UUID,
  "status" "picture_status" NOT NULL DEFAULT 'PENDING',
  "prompt" TEXT NOT NULL,
  "style" TEXT NOT NULL,
  "storage_bucket" TEXT,
  "storage_key" TEXT,
  "image_url" TEXT,
  "provider_asset_id" TEXT,
  "safety_review" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "pictures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "book_id" UUID,
  "template_id" UUID,
  "external_job_id" TEXT,
  "type" "job_type" NOT NULL,
  "status" "job_status" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error_code" TEXT,
  "error_message" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ratings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "book_id" UUID,
  "template_id" UUID,
  "score" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "referral_programs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "referral_code" TEXT NOT NULL,
  "referred_by_user_id" UUID,
  "accepted_count" INTEGER NOT NULL DEFAULT 0,
  "reward_state" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "referral_programs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_subject_key" ON "users"("google_subject");
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE UNIQUE INDEX "templates_source_book_id_key" ON "templates"("source_book_id");
CREATE UNIQUE INDEX "templates_uniqueness_fingerprint_key" ON "templates"("uniqueness_fingerprint");
CREATE INDEX "templates_visibility_publication_status_idx" ON "templates"("visibility", "publication_status");
CREATE INDEX "templates_story_type_educational_subtype_idx" ON "templates"("story_type", "educational_subtype");
CREATE INDEX "templates_owner_user_id_idx" ON "templates"("owner_user_id");
CREATE UNIQUE INDEX "books_share_token_hash_key" ON "books"("share_token_hash");
CREATE INDEX "books_user_id_status_idx" ON "books"("user_id", "status");
CREATE INDEX "books_template_id_idx" ON "books"("template_id");
CREATE INDEX "characters_user_id_kind_idx" ON "characters"("user_id", "kind");
CREATE INDEX "characters_book_id_idx" ON "characters"("book_id");
CREATE UNIQUE INDEX "book_pages_book_id_page_number_key" ON "book_pages"("book_id", "page_number");
CREATE UNIQUE INDEX "pictures_page_id_key" ON "pictures"("page_id");
CREATE UNIQUE INDEX "pictures_job_id_key" ON "pictures"("job_id");
CREATE INDEX "pictures_book_id_status_idx" ON "pictures"("book_id", "status");
CREATE UNIQUE INDEX "jobs_external_job_id_key" ON "jobs"("external_job_id");
CREATE INDEX "jobs_status_available_at_idx" ON "jobs"("status", "available_at");
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");
CREATE INDEX "jobs_user_id_idx" ON "jobs"("user_id");
CREATE INDEX "jobs_book_id_idx" ON "jobs"("book_id");
CREATE INDEX "ratings_book_id_idx" ON "ratings"("book_id");
CREATE INDEX "ratings_template_id_idx" ON "ratings"("template_id");
CREATE INDEX "ratings_user_id_idx" ON "ratings"("user_id");
CREATE UNIQUE INDEX "referral_programs_user_id_key" ON "referral_programs"("user_id");
CREATE UNIQUE INDEX "referral_programs_referral_code_key" ON "referral_programs"("referral_code");
CREATE INDEX "referral_programs_referred_by_user_id_idx" ON "referral_programs"("referred_by_user_id");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "templates" ADD CONSTRAINT "templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "templates" ADD CONSTRAINT "templates_source_book_id_fkey" FOREIGN KEY ("source_book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "book_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
