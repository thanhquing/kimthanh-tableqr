ALTER TYPE "BillingStatus" ADD VALUE IF NOT EXISTS 'GRACE';
CREATE TYPE "PlanInterval" AS ENUM ('MONTHLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'GRACE', 'PAST_DUE', 'SUSPENDED');
CREATE TYPE "SubscriptionCycleStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

CREATE TABLE "plan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "price_vnd" INTEGER NOT NULL, "interval" "PlanInterval" NOT NULL,
  "feature_limits" JSONB NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "plan_pkey" PRIMARY KEY ("id"), CONSTRAINT "plan_code_key" UNIQUE ("code"),
  CONSTRAINT "plan_price_vnd_check" CHECK ("price_vnd" >= 0)
);
INSERT INTO "plan" ("code", "name", "price_vnd", "interval", "feature_limits")
VALUES ('starter-monthly', 'Starter', 100000, 'MONTHLY', '{"orders":"unlimited"}'::jsonb)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "price_vnd" = EXCLUDED."price_vnd", "interval" = EXCLUDED."interval", "feature_limits" = EXCLUDED."feature_limits";

CREATE TABLE "subscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "restaurant_id" UUID NOT NULL, "plan_id" UUID NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL', "trial_ends_at" TIMESTAMPTZ(3) NOT NULL,
  "grace_ends_at" TIMESTAMPTZ(3), "current_period_starts_at" TIMESTAMPTZ(3), "current_period_ends_at" TIMESTAMPTZ(3),
  "price_vnd_snapshot" INTEGER NOT NULL, "feature_limits_snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_pkey" PRIMARY KEY ("id"), CONSTRAINT "subscription_restaurant_id_key" UNIQUE ("restaurant_id"),
  CONSTRAINT "subscription_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_price_vnd_snapshot_check" CHECK ("price_vnd_snapshot" >= 0)
);
CREATE UNIQUE INDEX "subscription_restaurant_id_id_key" ON "subscription"("restaurant_id", "id");
INSERT INTO "subscription" ("restaurant_id", "plan_id", "status", "trial_ends_at", "price_vnd_snapshot", "feature_limits_snapshot")
SELECT r."id", p."id", r."billing_status"::text::"SubscriptionStatus", r."trial_ends_at", p."price_vnd", p."feature_limits"
FROM "restaurant" r CROSS JOIN "plan" p WHERE p."code" = 'starter-monthly'
ON CONFLICT ("restaurant_id") DO NOTHING;

CREATE TABLE "subscription_cycle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "restaurant_id" UUID NOT NULL, "subscription_id" UUID NOT NULL,
  "sequence_no" INTEGER NOT NULL, "status" "SubscriptionCycleStatus" NOT NULL DEFAULT 'PENDING', "amount_vnd" INTEGER NOT NULL,
  "period_starts_at" TIMESTAMPTZ(3) NOT NULL, "period_ends_at" TIMESTAMPTZ(3) NOT NULL, "due_at" TIMESTAMPTZ(3) NOT NULL,
  "paid_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_cycle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_cycle_subscription_sequence_no_key" UNIQUE ("subscription_id", "sequence_no"),
  CONSTRAINT "subscription_cycle_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_cycle_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_cycle_amount_vnd_check" CHECK ("amount_vnd" >= 0)
);
CREATE INDEX "subscription_cycle_restaurant_status_due_at_idx" ON "subscription_cycle"("restaurant_id", "status", "due_at");

ALTER TABLE "plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_cycle" ENABLE ROW LEVEL SECURITY;
CREATE POLICY plan_active_read_policy ON "plan" FOR SELECT USING ("is_active");
CREATE POLICY subscription_tenant_policy ON "subscription" USING ("restaurant_id" = public.tableqr_tenant_id()) WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY subscription_cycle_tenant_policy ON "subscription_cycle" USING ("restaurant_id" = public.tableqr_tenant_id()) WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
