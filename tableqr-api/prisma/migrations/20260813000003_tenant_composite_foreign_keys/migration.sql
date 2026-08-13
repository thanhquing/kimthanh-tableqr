-- Tenant ID khong chi la filter trong code: cac quan he nghiep vu phai cung
-- restaurant_id o cap PostgreSQL. Nhung FK don theo id van duoc giu lai de
-- bao toan toan ven ID va tuong thich Prisma.

CREATE UNIQUE INDEX "dining_table_restaurant_id_id_key" ON "dining_table"("restaurant_id", "id");
CREATE UNIQUE INDEX "menu_category_restaurant_id_id_key" ON "menu_category"("restaurant_id", "id");
CREATE UNIQUE INDEX "menu_item_restaurant_id_id_key" ON "menu_item"("restaurant_id", "id");
CREATE UNIQUE INDEX "table_session_restaurant_id_id_key" ON "table_session"("restaurant_id", "id");
CREATE UNIQUE INDEX "order_restaurant_id_id_key" ON "order"("restaurant_id", "id");

ALTER TABLE "menu_item"
  ADD CONSTRAINT "menu_item_restaurant_category_fkey"
  FOREIGN KEY ("restaurant_id", "category_id") REFERENCES "menu_category"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "table_session"
  ADD CONSTRAINT "table_session_restaurant_table_fkey"
  FOREIGN KEY ("restaurant_id", "table_id") REFERENCES "dining_table"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order"
  ADD CONSTRAINT "order_restaurant_session_fkey"
  FOREIGN KEY ("restaurant_id", "session_id") REFERENCES "table_session"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_restaurant_table_fkey"
  FOREIGN KEY ("restaurant_id", "table_id") REFERENCES "dining_table"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guest_order_request"
  ADD CONSTRAINT "guest_order_request_restaurant_session_fkey"
  FOREIGN KEY ("restaurant_id", "session_id") REFERENCES "table_session"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "guest_order_request_restaurant_order_fkey"
  FOREIGN KEY ("restaurant_id", "order_id") REFERENCES "order"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_item"
  ADD CONSTRAINT "order_item_restaurant_order_fkey"
  FOREIGN KEY ("restaurant_id", "order_id") REFERENCES "order"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "order_item_restaurant_menu_item_fkey"
  FOREIGN KEY ("restaurant_id", "menu_item_id") REFERENCES "menu_item"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "staff_call"
  ADD CONSTRAINT "staff_call_restaurant_session_fkey"
  FOREIGN KEY ("restaurant_id", "session_id") REFERENCES "table_session"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "staff_call_restaurant_table_fkey"
  FOREIGN KEY ("restaurant_id", "table_id") REFERENCES "dining_table"("restaurant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
