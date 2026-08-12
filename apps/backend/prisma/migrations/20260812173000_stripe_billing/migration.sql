ALTER TYPE "subscription_status" ADD VALUE 'INCOMPLETE';
ALTER TYPE "subscription_status" ADD VALUE 'INCOMPLETE_EXPIRED';
ALTER TYPE "subscription_status" ADD VALUE 'UNPAID';
ALTER TYPE "subscription_status" ADD VALUE 'PAUSED';

CREATE TYPE "stripe_event_processing_status" AS ENUM ('PROCESSED', 'IGNORED', 'FAILED');

ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "provider_status" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" TIMESTAMPTZ(6);
ALTER TABLE "subscriptions" ADD COLUMN "trial_started_at" TIMESTAMPTZ(6);
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at" TIMESTAMPTZ(6);
ALTER TABLE "subscriptions" ADD COLUMN "canceled_at" TIMESTAMPTZ(6);
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN "latest_event_created_at" TIMESTAMPTZ(6);

CREATE TABLE "stripe_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stripe_event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider_object_id" TEXT,
  "provider_created_at" TIMESTAMPTZ(6) NOT NULL,
  "processing_status" "stripe_event_processing_status" NOT NULL,
  "result" JSONB,
  "error_code" TEXT,
  "user_id" UUID,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6),

  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");
CREATE INDEX "subscriptions_latest_event_created_at_idx" ON "subscriptions"("latest_event_created_at");
CREATE INDEX "stripe_webhook_events_type_provider_created_at_idx" ON "stripe_webhook_events"("type", "provider_created_at");
CREATE INDEX "stripe_webhook_events_provider_object_id_idx" ON "stripe_webhook_events"("provider_object_id");
CREATE INDEX "stripe_webhook_events_user_id_idx" ON "stripe_webhook_events"("user_id");

ALTER TABLE "stripe_webhook_events" ADD CONSTRAINT "stripe_webhook_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
