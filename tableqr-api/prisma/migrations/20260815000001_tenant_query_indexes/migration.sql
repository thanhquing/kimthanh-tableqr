-- SA-05: query hot deu co tenant key o dau index. Menu guest sap xep theo
-- sort_order, admin loc theo category; board bep loc status va sap xep thoi gian.
DROP INDEX "menu_item_restaurant_id_category_id_idx";
CREATE INDEX "menu_item_restaurant_category_sort_order_idx" ON "menu_item"("restaurant_id", "category_id", "sort_order");
CREATE INDEX "menu_item_restaurant_sort_order_idx" ON "menu_item"("restaurant_id", "sort_order") WHERE "deleted_at" IS NULL;
CREATE INDEX "order_restaurant_status_created_at_idx" ON "order"("restaurant_id", "status", "created_at");
