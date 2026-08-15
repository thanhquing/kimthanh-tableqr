CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TABLE "payment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "restaurant_id" UUID NOT NULL, "subscription_cycle_id" UUID NOT NULL,
  "provider" TEXT NOT NULL, "payment_code" TEXT NOT NULL, "provider_transaction_id" TEXT,
  "amount_vnd" INTEGER NOT NULL, "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paid_at" TIMESTAMPTZ(3),
  CONSTRAINT "payment_pkey" PRIMARY KEY ("id"), CONSTRAINT "payment_payment_code_key" UNIQUE ("payment_code"),
  CONSTRAINT "payment_provider_transaction_id_key" UNIQUE ("provider_transaction_id"),
  CONSTRAINT "payment_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_subscription_cycle_id_fkey" FOREIGN KEY ("subscription_cycle_id") REFERENCES "subscription_cycle"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_amount_vnd_check" CHECK ("amount_vnd" >= 0)
);
CREATE INDEX "payment_restaurant_status_idx" ON "payment"("restaurant_id", "status");
CREATE TABLE "payment_webhook_event" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "restaurant_id" UUID NOT NULL, "provider" TEXT NOT NULL,
  "provider_event_id" TEXT NOT NULL, "payload" JSONB NOT NULL, "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(3), CONSTRAINT "payment_webhook_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_webhook_event_provider_event_id_key" UNIQUE ("provider", "provider_event_id"),
  CONSTRAINT "payment_webhook_event_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT
);
CREATE INDEX "payment_webhook_event_restaurant_received_at_idx" ON "payment_webhook_event"("restaurant_id", "received_at");
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_webhook_event" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_tenant_policy ON "payment" USING ("restaurant_id" = public.tableqr_tenant_id()) WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY payment_webhook_event_tenant_policy ON "payment_webhook_event" USING ("restaurant_id" = public.tableqr_tenant_id()) WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
