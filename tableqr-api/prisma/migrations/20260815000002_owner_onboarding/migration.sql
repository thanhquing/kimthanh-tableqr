CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

ALTER TABLE "restaurant" ADD COLUMN "trial_ends_at" TIMESTAMPTZ(3), ADD COLUMN "billing_status" "BillingStatus" NOT NULL DEFAULT 'TRIAL';
UPDATE "restaurant" SET "trial_ends_at" = CURRENT_TIMESTAMP + INTERVAL '2 months' WHERE "trial_ends_at" IS NULL;
ALTER TABLE "restaurant" ALTER COLUMN "trial_ends_at" SET NOT NULL;
