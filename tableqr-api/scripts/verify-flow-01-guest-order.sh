#!/usr/bin/env bash

# Kiem tra luong API bang curl: mo phien -> gui don/gọi them -> goi nhan vien
# -> bep xu ly -> thanh toan -> reset ban -> quet lai nhan phien sach.
#
# Chay sau khi da khoi dong Compose:
#   bash tableqr-api/scripts/verify-flow-01-guest-order.sh
#
# Mac dinh dung ban B01 cua fixture. Script dong phien B01 cu truoc khi chay
# nen co the lap lai; co the doi API_BASE_URL, QR_TOKEN va STAFF_PIN qua env.

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"
QR_TOKEN="${QR_TOKEN:-qr-ban-01-a7f3k9m2xp}"
STAFF_PIN="${STAFF_PIN:-246810}"
RESPONSE_FILE="$(mktemp)"

cleanup() {
  rm -f "$RESPONSE_FILE"
}
trap cleanup EXIT

for command in curl jq; do
  command -v "$command" >/dev/null || {
    printf 'Thieu lenh bat buoc: %s\n' "$command" >&2
    exit 1
  }
done

new_request_id() {
  if command -v uuidgen >/dev/null; then
    uuidgen
  else
    printf 'verify-%s-%s\n' "$(date +%s)" "$$"
  fi
}

fail() {
  printf '✗ %s\n' "$1" >&2
  if [[ -s "$RESPONSE_FILE" ]]; then
    printf 'Response:\n' >&2
    jq . "$RESPONSE_FILE" >&2 || cat "$RESPONSE_FILE" >&2
  fi
  exit 1
}

api() {
  local method="$1"
  local path="$2"
  local expected_status="$3"
  local request_body="$4"
  shift 4

  local -a args=(
    -sS --connect-timeout 5 --max-time 20
    -o "$RESPONSE_FILE" -w '%{http_code}' -X "$method"
    -H 'Accept: application/json'
  )
  if [[ -n "$request_body" ]]; then
    args+=(-H 'Content-Type: application/json' --data "$request_body")
  fi
  for header in "$@"; do
    args+=(-H "$header")
  done
  args+=("$API_BASE_URL$path")

  local status
  status="$(curl "${args[@]}")" || fail "Khong goi duoc $method $path. API da chay chua?"
  [[ "$status" == "$expected_status" ]] || fail "$method $path: can HTTP $expected_status, nhan $status"
  jq -e . "$RESPONSE_FILE" >/dev/null || fail "$method $path khong tra JSON hop le"
}

assert_jq() {
  jq -e "$1" "$RESPONSE_FILE" >/dev/null || fail "$2"
}

value() {
  jq -er "$1" "$RESPONSE_FILE"
}

step() {
  printf '✓ %s\n' "$1"
}

printf 'Kiem tra flow API tai %s (QR %s)\n' "$API_BASE_URL" "$QR_TOKEN"

api POST '/staff/auth/login' 200 "$(jq -nc --arg pin "$STAFF_PIN" '{pin: $pin}')"
STAFF_AUTH="Authorization: Bearer $(value '.token')"
step 'Dang nhap nhan vien'

# Dọn riêng bàn test, kể cả khi lần chạy trước bị dừng trước Reset bàn.
GUEST_HEADER="X-Guest-Token: $(new_request_id)"
api GET "/guest/tables/$QR_TOKEN" 200 '' "$GUEST_HEADER"
STALE_SESSION_ID="$(value '.session.id')"
api POST "/staff/sessions/$STALE_SESSION_ID/pay" 200 '' "$STAFF_AUTH"
api POST "/staff/sessions/$STALE_SESSION_ID/close" 200 '' "$STAFF_AUTH"
step 'Dat ban test ve trang thai trong'

api GET "/guest/tables/$QR_TOKEN" 200 '' "$GUEST_HEADER"
SESSION_ID="$(value '.session.id')"
MENU_ITEM_ONE="$(value '.items[] | select(.isAvailable == true) | .id' | head -n 1)"
MENU_ITEM_TWO="$(value '.items[] | select(.isAvailable == true) | .id' | sed -n '2p')"
[[ -n "$MENU_ITEM_ONE" && -n "$MENU_ITEM_TWO" ]] || fail 'Fixture can it nhat hai mon dang con hang.'
step 'Quet QR va mo phien moi'

ORDER_ONE_REQUEST_ID="$(new_request_id)"
ORDER_ONE_BODY="$(jq -nc --arg item "$MENU_ITEM_ONE" '{note: "Don dau tien", items: [{menuItemId: $item, quantity: 2, note: "it da"}]}')"
api POST "/guest/sessions/$SESSION_ID/orders" 201 "$ORDER_ONE_BODY" "$GUEST_HEADER" "X-Request-Id: $ORDER_ONE_REQUEST_ID"
ORDER_ONE_ID="$(value '.id')"
ORDER_ONE_TOTAL="$(value '.totalVnd')"
assert_jq '.sequenceNo == 1 and .status == "NEW" and (.items | length == 1)' 'Don dau tien phai la NEW, sequenceNo 1 va co mot dong mon.'
step 'Gui don dau tien'

api POST "/guest/sessions/$SESSION_ID/orders" 200 "$ORDER_ONE_BODY" "$GUEST_HEADER" "X-Request-Id: $ORDER_ONE_REQUEST_ID"
assert_jq ".id == \"$ORDER_ONE_ID\" and .sequenceNo == 1" 'Gui lai cung request ID phai tra ve dung don cu.'
step 'Kiem tra idempotency cua gui don'

ORDER_TWO_BODY="$(jq -nc --arg item "$MENU_ITEM_TWO" '{note: "Goi them", items: [{menuItemId: $item, quantity: 1, note: null}]}')"
api POST "/guest/sessions/$SESSION_ID/orders" 201 "$ORDER_TWO_BODY" "$GUEST_HEADER" "X-Request-Id: $(new_request_id)"
ORDER_TWO_ID="$(value '.id')"
ORDER_TWO_TOTAL="$(value '.totalVnd')"
assert_jq '.sequenceNo == 2 and .status == "NEW"' 'Don goi them phai co sequenceNo 2 va trang thai NEW.'
step 'Goi them mon'

api POST "/guest/sessions/$SESSION_ID/calls" 201 "$(jq -nc '{type: "CALL_STAFF"}')" "$GUEST_HEADER"
CALL_ID="$(value '.id')"
assert_jq '.type == "CALL_STAFF" and .status == "PENDING"' 'Yeu cau goi nhan vien phai o trang thai PENDING.'
api GET '/staff/calls?status=PENDING' 200 '' "$STAFF_AUTH"
assert_jq ".calls | any(.id == \"$CALL_ID\" and .status == \"PENDING\")" 'Nhan vien phai thay yeu cau goi ban.'
api PATCH "/staff/calls/$CALL_ID" 200 "$(jq -nc '{status: "DONE"}')" "$STAFF_AUTH"
assert_jq '.status == "DONE"' 'Nhan vien phai danh dau duoc yeu cau da xu ly.'
step 'Goi nhan vien va xu ly yeu cau'

for order_id in "$ORDER_ONE_ID" "$ORDER_TWO_ID"; do
  api PATCH "/staff/orders/$order_id/status" 200 "$(jq -nc '{status: "PREPARING"}')" "$STAFF_AUTH"
  assert_jq '.status == "PREPARING"' 'Bep phai chuyen don sang PREPARING.'
  api PATCH "/staff/orders/$order_id/status" 200 "$(jq -nc '{status: "SERVED"}')" "$STAFF_AUTH"
  assert_jq '.status == "SERVED"' 'Bep phai chuyen don sang SERVED.'
done
step 'Bep chuyen trang thai hai don'

EXPECTED_TOTAL=$((ORDER_ONE_TOTAL + ORDER_TWO_TOTAL))
api GET "/guest/sessions/$SESSION_ID/orders" 200 '' "$GUEST_HEADER"
assert_jq ".session.totalVnd == $EXPECTED_TOTAL and (.orders | length == 2)" 'Tong phien hoac so don khong dung sau khi goi them.'

api POST "/staff/sessions/$SESSION_ID/pay" 200 '' "$STAFF_AUTH"
assert_jq '.id != null and .paidAt != null' 'Thanh toan phai luu paidAt.'
api POST "/staff/sessions/$SESSION_ID/close" 200 '' "$STAFF_AUTH"
assert_jq '.status == "CLOSED" and .closedAt != null' 'Reset ban phai dong phien va luu closedAt.'
step 'Thanh toan va reset ban'

api GET "/guest/sessions/$SESSION_ID/orders" 409 '' "$GUEST_HEADER"
assert_jq '.error.code == "SESSION_CLOSED"' 'Phien cu sau reset phai bi bao SESSION_CLOSED.'

api GET "/guest/tables/$QR_TOKEN" 200 '' "$GUEST_HEADER"
NEW_SESSION_ID="$(value '.session.id')"
[[ "$NEW_SESSION_ID" != "$SESSION_ID" ]] || fail 'Quet lai phai mo mot phien moi.'
api GET "/guest/sessions/$NEW_SESSION_ID/orders" 200 '' "$GUEST_HEADER"
assert_jq '.session.status == "OPEN" and .session.totalVnd == 0 and (.orders | length == 0)' 'Quet lai phai nhan mot phien OPEN khong co don va tong 0.'
step 'Quet lai nhan phien sach'

printf '\nHoan tat: toan bo flow guest -> staff -> thanh toan -> reset da PASS.\n'
