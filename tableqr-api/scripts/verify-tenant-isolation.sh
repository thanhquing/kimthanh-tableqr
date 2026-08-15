#!/usr/bin/env bash

# Kiem tra nhanh tenant isolation va guest capability tren fixture local.
# Chay sau: pnpm dev:local-domains

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"

for command in curl jq; do
  command -v "$command" >/dev/null || {
    printf 'Thieu lenh bat buoc: %s\n' "$command" >&2
    exit 1
  }
done

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

status() {
  curl -sS --connect-timeout 5 --max-time 20 -o /dev/null -w '%{http_code}' "$@"
}

staff_token() {
  local code="$1"
  local pin="$2"
  curl -fsS -X POST "$API_BASE_URL/staff/auth/login" \
    -H 'Content-Type: application/json' \
    --data "$(jq -nc --arg code "$code" --arg pin "$pin" '{staffLoginCode: $code, pin: $pin}')" | jq -er '.token'
}

bootstrap() {
  curl -fsS "$API_BASE_URL/guest/tables/qr-ban-01-a7f3k9m2xp"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local description="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf '✗ %s (can %s, nhan %s)\n' "$description" "$expected" "$actual" >&2
    exit 1
  fi
  printf '✓ %s\n' "$description"
}

printf 'Kiem tra tenant isolation tai %s\n' "$API_BASE_URL"

# DATABASE_ADMIN_URL la owner local dung de mo ket noi, sau do SET ROLE giong API.
DATABASE_ADMIN_URL="${DATABASE_ADMIN_URL:-postgresql://tableqr:tableqr@localhost:5433/tableqr?schema=public}"

KIM_STAFF_TOKEN="$(staff_token 'KIM-4821' '246810')"
HUONG_STAFF_TOKEN="$(staff_token 'HUONG-7391' '135790')"
FIRST_BOOTSTRAP="$(bootstrap)"
SECOND_BOOTSTRAP="$(bootstrap)"
SESSION_ID="$(jq -er '.session.id' <<<"$FIRST_BOOTSTRAP")"
FIRST_ACCESS="$(jq -er '.guestAccessToken' <<<"$FIRST_BOOTSTRAP")"
SECOND_ACCESS="$(jq -er '.guestAccessToken' <<<"$SECOND_BOOTSTRAP")"

[[ "$FIRST_ACCESS" != "$SECOND_ACCESS" ]] || {
  printf '✗ Hai lan quet QR phai co capability khac nhau\n' >&2
  exit 1
}
printf '✓ Hai lan quet QR tao capability doc lap\n'

assert_status "$(status -H "X-Guest-Access: $FIRST_ACCESS" "$API_BASE_URL/guest/sessions/$SESSION_ID/orders")" 200 'Capability lan quet thu nhat truy cap duoc'
assert_status "$(status -H "X-Guest-Access: $SECOND_ACCESS" "$API_BASE_URL/guest/sessions/$SESSION_ID/orders")" 200 'Capability lan quet thu hai truy cap duoc'
assert_status "$(status "$API_BASE_URL/guest/sessions/$SESSION_ID/orders")" 401 'Khong co capability bi tu choi'
assert_status "$(status -H "Authorization: Bearer $HUONG_STAFF_TOKEN" "$API_BASE_URL/staff/sessions/$SESSION_ID")" 404 'Nhan vien tenant khac khong xem duoc phien Kim Thanh'
assert_status "$(status -H "Authorization: Bearer $KIM_STAFF_TOKEN" "$API_BASE_URL/staff/sessions/$SESSION_ID")" 200 'Nhan vien dung tenant xem duoc phien'

# Tao order Kim Thanh de kiem ca PATCH cheo tenant va luong SSE chon dung quán.
KIM_STREAM_TICKET="$(curl -fsS -X POST "$API_BASE_URL/staff/stream-ticket" -H "Authorization: Bearer $KIM_STAFF_TOKEN" | jq -er '.ticket')"
HUONG_STREAM_TICKET="$(curl -fsS -X POST "$API_BASE_URL/staff/stream-ticket" -H "Authorization: Bearer $HUONG_STAFF_TOKEN" | jq -er '.ticket')"
KIM_STREAM_OUTPUT="$(mktemp)"
HUONG_STREAM_OUTPUT="$(mktemp)"
trap 'rm -f "$KIM_STREAM_OUTPUT" "$HUONG_STREAM_OUTPUT"' EXIT
(curl -sSN --connect-timeout 5 --max-time 4 "$API_BASE_URL/staff/stream?stream_ticket=$KIM_STREAM_TICKET" >"$KIM_STREAM_OUTPUT" || true) &
KIM_STREAM_PID=$!
(curl -sSN --connect-timeout 5 --max-time 4 "$API_BASE_URL/staff/stream?stream_ticket=$HUONG_STREAM_TICKET" >"$HUONG_STREAM_OUTPUT" || true) &
HUONG_STREAM_PID=$!
sleep 0.2
ITEM_ID="$(jq -er '.items[0].id' <<<"$FIRST_BOOTSTRAP")"
TEST_ORDER="$(curl -fsS -X POST "$API_BASE_URL/guest/sessions/$SESSION_ID/orders" -H 'Content-Type: application/json' -H "X-Guest-Access: $FIRST_ACCESS" -H "X-Request-Id: tenant-rls-$RANDOM-$RANDOM" --data "$(jq -nc --arg item "$ITEM_ID" '{items: [{menuItemId: $item, quantity: 1}]}')")"
TEST_ORDER_ID="$(jq -er '.id' <<<"$TEST_ORDER")"
assert_status "$(status -X PATCH -H "Authorization: Bearer $HUONG_STAFF_TOKEN" -H 'Content-Type: application/json' --data '{"status":"PREPARING"}' "$API_BASE_URL/staff/orders/$TEST_ORDER_ID/status")" 404 'Nhan vien tenant khac khong the sua don Kim Thanh'
wait "$KIM_STREAM_PID" || true
wait "$HUONG_STREAM_PID" || true
grep -q 'event: order.created' "$KIM_STREAM_OUTPUT" || { printf '✗ SSE Kim Thanh khong nhan event don cua minh\n' >&2; exit 1; }
if grep -q 'event: order.created' "$HUONG_STREAM_OUTPUT"; then
  printf '✗ SSE Hương Quê nhan event cua Kim Thanh\n' >&2
  exit 1
fi
printf '✓ SSE chi phat event cho dung tenant\n'

# RLS phai chan ca truy van truc tiep bang runtime role khi khong co context.
RLS_COUNT="$(db_query "BEGIN; SET LOCAL ROLE tableqr_app; SELECT count(*) FROM dining_table; COMMIT;")"
[[ "$RLS_COUNT" == "0" ]] || { printf '✗ RLS phai an toan bo bang khi thieu tenant context (nhan %s)\n' "$RLS_COUNT" >&2; exit 1; }
printf '✓ RLS chan truy van truc tiep khi thieu tenant context\n'

KIM_RESTAURANT_ID="$(db_query "SELECT id FROM restaurant WHERE staff_login_code = 'KIM-4821'")"
HUONG_RESTAURANT_ID="$(db_query "SELECT id FROM restaurant WHERE staff_login_code = 'HUONG-7391'")"
RLS_KIM_COUNT="$(db_query "BEGIN; SET LOCAL ROLE tableqr_app; SELECT set_config('app.restaurant_id', '$KIM_RESTAURANT_ID', true); SELECT count(*) FROM dining_table; COMMIT;" | tail -1)"
RLS_HUONG_COUNT="$(db_query "BEGIN; SET LOCAL ROLE tableqr_app; SELECT set_config('app.restaurant_id', '$HUONG_RESTAURANT_ID', true); SELECT count(*) FROM dining_table; COMMIT;" | tail -1)"
[[ "$RLS_KIM_COUNT" -gt 1 && "$RLS_HUONG_COUNT" == "1" ]] || { printf '✗ RLS tenant context khong dung (Kim=%s, Huong=%s)\n' "$RLS_KIM_COUNT" "$RLS_HUONG_COUNT" >&2; exit 1; }
printf '✓ RLS chi tra row cua tenant da xac minh\n'

printf '\nHoan tat: tenant isolation va guest capability da PASS.\n'
