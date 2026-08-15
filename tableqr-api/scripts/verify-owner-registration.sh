#!/usr/bin/env bash

# Kiem onboarding owner public: transaction tao quán, trial 2 thang theo lich,
# owner/staff login, du lieu mau va tenant isolation. Restart API truoc khi lap
# script nhieu lan vi endpoint co rate limit 3 lan/gio.

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"

for command in curl jq node; do
  command -v "$command" >/dev/null || { printf 'Thieu lenh bat buoc: %s\n' "$command" >&2; exit 1; }
done

assert_status() {
  local actual="$1"
  local expected="$2"
  local description="$3"
  [[ "$actual" == "$expected" ]] || { printf '✗ %s (can %s, nhan %s)\n' "$description" "$expected" "$actual" >&2; exit 1; }
  printf '✓ %s\n' "$description"
}

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT
EMAIL="owner.onboarding.$(date +%s).$RANDOM@example.test"
PASSWORD='mat-khau-2026'
PIN='123456'

REGISTRATION="$(curl -fsS -X POST "$API_BASE_URL/public/owner-registration" -H 'Content-Type: application/json' --data "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" --arg pin "$PIN" '{restaurantName: "Quán Onboarding Test", ownerDisplayName: "Chị Mai", email: $email, password: $password, staffPin: $pin}')")"
OWNER_TOKEN="$(jq -er '.token' <<<"$REGISTRATION")"
STAFF_CODE="$(jq -er '.restaurant.staffLoginCode' <<<"$REGISTRATION")"
TRIAL_ENDS_AT="$(jq -er '.trialEndsAt' <<<"$REGISTRATION")"

node - "$TRIAL_ENDS_AT" <<'NODE'
const trial = new Date(process.argv[2])
const now = new Date()
const expected = new Date(now)
const day = expected.getUTCDate()
expected.setUTCDate(1)
expected.setUTCMonth(expected.getUTCMonth() + 2)
expected.setUTCDate(Math.min(day, new Date(Date.UTC(expected.getUTCFullYear(), expected.getUTCMonth() + 1, 0)).getUTCDate()))
if (trial.toISOString().slice(0, 10) !== expected.toISOString().slice(0, 10)) process.exit(1)
NODE
printf '✓ Trial ket thuc sau dung 2 thang lich\n'

OWNER_LOGIN="$(curl -fsS -X POST "$API_BASE_URL/admin/auth/login" -H 'Content-Type: application/json' --data "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email: $email, password: $password}')")"
STAFF_LOGIN="$(curl -fsS -X POST "$API_BASE_URL/staff/auth/login" -H 'Content-Type: application/json' --data "$(jq -nc --arg code "$STAFF_CODE" --arg pin "$PIN" '{staffLoginCode: $code, pin: $pin}')")"
[[ "$(jq -r '.restaurant.id' <<<"$OWNER_LOGIN")" == "$(jq -r '.restaurant.id' <<<"$REGISTRATION")" ]] || { printf '✗ Owner login sai tenant\n' >&2; exit 1; }
[[ "$(jq -r '.restaurant.id' <<<"$STAFF_LOGIN")" == "$(jq -r '.restaurant.id' <<<"$REGISTRATION")" ]] || { printf '✗ Staff login sai tenant\n' >&2; exit 1; }
printf '✓ Owner va staff login dung tenant moi\n'

CATEGORIES="$(curl -fsS "$API_BASE_URL/admin/categories" -H "Authorization: Bearer $OWNER_TOKEN")"
ITEMS="$(curl -fsS "$API_BASE_URL/admin/items" -H "Authorization: Bearer $OWNER_TOKEN")"
TABLES="$(curl -fsS "$API_BASE_URL/admin/tables" -H "Authorization: Bearer $OWNER_TOKEN")"
[[ "$(jq 'length' <<<"$CATEGORIES")" == '2' && "$(jq 'length' <<<"$ITEMS")" == '3' && "$(jq '.tables | length' <<<"$TABLES")" == '4' ]] || { printf '✗ Du lieu mau onboarding khong day du\n' >&2; exit 1; }
printf '✓ Tao menu va ban mau trong transaction onboarding\n'

DUPLICATE_STATUS="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -X POST "$API_BASE_URL/public/owner-registration" -H 'Content-Type: application/json' --data "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" --arg pin "$PIN" '{restaurantName: "Quán Trùng", ownerDisplayName: "Chị Mai", email: $email, password: $password, staffPin: $pin}')")"
assert_status "$DUPLICATE_STATUS" 409 'Email trung bi tu choi'
[[ "$(jq -r '.error.code' "$RESPONSE_FILE")" == 'EMAIL_ALREADY_IN_USE' ]] || { printf '✗ Sai ma loi email trung\n' >&2; exit 1; }

KIM_SESSION="$(curl -fsS "$API_BASE_URL/guest/tables/qr-ban-01-a7f3k9m2xp" | jq -er '.session.id')"
CROSS_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $OWNER_TOKEN" "$API_BASE_URL/staff/sessions/$KIM_SESSION")"
assert_status "$CROSS_STATUS" 404 'Owner moi khong doc duoc session tenant Kim Thanh'

printf '\nHoan tat: owner registration/onboarding da PASS.\n'
