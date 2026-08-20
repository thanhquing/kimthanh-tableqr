#!/usr/bin/env bash

# Test tai tenant (`SA-12`). Doc tren hai quán fixture, ghi tren mot quán tam
# dang ky rieng cho lan chay nay nen khong lam ban fixture.
#
# Chay sau: docker compose -f tableqr-api/docker-compose.yml up -d api
# Bien moi truong: USERS (mac dinh 30), ITERATIONS (mac dinh 5).

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"
COMPOSE_FILE="${COMPOSE_FILE:-tableqr-api/docker-compose.yml}"
DATABASE_ADMIN_URL="${DATABASE_ADMIN_URL:-postgresql://tableqr:tableqr@localhost:5433/tableqr?schema=public}"
USERS="${USERS:-20}"
ITERATIONS="${ITERATIONS:-2}"

for command in curl jq node docker; do
  command -v "$command" >/dev/null || { printf 'Thieu lenh bat buoc: %s\n' "$command" >&2; exit 1; }
done

db_query() {
  local query="$1"
  if command -v psql >/dev/null; then psql -qAt "$DATABASE_ADMIN_URL" -c "$query"; return; fi
  docker compose -f "$COMPOSE_FILE" exec -T db psql -qAt -U tableqr -d tableqr -c "$query"
}

# Moi khach ao ngoi mot ban rieng: rate limit cua guest tinh theo QR/ban nen don
# ca chuc dien thoai vao mot ma QR chi do lai chinh cai chan do, khong do tai he.
qrs_where() {
  db_query "SELECT t.qr_token FROM dining_table t JOIN restaurant r ON r.id = t.restaurant_id WHERE $1 AND t.is_active ORDER BY t.sort_order;" | jq -Rsc 'split("\n") | map(select(length > 0))'
}
qrs_of_slug() { qrs_where "r.public_slug = '$1'"; }

KIM_THANH_QRS="$(qrs_of_slug 'kim-thanh')"
HUONG_QUE_QRS="$(qrs_of_slug 'huong-que')"
[[ "$(jq 'length' <<<"$KIM_THANH_QRS")" -gt 0 && "$(jq 'length' <<<"$HUONG_QUE_QRS")" -gt 0 ]] \
  || { printf 'Thieu quán fixture; chay `pnpm --filter tableqr-api seed` truoc.\n' >&2; exit 1; }

EMAIL="owner.loadtest.$(date +%s).$RANDOM@example.test"
REGISTRATION="$(curl -fsS -X POST "$API_BASE_URL/public/owner-registration" -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg email "$EMAIL" '{restaurantName: "Quán Load Test", ownerDisplayName: "Anh Tải", email: $email, password: "mat-khau-2026", staffPin: "123456"}')")"
OWNER_TOKEN="$(jq -er '.token' <<<"$REGISTRATION")"
LOAD_RESTAURANT_ID="$(jq -er '.restaurant.id' <<<"$REGISTRATION")"
# Quán mau chi co 4 ban; them cho du de khong ban nao vuot 10 don/phut.
for index in $(seq 5 12); do
  curl -fsS -o /dev/null -X POST "$API_BASE_URL/admin/tables" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" \
    --data "$(jq -nc --arg code "B$index" --arg name "Bàn $index" --argjson sort "$index" '{code: $code, displayName: $name, sortOrder: $sort}')"
done
WRITE_QRS="$(qrs_where "r.id = '$LOAD_RESTAURANT_ID'")"

TENANTS="$(jq -nc --argjson a "$KIM_THANH_QRS" --argjson b "$HUONG_QUE_QRS" --argjson c "$WRITE_QRS" \
  '[{name: "Kim Thành", qrTokens: $a, write: false}, {name: "Hương Quê", qrTokens: $b, write: false}, {name: "Load Test", qrTokens: $c, write: true}]')"

exec node tableqr-api/scripts/load-test-tenants.mjs --base "$API_BASE_URL" --users "$USERS" --iterations "$ITERATIONS" --tenants "$TENANTS"
