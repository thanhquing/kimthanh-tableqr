-- RLS là lớp phòng thủ sau cùng khi code quên restaurant_id. API runtime phải
-- SET ROLE tableqr_app; user owner tableqr vẫn dùng được cho migrate/seed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tableqr_app') THEN
    CREATE ROLE tableqr_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

GRANT tableqr_app TO tableqr;
GRANT USAGE ON SCHEMA public TO tableqr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tableqr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tableqr_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tableqr IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tableqr_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tableqr IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tableqr_app;

ALTER TABLE "guest_session_access" ADD COLUMN "restaurant_id" UUID;
UPDATE "guest_session_access" access
SET "restaurant_id" = session."restaurant_id"
FROM "table_session" session
WHERE session."id" = access."session_id";
ALTER TABLE "guest_session_access" ALTER COLUMN "restaurant_id" SET NOT NULL;
ALTER TABLE "guest_session_access" ADD CONSTRAINT "guest_session_access_restaurant_id_fkey"
  FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guest_session_access" ADD CONSTRAINT "guest_session_access_restaurant_session_fkey"
  FOREIGN KEY ("restaurant_id", "session_id") REFERENCES "table_session"("restaurant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "guest_session_access_restaurant_session_id_idx" ON "guest_session_access"("restaurant_id", "session_id");

CREATE OR REPLACE FUNCTION public.tableqr_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.restaurant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.tableqr_guest_session_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.guest_session_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.tableqr_guest_access_token_hash() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.guest_access_token_hash', true), '')
$$;

CREATE OR REPLACE FUNCTION public.tableqr_context_text(setting_name text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting(setting_name, true), '')
$$;

-- Các bảng tenant-scoped chỉ thấy đúng tenant đã được service xác minh.
ALTER TABLE "restaurant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dining_table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guest_session_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guest_order_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_call" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_device_pairing" ENABLE ROW LEVEL SECURITY;

CREATE POLICY restaurant_tenant_policy ON "restaurant"
  USING ("id" = public.tableqr_tenant_id())
  WITH CHECK ("id" = public.tableqr_tenant_id());
CREATE POLICY restaurant_staff_login_policy ON "restaurant" FOR SELECT
  USING ("staff_login_code" = public.tableqr_context_text('app.staff_login_code'));

CREATE POLICY auth_user_tenant_policy ON "auth_user"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY auth_user_owner_login_policy ON "auth_user" FOR SELECT
  USING ("email" = public.tableqr_context_text('app.owner_email'));

CREATE POLICY dining_table_tenant_policy ON "dining_table"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY dining_table_qr_policy ON "dining_table" FOR SELECT
  USING ("is_active" AND "qr_token" = public.tableqr_context_text('app.qr_token'));

CREATE POLICY menu_category_tenant_policy ON "menu_category"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY menu_item_tenant_policy ON "menu_item"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());

CREATE POLICY table_session_tenant_policy ON "table_session"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY table_session_guest_capability_policy ON "table_session" FOR SELECT
  USING (
    "id" = public.tableqr_guest_session_id()
    AND EXISTS (
      SELECT 1 FROM "guest_session_access" access
      WHERE access."session_id" = "table_session"."id"
        AND access."token_hash" = public.tableqr_guest_access_token_hash()
    )
  );

CREATE POLICY guest_session_access_tenant_policy ON "guest_session_access"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY guest_session_access_capability_policy ON "guest_session_access" FOR SELECT
  USING ("session_id" = public.tableqr_guest_session_id() AND "token_hash" = public.tableqr_guest_access_token_hash());

CREATE POLICY order_tenant_policy ON "order"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY guest_order_request_tenant_policy ON "guest_order_request"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY order_item_tenant_policy ON "order_item"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY staff_call_tenant_policy ON "staff_call"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());

CREATE POLICY staff_device_pairing_tenant_policy ON "staff_device_pairing"
  USING ("restaurant_id" = public.tableqr_tenant_id())
  WITH CHECK ("restaurant_id" = public.tableqr_tenant_id());
CREATE POLICY staff_device_pairing_claim_policy ON "staff_device_pairing" FOR ALL
  USING ("token_hash" = public.tableqr_context_text('app.staff_pairing_token_hash'))
  WITH CHECK ("token_hash" = public.tableqr_context_text('app.staff_pairing_token_hash'));
