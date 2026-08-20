#!/usr/bin/env bash

# Nghiem thu van hanh billing (`SA-12`): huy/bat lai gia han, webhook sandbox,
# replay webhook do dang, doi soat thu cong co audit, tam ngung/mo lai.
# Chay tren mot quán moi dang ky nen khong lam ban fixture Kim Thanh/Huong Que.
#
# Chay sau: docker compose -f tableqr-api/docker-compose.yml up -d --build api
# Endpoint dang ky co rate limit 3 lan/gio; restart API neu can lap lai nhieu lan.

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"
COMPOSE_FILE="${COMPOSE_FILE:-tableqr-api/docker-compose.yml}"
DATABASE_ADMIN_URL="${DATABASE_ADMIN_URL:-postgresql://tableqr:tableqr@localhost:5433/tableqr?schema=public}"
OPS_DATABASE_URL="${OPS_DATABASE_URL:-postgresql://tableqr:tableqr@db:5432/tableqr?schema=public}"
SEPAY_WEBHOOK_SECRET="${SEPAY_WEBHOOK_SECRET:-$(grep -E '^SEPAY_WEBHOOK_SECRET=' tableqr-api/.env | cut -d= -f2-)}"

for command in curl jq docker openssl; do
  command -v "$command" >/dev/null || { printf 'Thieu lenh bat buoc: %s\n' "$command" >&2; exit 1; }
done
[[ -n "$SEPAY_WEBHOOK_SECRET" ]] || { printf 'Thieu SEPAY_WEBHOOK_SECRET (tableqr-api/.env).\n' >&2; exit 1; }

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

fail() { printf '✗ %s\n' "$1" >&2; exit 1; }
pass() { printf '✓ %s\n' "$1"; }
call() { curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' "$@"; }

assert_status() {
  local actual="$1" expected="$2" description="$3"
  [[ "$actual" == "$expected" ]] || fail "$description (can $expected, nhan $actual: $(head -c 200 "$RESPONSE_FILE"))"
  pass "$description"
}

assert_equal() {
  local actual="$1" expected="$2" description="$3"
  [[ "$actual" == "$expected" ]] || fail "$description (can '$expected', nhan '$actual')"
  pass "$description"
}

db_query() {
  local query="$1"
  if command -v psql >/dev/null; then psql -qAt "$DATABASE_ADMIN_URL" -c "$query"; return; fi
  docker compose -f "$COMPOSE_FILE" exec -T db psql -qAt -U tableqr -d tableqr -c "$query"
}

# Ops CLI chay bang ket noi cua nguoi van hanh, khong dung role runtime cua API.
ops() {
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps -T \
    -e DATABASE_URL="$OPS_DATABASE_URL" api node dist/ops/billing-ops.cli.js "$@" --json
}

# SePay ky HMAC-SHA256 tren `{timestamp}.{raw_body}` — giong het webhook that.
send_webhook() {
  local body="$1" timestamp signature
  timestamp="$(date +%s)"
  signature="sha256=$(printf '%s.%s' "$timestamp" "$body" | openssl dgst -sha256 -hmac "$SEPAY_WEBHOOK_SECRET" -hex | awk '{print $NF}')"
  call -X POST "$API_BASE_URL/payments/webhooks/sepay" -H 'Content-Type: application/json' \
    -H "X-Sepay-Timestamp: $timestamp" -H "X-Sepay-Signature: $signature" --data "$body"
}

billing() { curl -fsS "$API_BASE_URL/admin/billing" -H "Authorization: Bearer $OWNER_TOKEN"; }
new_intent() { curl -fsS -X POST "$API_BASE_URL/admin/billing/payment-intents" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data '{"provider":"sepay"}'; }
cycle_count() { db_query "SELECT count(*) FROM subscription_cycle WHERE restaurant_id = '$RESTAURANT_ID';"; }
audit_count() { db_query "SELECT count(*) FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = '$1';"; }

printf 'Kiem van hanh billing tai %s\n\n' "$API_BASE_URL"

# --- Quán thu nghiem rieng ----------------------------------------------------
EMAIL="owner.billingops.$(date +%s).$RANDOM@example.test"
PASSWORD='mat-khau-2026'
PIN='123456'
REGISTRATION="$(curl -fsS -X POST "$API_BASE_URL/public/owner-registration" -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" --arg pin "$PIN" '{restaurantName: "Quán Ops Test", ownerDisplayName: "Chị Vận Hành", email: $email, password: $password, staffPin: $pin}')")"
OWNER_TOKEN="$(jq -er '.token' <<<"$REGISTRATION")"
RESTAURANT_ID="$(jq -er '.restaurant.id' <<<"$REGISTRATION")"
QR_TOKEN="$(curl -fsS "$API_BASE_URL/admin/tables" -H "Authorization: Bearer $OWNER_TOKEN" | jq -er '.tables[0].qrUrl' | sed 's#.*/t/##')"
BOOTSTRAP="$(curl -fsS "$API_BASE_URL/guest/tables/$QR_TOKEN")"
SESSION_ID="$(jq -er '.session.id' <<<"$BOOTSTRAP")"
GUEST_ACCESS="$(jq -er '.guestAccessToken' <<<"$BOOTSTRAP")"
ITEM_ID="$(jq -er '.items[0].id' <<<"$BOOTSTRAP")"
pass "Tao quán thu nghiem rieng ($RESTAURANT_ID)"

guest_order() {
  call -X POST "$API_BASE_URL/guest/sessions/$SESSION_ID/orders" -H 'Content-Type: application/json' \
    -H "X-Guest-Access: $GUEST_ACCESS" -H "X-Request-Id: ops-$RANDOM-$RANDOM" \
    --data "$(jq -nc --arg item "$ITEM_ID" '{items: [{menuItemId: $item, quantity: 1}]}')"
}

printf '\n[1] Ops CLI phai tu choi role runtime cua API\n'
RUNTIME_URL='postgresql://tableqr:tableqr@db:5432/tableqr?schema=public&options=-c%20role=tableqr_app'
if docker compose -f "$COMPOSE_FILE" run --rm --no-deps -T -e DATABASE_URL="$RUNTIME_URL" api \
    node dist/ops/billing-ops.cli.js attention --json >/dev/null 2>&1; then
  fail 'Ops CLI khong duoc chay bang role tableqr_app'
fi
pass 'Ops CLI tu choi khi nguoi van hanh nham role runtime'

printf '\n[2] Huy gia han va bat lai\n'
SUMMARY="$(billing)"
assert_equal "$(jq -r '.subscription.cancelAtPeriodEnd' <<<"$SUMMARY")" 'false' 'Quán moi khong o trang thai da huy'
assert_equal "$(jq -r '.subscription.serviceEndsAt' <<<"$SUMMARY")" "$(jq -r '.subscription.trialEndsAt' <<<"$SUMMARY")" 'Dang dung thu thi moc dung dich vu la het trial'

assert_status "$(call -X POST "$API_BASE_URL/admin/billing/cancel" -H "Authorization: Bearer $OWNER_TOKEN")" 200 'Chu quán huy duoc gia han'
SUMMARY="$(jq -c '.' "$RESPONSE_FILE")"
assert_equal "$(jq -r '.subscription.cancelAtPeriodEnd' <<<"$SUMMARY")" 'true' 'Huy xong tra ve co cancelAtPeriodEnd'
[[ "$(jq -r '.subscription.canceledAt' <<<"$SUMMARY")" != 'null' ]] || fail 'Thieu moc canceledAt'
pass 'Huy co ghi moc thoi gian'
assert_equal "$(audit_count CANCELED)" '1' 'Audit CANCELED ghi dung mot lan'
assert_equal "$(db_query "SELECT actor FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'CANCELED';" | cut -d: -f1)" 'owner' 'Audit CANCELED ghi ro nguoi thao tac'

assert_status "$(call -X POST "$API_BASE_URL/admin/billing/payment-intents" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data '{"provider":"sepay"}')" 409 'Da huy thi khong tao duoc huong dan thanh toan'
assert_equal "$(jq -r '.error.code' "$RESPONSE_FILE")" 'SUBSCRIPTION_CANCELED' 'Tra dung ma loi khi da huy'
assert_equal "$(jq -r '.error.message' "$RESPONSE_FILE")" 'Bạn đã yêu cầu ngừng gia hạn. Hãy bật lại dịch vụ trước khi thanh toán.' 'Tra dung copy khi da huy'
assert_status "$(guest_order)" 201 'Huy gia han khong cat dich vu dang chay'

assert_status "$(call -X POST "$API_BASE_URL/admin/billing/reactivate" -H "Authorization: Bearer $OWNER_TOKEN")" 200 'Chu quán bat lai duoc dich vu'
assert_equal "$(jq -r '.subscription.cancelAtPeriodEnd' "$RESPONSE_FILE")" 'false' 'Bat lai xoa co huy'
assert_equal "$(jq -r '.subscription.canceledAt' "$RESPONSE_FILE")" 'null' 'Bat lai xoa moc huy'
assert_equal "$(audit_count REACTIVATED)" '1' 'Audit REACTIVATED ghi dung mot lan'

printf '\n[3] Webhook sandbox: tien vao dung mo ta\n'
INTENT="$(new_intent)"
PAYMENT_CODE="$(jq -er '.instruction.paymentCode' <<<"$INTENT")"
AMOUNT="$(jq -er '.instruction.amountVnd' <<<"$INTENT")"
EVENT_ID="$(date +%s)$RANDOM"
CYCLES_BEFORE="$(cycle_count)"
assert_status "$(send_webhook "$(jq -nc --arg id "$EVENT_ID" --arg code "$PAYMENT_CODE" --argjson amount "$AMOUNT" '{id: $id, code: $code, transferAmount: $amount, transferType: "in"}')")" 200 'Webhook hop le duoc chap nhan'
assert_equal "$(jq -r '.duplicate' "$RESPONSE_FILE")" 'false' 'Lan dau khong bi coi la trung'
assert_equal "$(db_query "SELECT status FROM payment WHERE payment_code = '$PAYMENT_CODE';")" 'SUCCEEDED' 'Thanh toan chuyen sang SUCCEEDED'
assert_equal "$(db_query "SELECT c.status FROM subscription_cycle c JOIN payment p ON p.subscription_cycle_id = c.id WHERE p.payment_code = '$PAYMENT_CODE';")" 'PAID' 'Ky thanh toan chuyen sang PAID'

printf '\n[4] Replay webhook da xu ly la no-op\n'
REPLAY="$(ops replay --provider sepay --event-id "$EVENT_ID")"
assert_equal "$(jq -r '.reason' <<<"$REPLAY")" 'duplicate' 'Replay su kien da xu ly bao trung'
assert_equal "$(jq -r '.settled' <<<"$REPLAY")" 'false' 'Replay khong ghi nhan tien lan hai'
assert_equal "$(cycle_count)" "$CYCLES_BEFORE" 'Replay khong tao them ky thanh toan'

printf '\n[5] Replay webhook do dang van settle duoc\n'
# Mo phong tien trinh chet ngay sau khi ghi audit: tien da vao, quán van dong.
INTENT="$(new_intent)"
PAYMENT_CODE="$(jq -er '.instruction.paymentCode' <<<"$INTENT")"
AMOUNT="$(jq -er '.instruction.amountVnd' <<<"$INTENT")"
STUCK_EVENT_ID="stuck-$(date +%s)$RANDOM"
CYCLES_BEFORE="$(cycle_count)"
db_query "INSERT INTO payment_webhook_event (restaurant_id, provider, provider_event_id, payload, processed_at)
  VALUES ('$RESTAURANT_ID', 'sepay', '$STUCK_EVENT_ID', '$(jq -nc --arg id "$STUCK_EVENT_ID" --arg code "$PAYMENT_CODE" --argjson amount "$AMOUNT" '{id: $id, code: $code, transferAmount: $amount, transferType: "in"}')'::jsonb, NULL);" >/dev/null
REPLAY="$(ops replay --provider sepay --event-id "$STUCK_EVENT_ID")"
assert_equal "$(jq -r '.settled' <<<"$REPLAY")" 'true' 'Replay chay tiep su kien do dang'
assert_equal "$(db_query "SELECT status FROM payment WHERE payment_code = '$PAYMENT_CODE';")" 'SUCCEEDED' 'Su kien do dang duoc settle dung thanh toan'
assert_equal "$(db_query "SELECT count(*) FROM payment_webhook_event WHERE provider_event_id = '$STUCK_EVENT_ID' AND processed_at IS NOT NULL;")" '1' 'Su kien do dang duoc danh dau da xu ly'
assert_equal "$(jq -r '.reason' <<<"$(ops replay --provider sepay --event-id "$STUCK_EVENT_ID")")" 'duplicate' 'Replay lan hai lai la no-op'
assert_equal "$(cycle_count)" "$CYCLES_BEFORE" 'Replay do dang khong tao them ky thanh toan'

printf '\n[6] Doi soat thu cong khi webhook khong toi\n'
INTENT="$(new_intent)"
PAYMENT_CODE="$(jq -er '.instruction.paymentCode' <<<"$INTENT")"
AMOUNT="$(jq -er '.instruction.amountVnd' <<<"$INTENT")"
MISMATCH="$(ops reconcile --payment-code "$PAYMENT_CODE" --amount "$((AMOUNT - 1))" --reference "ref-sai-$RANDOM" --operator 'ho-tro:mai')"
assert_equal "$(jq -r '.reason' <<<"$MISMATCH")" 'amount_mismatch' 'Sai so tien thi tu choi ghi nhan'
assert_equal "$(db_query "SELECT status FROM payment WHERE payment_code = '$PAYMENT_CODE';")" 'PENDING' 'Sai so tien khong doi trang thai thanh toan'
assert_equal "$(audit_count MANUAL_RECONCILED)" '0' 'Sai so tien khong ghi audit doi soat'

BANK_REF="ref-$(date +%s)$RANDOM"
RECONCILE="$(ops reconcile --payment-code "$PAYMENT_CODE" --amount "$AMOUNT" --reference "$BANK_REF" --operator 'ho-tro:mai' --note 'khach chuyen khoan sai noi dung')"
assert_equal "$(jq -r '.settled' <<<"$RECONCILE")" 'true' 'Doi soat dung so tien ghi nhan duoc'
assert_equal "$(db_query "SELECT status FROM payment WHERE payment_code = '$PAYMENT_CODE';")" 'SUCCEEDED' 'Doi soat thu cong settle dung thanh toan'
assert_equal "$(audit_count MANUAL_RECONCILED)" '1' 'Doi soat thu cong co audit'
assert_equal "$(db_query "SELECT actor FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'MANUAL_RECONCILED';")" 'ho-tro:mai' 'Audit doi soat ghi ro nguoi thao tac'
[[ "$(db_query "SELECT note FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'MANUAL_RECONCILED';")" == *"$BANK_REF"* ]] || fail 'Audit doi soat thieu ma giao dich ngan hang'
pass 'Audit doi soat luu ma giao dich ngan hang'

CYCLES_BEFORE="$(cycle_count)"
REPEAT="$(ops reconcile --payment-code "$PAYMENT_CODE" --amount "$AMOUNT" --reference "$BANK_REF" --operator 'ho-tro:mai')"
assert_equal "$(jq -r '.reason' <<<"$REPEAT")" 'duplicate' 'Doi soat lai cung ma giao dich la no-op'
assert_equal "$(cycle_count)" "$CYCLES_BEFORE" 'Doi soat trung khong tao them ky thanh toan'
assert_equal "$(audit_count MANUAL_RECONCILED)" '1' 'Doi soat trung khong ghi them audit'

printf '\n[7] Tam ngung va mo lai bang ho tro\n'
ops suspend --restaurant "$RESTAURANT_ID" --operator 'ho-tro:mai' --reason 'nghi ngo gian lan' >/dev/null
assert_equal "$(db_query "SELECT status FROM subscription WHERE restaurant_id = '$RESTAURANT_ID';")" 'SUSPENDED' 'Ho tro tam ngung duoc quán'
assert_status "$(guest_order)" 403 'Quán tam ngung thi khach khong gui duoc don'
assert_equal "$(audit_count SUSPENDED)" '1' 'Audit SUSPENDED ghi dung mot lan'
assert_equal "$(db_query "SELECT note FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'SUSPENDED';")" 'nghi ngo gian lan' 'Audit SUSPENDED ghi ro ly do'
# Duong thoat cua chu quán khong duoc khoa theo trang thai: huy/bat lai la
# `admin-account-write`, phai chay duoc ca khi quán da bi tam ngung.
assert_status "$(call -X POST "$API_BASE_URL/admin/billing/cancel" -H "Authorization: Bearer $OWNER_TOKEN")" 200 'Quán tam ngung: chu quán van huy duoc gia han'
assert_status "$(call -X POST "$API_BASE_URL/admin/billing/reactivate" -H "Authorization: Bearer $OWNER_TOKEN")" 200 'Quán tam ngung: chu quán van bat lai duoc gia han'

UNSUSPEND="$(ops unsuspend --restaurant "$RESTAURANT_ID" --operator 'ho-tro:mai' --reason 'da xac minh chu quán')"
[[ "$(jq -r '.status' <<<"$UNSUSPEND")" == 'GRACE' || "$(jq -r '.status' <<<"$UNSUSPEND")" == 'ACTIVE' ]] || fail "Mo lai phai ve GRACE hoac ACTIVE (nhan $(jq -r '.status' <<<"$UNSUSPEND"))"
pass "Ho tro mo lai quán, trang thai $(jq -r '.status' <<<"$UNSUSPEND")"
assert_status "$(guest_order)" 201 'Mo lai xong khach gui don binh thuong'
assert_equal "$(audit_count UNSUSPENDED)" '1' 'Audit UNSUSPENDED ghi dung mot lan'

printf '\n[8] Bang theo doi cho ho tro\n'
ATTENTION="$(ops attention)"
jq -e --arg id "$RESTAURANT_ID" 'any(.subscriptions[]; .restaurantId == $id)' <<<"$ATTENTION" >/dev/null \
  || fail 'Bang theo doi thieu quán vua mo lai'
pass 'Bang theo doi liet ke duoc quán can chu y'
STATUS_JSON="$(ops status --restaurant "$RESTAURANT_ID")"
assert_equal "$(jq -r '.restaurant.id' <<<"$STATUS_JSON")" "$RESTAURANT_ID" 'Ho so mot quán tra dung tenant'
jq -e 'any(.subscription.events[]; .type == "MANUAL_RECONCILED" and .actor != null)' <<<"$STATUS_JSON" >/dev/null \
  || fail 'Ho so quán thieu audit doi soat thu cong'
pass 'Ho so quán hien du audit de tra loi ho tro'

printf '\nHoan tat: van hanh billing (`SA-12`) da PASS.\n'
