#!/usr/bin/env bash

# Xac nhan index cua cac query hot bat dau bang restaurant_id. Chay sau seed
# local; SET enable_seqscan=off de kiem kha nang su dung index, khong thay the
# benchmark tren data production.

set -euo pipefail

DATABASE_ADMIN_URL="${DATABASE_ADMIN_URL:-postgresql://tableqr:tableqr@localhost:5433/tableqr?schema=public}"

db_query() {
  local query="$1"
  if command -v psql >/dev/null; then
    psql -qAt "$DATABASE_ADMIN_URL" -c "$query"
    return
  fi
  if command -v docker >/dev/null && docker compose -f tableqr-api/docker-compose.yml ps db >/dev/null 2>&1; then
    docker compose -f tableqr-api/docker-compose.yml exec -T db psql -qAt -U tableqr -d tableqr -c "$query"
    return
  fi
  printf 'Thieu psql tren may va khong truy cap duoc Docker database local.\n' >&2
  exit 1
}

KIM_RESTAURANT_ID="$(db_query "SELECT id FROM restaurant WHERE staff_login_code = 'KIM-4821'")"
[[ -n "$KIM_RESTAURANT_ID" ]] || { printf 'Khong tim thay tenant Kim Thanh. Hay chay seed truoc.\n' >&2; exit 1; }

PLAN="$(db_query "
BEGIN;
SELECT set_config('app.restaurant_id', '$KIM_RESTAURANT_ID', true);
SET LOCAL ROLE tableqr_app;
SET LOCAL enable_seqscan = off;
EXPLAIN (COSTS OFF) SELECT id FROM menu_category WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND is_active ORDER BY sort_order;
EXPLAIN (COSTS OFF) SELECT id FROM menu_item WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND deleted_at IS NULL ORDER BY sort_order;
EXPLAIN (COSTS OFF) SELECT id FROM menu_item WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND category_id = (SELECT id FROM menu_category WHERE restaurant_id = current_setting('app.restaurant_id')::uuid LIMIT 1) ORDER BY sort_order;
EXPLAIN (COSTS OFF) SELECT id FROM table_session WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND table_id = (SELECT id FROM dining_table WHERE restaurant_id = current_setting('app.restaurant_id')::uuid LIMIT 1) AND status = 'OPEN';
EXPLAIN (COSTS OFF) SELECT id FROM \"order\" WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND status = 'NEW' ORDER BY created_at ASC;
EXPLAIN (COSTS OFF) SELECT id FROM staff_call WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND status = 'PENDING' ORDER BY created_at DESC;
EXPLAIN (COSTS OFF) SELECT id FROM guest_order_request WHERE restaurant_id = current_setting('app.restaurant_id')::uuid AND session_id = (SELECT id FROM table_session WHERE restaurant_id = current_setting('app.restaurant_id')::uuid LIMIT 1) AND request_id = 'missing';
ROLLBACK;
")"

INDEXES="$(db_query "SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")"
for index in \
  menu_category_restaurant_id_sort_order_idx \
  menu_item_restaurant_sort_order_idx \
  menu_item_restaurant_category_sort_order_idx \
  table_session_restaurant_table_status_idx \
  order_restaurant_status_created_at_idx \
  staff_call_restaurant_status_created_at_idx \
  guest_order_request_restaurant_session_request_id_key; do
  grep -qx "$index" <<<"$INDEXES" || { printf '✗ Thieu index tenant-scoped %s\n' "$index" >&2; exit 1; }
  printf '✓ Co index tenant-scoped %s\n' "$index"
done

if grep -q 'Seq Scan' <<<"$PLAN"; then
  printf '✗ EXPLAIN van co sequential scan\n%s\n' "$PLAN" >&2
  exit 1
fi
grep -q 'restaurant_id' <<<"$PLAN" || { printf '✗ EXPLAIN thieu tenant condition\n%s\n' "$PLAN" >&2; exit 1; }
printf '✓ EXPLAIN khong co sequential scan va co tenant condition\n'

CODE_COUNT="$(db_query "SELECT count(*) FROM dining_table WHERE code = 'B01'")"
[[ "$CODE_COUNT" == "2" ]] || { printf '✗ Ma ban B01 phai duoc phep o hai tenant (nhan %s)\n' "$CODE_COUNT" >&2; exit 1; }
printf '✓ Ma ban chi unique trong tenant; QR token van global unique\n'

SNAPSHOT_PRESERVED="$(db_query "
BEGIN;
WITH target AS MATERIALIZED (
  SELECT item.id, item.menu_item_id, item.unit_price_vnd_snapshot
  FROM order_item item
  JOIN \"order\" orders ON orders.id = item.order_id
  WHERE orders.restaurant_id = '$KIM_RESTAURANT_ID'::uuid
  LIMIT 1
), changed AS (
  UPDATE menu_item SET price_vnd = price_vnd + 777
  WHERE id = (SELECT menu_item_id FROM target)
  RETURNING id
)
SELECT (SELECT unit_price_vnd_snapshot FROM target) = (SELECT unit_price_vnd_snapshot FROM order_item WHERE id = (SELECT id FROM target)) FROM changed;
ROLLBACK;
")"
[[ "$SNAPSHOT_PRESERVED" == "t" ]] || { printf '✗ Gia snapshot order bi thay doi khi sua gia menu\n' >&2; exit 1; }
printf '✓ Gia snapshot order khong doi khi gia menu thay doi\n'

OPEN_SESSION_INSERTED="$(db_query "
BEGIN;
WITH target AS (
  SELECT restaurant_id, table_id FROM table_session
  WHERE restaurant_id = '$KIM_RESTAURANT_ID'::uuid AND status = 'OPEN'
  LIMIT 1
), inserted AS (
  INSERT INTO table_session (id, restaurant_id, table_id, status, opened_at)
  SELECT '00000000-0000-4000-8000-000000000005'::uuid, restaurant_id, table_id, 'OPEN', CURRENT_TIMESTAMP FROM target
  ON CONFLICT (table_id) WHERE (status = 'OPEN') DO NOTHING
  RETURNING id
)
SELECT count(*) FROM inserted;
ROLLBACK;
")"
[[ "$OPEN_SESSION_INSERTED" == "0" ]] || { printf '✗ Unique OPEN session theo ban khong duoc bao toan\n' >&2; exit 1; }
printf '✓ Unique OPEN session theo ban van duoc bao toan\n'

printf '\nHoan tat: query hot tenant-scoped co index phu hop.\n'
