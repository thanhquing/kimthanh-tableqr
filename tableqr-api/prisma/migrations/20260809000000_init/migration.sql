-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PREPARING', 'SERVED', 'CANCELLED');
CREATE TYPE "StaffCallType" AS ENUM ('CALL_STAFF', 'REQUEST_BILL');
CREATE TYPE "StaffCallStatus" AS ENUM ('PENDING', 'DONE');

-- CreateTable
CREATE TABLE "restaurant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "address" TEXT,
    CONSTRAINT "restaurant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dining_table" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "dining_table_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "menu_category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "menu_item" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_vnd" INTEGER NOT NULL,
    "image_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "table_session" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "paid_at" TIMESTAMPTZ(3),
    CONSTRAINT "table_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_sequence_no_positive" CHECK ("sequence_no" >= 1)
);

CREATE TABLE "order_item" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "unit_price_vnd_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_item_quantity_positive" CHECK ("quantity" >= 1)
);

CREATE TABLE "staff_call" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "type" "StaffCallType" NOT NULL,
    "status" "StaffCallStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dining_table_code_key" ON "dining_table"("code");
CREATE UNIQUE INDEX "dining_table_qr_token_key" ON "dining_table"("qr_token");
CREATE INDEX "menu_item_category_id_idx" ON "menu_item"("category_id");
CREATE INDEX "table_session_table_id_status_idx" ON "table_session"("table_id", "status");
CREATE UNIQUE INDEX "table_session_one_open_per_table" ON "table_session"("table_id") WHERE "status" = 'OPEN';
CREATE UNIQUE INDEX "order_session_id_sequence_no_key" ON "order"("session_id", "sequence_no");
CREATE INDEX "order_created_at_idx" ON "order"("created_at");
CREATE INDEX "order_table_id_idx" ON "order"("table_id");
CREATE INDEX "order_item_order_id_idx" ON "order_item"("order_id");
CREATE INDEX "order_item_menu_item_id_idx" ON "order_item"("menu_item_id");
CREATE INDEX "staff_call_status_created_at_idx" ON "staff_call"("status", "created_at");
CREATE INDEX "staff_call_session_id_idx" ON "staff_call"("session_id");

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_session" ADD CONSTRAINT "table_session_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order" ADD CONSTRAINT "order_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_call" ADD CONSTRAINT "staff_call_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "table_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_call" ADD CONSTRAINT "staff_call_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "dining_table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
