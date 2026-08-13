#!/usr/bin/env bash

# Xac nhan JWT dang nhap khong con nam tren URL SSE. EventSource chi nhan
# stream_ticket 60 giay, va ticket nay khong dung duoc cho REST thong thuong.

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"

for command in curl jq; do
  command -v "$command" >/dev/null || {
    printf 'Thieu lenh bat buoc: %s\n' "$command" >&2
    exit 1
  }
done

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

status() {
  curl -sS --connect-timeout 5 --max-time 5 -o /dev/null -w '%{http_code}' "$@"
}

LOGIN="$(curl -fsS -X POST "$API_BASE_URL/staff/auth/login" -H 'Content-Type: application/json' --data '{"staffLoginCode":"KIM-4821","pin":"246810"}')"
ACCESS_TOKEN="$(jq -er '.token' <<<"$LOGIN")"
TICKET_RESPONSE="$(curl -fsS -X POST "$API_BASE_URL/staff/stream-ticket" -H "Authorization: Bearer $ACCESS_TOKEN")"
STREAM_TICKET="$(jq -er '.ticket' <<<"$TICKET_RESPONSE")"

[[ "$(jq -er '.expiresInSeconds' <<<"$TICKET_RESPONSE")" == '60' ]] || {
  printf '✗ Stream ticket phai co TTL 60 giay\n' >&2
  exit 1
}
printf '✓ Staff REST token doi duoc stream ticket 60 giay\n'

assert_status "$(status "$API_BASE_URL/staff/stream?access_token=$ACCESS_TOKEN")" 401 'JWT dang nhap tren query SSE bi tu choi'
assert_status "$(status -H "Authorization: Bearer $STREAM_TICKET" "$API_BASE_URL/staff/orders")" 401 'Stream ticket khong dung duoc cho REST'

# Ket noi SSE co chu y giu trong 1 giay; curl timeout sau khi HTTP 200 la binh thuong.
SSE_STATUS="$(curl -sS --connect-timeout 5 --max-time 1 -o /dev/null -w '%{http_code}' "$API_BASE_URL/staff/stream?stream_ticket=$STREAM_TICKET" || true)"
assert_status "$SSE_STATUS" 200 'SSE chap nhan stream ticket hop le'

printf '\nHoan tat: SSE chi dung ticket ngan han, khong lo access token tren URL.\n'
