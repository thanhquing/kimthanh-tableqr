-- Audit lifecycle billing: grace, nhac gia han ngay 1/3/7, qua han va kich hoat lai.
-- Additive: khong doi bang cu, khong can backfill. Rollback = DROP TABLE + DROP TYPE.
CREATE TYPE "SubscriptionEventType" AS ENUM ('GRACE_STARTED', 'DUNNING_NOTICE', 'PAST_DUE', 'ACTIVATED');

CREATE TABLE "subscription_event" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "restaurant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "type" "SubscriptionEventType" NOT NULL,
  "dunning_day" INTEGER NOT NULL DEFAULT 0,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_event_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_event_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscription"("id") ON DELETE RESTRICT,
  CONSTRAINT "subscription_event_dunning_day_check" CHECK ("dunning_day" >= 0)
);

-- Chong ghi trung khi nhieu request cung phat hien mot moc; van tach duoc cac ky grace khac nhau.
CREATE UNIQUE INDEX "subscription_event_occurrence_key" ON "subscription_event"("subscription_id", "type", "dunning_day", "occurred_at");
CREATE INDEX "subscription_event_restaurant_occurred_at_idx" ON "subscription_event"("restaurant_id", "occurred_at");

ALTER TABLE "subscription_event" ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_event_tenant_policy ON "subscription_event"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
