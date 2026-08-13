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

printf '\nHoan tat: tenant isolation va guest capability da PASS.\n'
