CREATE TABLE "staff_device_pairing" (
  "id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_device_pairing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "staff_device_pairing_token_hash_key" ON "staff_device_pairing"("token_hash");
CREATE INDEX "staff_device_pairing_restaurant_expires_at_idx" ON "staff_device_pairing"("restaurant_id", "expires_at");
ALTER TABLE "staff_device_pairing" ADD CONSTRAINT "staff_device_pairing_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
