-- Additive tenant migration. Existing single-restaurant rows are backfilled
-- into the only restaurant before columns become required.
ALTER TABLE "restaurant" ADD COLUMN "public_slug" TEXT, ADD COLUMN "staff_login_code" TEXT;
UPDATE "restaurant" SET "public_slug" = 'kim-thanh', "staff_login_code" = 'KIM-4821' WHERE "public_slug" IS NULL;

ALTER TABLE "auth_user" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "dining_table" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "menu_category" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "menu_item" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "table_session" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "order" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "guest_order_request" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "order_item" ADD COLUMN "restaurant_id" UUID;
ALTER TABLE "staff_call" ADD COLUMN "restaurant_id" UUID;

UPDATE "auth_user" SET "restaurant_id" = (SELECT "id" FROM "restaurant" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
UPDATE "dining_table" SET "restaurant_id" = (SELECT "id" FROM "restaurant" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
UPDATE "menu_category" SET "restaurant_id" = (SELECT "id" FROM "restaurant" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
UPDATE "menu_item" SET "restaurant_id" = (SELECT "id" FROM "restaurant" ORDER BY "id" LIMIT 1) WHERE "restaurant_id" IS NULL;
UPDATE "table_session" s SET "restaurant_id" = t."restaurant_id" FROM "dining_table" t WHERE s."table_id" = t."id";
UPDATE "order" o SET "restaurant_id" = s."restaurant_id" FROM "table_session" s WHERE o."session_id" = s."id";
UPDATE "guest_order_request" r SET "restaurant_id" = o."restaurant_id" FROM "order" o WHERE r."order_id" = o."id";
UPDATE "order_item" i SET "restaurant_id" = o."restaurant_id" FROM "order" o WHERE i."order_id" = o."id";
UPDATE "staff_call" c SET "restaurant_id" = s."restaurant_id" FROM "table_session" s WHERE c."session_id" = s."id";

ALTER TABLE "restaurant" ALTER COLUMN "public_slug" SET NOT NULL, ALTER COLUMN "staff_login_code" SET NOT NULL;
ALTER TABLE "auth_user" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "dining_table" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "menu_category" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "menu_item" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "table_session" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "order" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "guest_order_request" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "order_item" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "staff_call" ALTER COLUMN "restaurant_id" SET NOT NULL;

DROP INDEX "dining_table_code_key", "guest_order_request_created_at_idx", "guest_order_request_session_id_request_id_key", "menu_item_category_id_idx", "order_created_at_idx", "order_session_id_sequence_no_key", "order_table_id_idx", "order_item_menu_item_id_idx", "order_item_order_id_idx", "staff_call_session_id_idx", "staff_call_status_created_at_idx", "table_session_table_id_status_idx";
CREATE UNIQUE INDEX "restaurant_public_slug_key" ON "restaurant"("public_slug");
CREATE UNIQUE INDEX "restaurant_staff_login_code_key" ON "restaurant"("staff_login_code");
CREATE INDEX "auth_user_restaurant_role_is_active_idx" ON "auth_user"("restaurant_id", "role", "is_active");
CREATE UNIQUE INDEX "dining_table_restaurant_id_code_key" ON "dining_table"("restaurant_id", "code");
CREATE INDEX "dining_table_restaurant_id_sort_order_idx" ON "dining_table"("restaurant_id", "sort_order");
CREATE INDEX "menu_category_restaurant_id_sort_order_idx" ON "menu_category"("restaurant_id", "sort_order");
CREATE INDEX "menu_item_restaurant_id_category_id_idx" ON "menu_item"("restaurant_id", "category_id");
CREATE INDEX "table_session_restaurant_table_status_idx" ON "table_session"("restaurant_id", "table_id", "status");
CREATE UNIQUE INDEX "order_restaurant_session_sequence_no_key" ON "order"("restaurant_id", "session_id", "sequence_no");
CREATE INDEX "order_restaurant_created_at_idx" ON "order"("restaurant_id", "created_at");
CREATE INDEX "order_restaurant_table_id_idx" ON "order"("restaurant_id", "table_id");
CREATE UNIQUE INDEX "guest_order_request_restaurant_session_request_id_key" ON "guest_order_request"("restaurant_id", "session_id", "request_id");
CREATE INDEX "guest_order_request_restaurant_created_at_idx" ON "guest_order_request"("restaurant_id", "created_at");
CREATE INDEX "order_item_restaurant_order_id_idx" ON "order_item"("restaurant_id", "order_id");
CREATE INDEX "order_item_restaurant_menu_item_id_idx" ON "order_item"("restaurant_id", "menu_item_id");
CREATE INDEX "staff_call_restaurant_status_created_at_idx" ON "staff_call"("restaurant_id", "status", "created_at");
CREATE INDEX "staff_call_restaurant_session_id_idx" ON "staff_call"("restaurant_id", "session_id");

ALTER TABLE "auth_user" ADD CONSTRAINT "auth_user_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_category" ADD CONSTRAINT "menu_category_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guest_order_request" ADD CONSTRAINT "guest_order_request_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_call" ADD CONSTRAINT "staff_call_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
