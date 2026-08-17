#!/usr/bin/env bash

# Kiem matrix quyen theo trang thai thue bao (`SA-11`): TRIAL, ACTIVE, GRACE,
# PAST_DUE, SUSPENDED cho ca guest, staff va owner. Chay tren mot quán moi dang ky
# nen khong lam ban fixture Kim Thanh/Huong Que.
#
# Chay sau: pnpm dev:local-domains (hoac docker compose up -d api)
# Endpoint dang ky co rate limit 3 lan/gio; restart API neu can lap lai nhieu lan.

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api/v1}"
API_BASE_URL="${API_BASE_URL%/}"
DATABASE_ADMIN_URL="${DATABASE_ADMIN_URL:-postgresql://tableqr:tableqr@localhost:5433/tableqr?schema=public}"

for command in curl jq; do
  command -v "$command" >/dev/null || { printf 'Thieu lenh bat buoc: %s\n' "$command" >&2; exit 1; }
done

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

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

fail() { printf '✗ %s\n' "$1" >&2; exit 1; }
pass() { printf '✓ %s\n' "$1"; }

assert_status() {
  local actual="$1" expected="$2" description="$3"
  [[ "$actual" == "$expected" ]] || fail "$description (can $expected, nhan $actual: $(head -c 200 "$RESPONSE_FILE"))"
  pass "$description"
}

# Goi nhan vien la idempotent theo yeu cau dang PENDING: 201 lan dau, 200 lan sau.
assert_created_or_reused() {
  local actual="$1" description="$2"
  [[ "$actual" == '201' || "$actual" == '200' ]] || fail "$description (can 200/201, nhan $actual: $(head -c 200 "$RESPONSE_FILE"))"
  pass "$description"
}

# Moi lan goi ghi lai body vao RESPONSE_FILE de kiem ma loi va copy.
call() {
  curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' "$@"
}

assert_inactive_body() {
  local expected_message="$1" description="$2"
  [[ "$(jq -r '.error.code' "$RESPONSE_FILE")" == 'RESTAURANT_INACTIVE' ]] || fail "$description: sai ma loi ($(jq -r '.error.code' "$RESPONSE_FILE"))"
  [[ "$(jq -r '.error.message' "$RESPONSE_FILE")" == "$expected_message" ]] || fail "$description: sai copy ($(jq -r '.error.message' "$RESPONSE_FILE"))"
  pass "$description"
}

GUEST_COPY='Quán đang tạm ngưng nhận đơn. Vui lòng gọi nhân viên hỗ trợ.'
STAFF_COPY='Quán đã hết thời gian gia hạn. Vui lòng báo chủ quán thanh toán để tiếp tục nhận đơn.'
OWNER_COPY='Dịch vụ đang tạm ngưng. Hãy thanh toán để tiếp tục quản lý quán.'
OWNER_SUSPENDED_COPY='Tài khoản quán đang tạm ngưng. Vui lòng liên hệ hỗ trợ.'

printf 'Kiem entitlement enforcement tai %s\n\n' "$API_BASE_URL"

# --- Moi route ghi phai khai bao @BillingAction -------------------------------
# Guard mac dinh tu choi nen route quen khai bao se 500 ngay; check nay bat loi
# som hon, ngay o buoc doc code.
for controller in tableqr-api/src/**/*.controller.ts; do
  grep -qE '@(Post|Patch|Put|Delete)\(' "$controller" || continue
  grep -q '@BillingAction(' "$controller" || fail "Controller thieu @BillingAction: $controller"
done
pass 'Moi controller co route ghi deu khai bao @BillingAction'

# --- Tenant sach de thu nghiem ------------------------------------------------
EMAIL="owner.entitlement.$(date +%s).$RANDOM@example.test"
PASSWORD='mat-khau-2026'
PIN='123456'
REGISTRATION="$(curl -fsS -X POST "$API_BASE_URL/public/owner-registration" -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" --arg pin "$PIN" '{restaurantName: "Quán Entitlement Test", ownerDisplayName: "Anh Phúc", email: $email, password: $password, staffPin: $pin}')")"
OWNER_TOKEN="$(jq -er '.token' <<<"$REGISTRATION")"
RESTAURANT_ID="$(jq -er '.restaurant.id' <<<"$REGISTRATION")"
STAFF_CODE="$(jq -er '.restaurant.staffLoginCode' <<<"$REGISTRATION")"
STAFF_TOKEN="$(curl -fsS -X POST "$API_BASE_URL/staff/auth/login" -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg code "$STAFF_CODE" --arg pin "$PIN" '{staffLoginCode: $code, pin: $pin}')" | jq -er '.token')"
QR_TOKEN="$(curl -fsS "$API_BASE_URL/admin/tables" -H "Authorization: Bearer $OWNER_TOKEN" | jq -er '.tables[0].qrUrl' | sed 's#.*/t/##')"
BOOTSTRAP="$(curl -fsS "$API_BASE_URL/guest/tables/$QR_TOKEN")"
SESSION_ID="$(jq -er '.session.id' <<<"$BOOTSTRAP")"
GUEST_ACCESS="$(jq -er '.guestAccessToken' <<<"$BOOTSTRAP")"
ITEM_ID="$(jq -er '.items[0].id' <<<"$BOOTSTRAP")"
pass "Tao quán thu nghiem rieng ($RESTAURANT_ID)"

set_state() {
  local status="$1" trial="$2" grace="$3" period_start="$4" period_end="$5"
  db_query "UPDATE subscription SET status = '$status', trial_ends_at = $trial, grace_ends_at = $grace, current_period_starts_at = $period_start, current_period_ends_at = $period_end WHERE restaurant_id = '$RESTAURANT_ID';" >/dev/null
  db_query "UPDATE restaurant SET billing_status = '$status' WHERE id = '$RESTAURANT_ID';" >/dev/null
}

guest_order() {
  call -X POST "$API_BASE_URL/guest/sessions/$SESSION_ID/orders" -H 'Content-Type: application/json' \
    -H "X-Guest-Access: $GUEST_ACCESS" -H "X-Request-Id: entitlement-$RANDOM-$RANDOM" \
    --data "$(jq -nc --arg item "$ITEM_ID" '{items: [{menuItemId: $item, quantity: 1}]}')"
}

LAST_ORDER_ID=''

# --- Cac trang thai con quyen ghi day du -------------------------------------
check_allowed_state() {
  local label="$1"
  assert_status "$(guest_order)" 201 "$label: khach gui duoc don"
  LAST_ORDER_ID="$(jq -er '.id' "$RESPONSE_FILE")"
  assert_status "$(call -H "X-Guest-Access: $GUEST_ACCESS" "$API_BASE_URL/guest/sessions/$SESSION_ID/orders")" 200 "$label: khach xem duoc don"
  assert_created_or_reused "$(call -X POST "$API_BASE_URL/guest/sessions/$SESSION_ID/calls" -H 'Content-Type: application/json' -H "X-Guest-Access: $GUEST_ACCESS" --data '{"type":"CALL_STAFF"}')" "$label: khach goi duoc nhan vien"
  assert_status "$(call -X PATCH "$API_BASE_URL/staff/orders/$LAST_ORDER_ID/status" -H 'Content-Type: application/json' -H "Authorization: Bearer $STAFF_TOKEN" --data '{"status":"PREPARING"}')" 200 "$label: bep chuyen duoc trang thai don"
  assert_status "$(call -X POST "$API_BASE_URL/staff/sessions/$SESSION_ID/pay" -H "Authorization: Bearer $STAFF_TOKEN")" 200 "$label: nhan vien tinh duoc tien"
  assert_status "$(call -X PATCH "$API_BASE_URL/admin/restaurant" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data "$(jq -nc --arg name "Quán Entitlement $label" '{name: $name}')")" 200 "$label: chu quán sua duoc thong tin quán"
  assert_status "$(call -X PATCH "$API_BASE_URL/admin/staff-pin" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data "$(jq -nc --arg pin "$PIN" '{pin: $pin}')")" 200 "$label: chu quán doi duoc PIN"
}

# --- Cac trang thai bi chan ghi ----------------------------------------------
check_blocked_state() {
  local label="$1" owner_copy="$2"
  assert_status "$(guest_order)" 403 "$label: khach bi chan gui don"
  assert_inactive_body "$GUEST_COPY" "$label: khach nhan dung copy"
  assert_status "$(call -X POST "$API_BASE_URL/guest/sessions/$SESSION_ID/calls" -H 'Content-Type: application/json' -H "X-Guest-Access: $GUEST_ACCESS" --data '{"type":"REQUEST_BILL"}')" 403 "$label: khach bi chan goi nhan vien"
  assert_status "$(call -H "X-Guest-Access: $GUEST_ACCESS" "$API_BASE_URL/guest/sessions/$SESSION_ID/orders")" 200 "$label: khach van xem duoc don cu"

  assert_status "$(call -X PATCH "$API_BASE_URL/staff/orders/$LAST_ORDER_ID/status" -H 'Content-Type: application/json' -H "Authorization: Bearer $STAFF_TOKEN" --data '{"status":"SERVED"}')" 403 "$label: bep bi chan doi trang thai don"
  assert_inactive_body "$STAFF_COPY" "$label: nhan vien nhan dung copy"
  assert_status "$(call -X POST "$API_BASE_URL/staff/sessions/$SESSION_ID/close" -H "Authorization: Bearer $STAFF_TOKEN")" 403 "$label: bi chan reset ban"
  assert_status "$(call "$API_BASE_URL/staff/orders" -H "Authorization: Bearer $STAFF_TOKEN")" 200 "$label: nhan vien van xem duoc bang don"
  assert_status "$(call -X POST "$API_BASE_URL/staff/stream-ticket" -H "Authorization: Bearer $STAFF_TOKEN")" 201 "$label: van lay duoc ticket realtime de doc"

  assert_status "$(call -X PATCH "$API_BASE_URL/admin/restaurant" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data '{"name":"Quán Bi Chan"}')" 403 "$label: chu quán bi chan sua quán"
  assert_inactive_body "$owner_copy" "$label: chu quán nhan dung copy"
  assert_status "$(call -X PATCH "$API_BASE_URL/admin/staff-pin" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data "$(jq -nc --arg pin "$PIN" '{pin: $pin}')")" 403 "$label: chu quán bi chan doi PIN"
  assert_status "$(call -X POST "$API_BASE_URL/admin/tables" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data '{"code":"B99","displayName":"Bàn 99","sortOrder":99}')" 403 "$label: chu quán bi chan them ban"

  assert_status "$(call "$API_BASE_URL/admin/billing" -H "Authorization: Bearer $OWNER_TOKEN")" 200 "$label: chu quán van doc duoc trang thanh toan"
  assert_status "$(call -X POST "$API_BASE_URL/admin/billing/payment-intents" -H 'Content-Type: application/json' -H "Authorization: Bearer $OWNER_TOKEN" --data '{"provider":"sepay"}')" 201 "$label: chu quán van tao duoc huong dan thanh toan"
}

printf '\n[TRIAL]\n'
set_state TRIAL "now() + interval '30 days'" NULL NULL NULL
check_allowed_state 'TRIAL'

printf '\n[ACTIVE]\n'
set_state ACTIVE "now() - interval '40 days'" NULL "now() - interval '5 days'" "now() + interval '25 days'"
check_allowed_state 'ACTIVE'

printf '\n[GRACE]\n'
# Grace bat dau 5 ngay truoc => moc nhac ngay 1 va 3 da den han, ngay 7 chua.
set_state GRACE "now() - interval '5 days'" "now() + interval '2 days'" NULL NULL
check_allowed_state 'GRACE'
BILLING="$(curl -fsS "$API_BASE_URL/admin/billing" -H "Authorization: Bearer $OWNER_TOKEN")"
[[ "$(jq -r '.subscription.status' <<<"$BILLING")" == 'GRACE' ]] || fail 'GRACE: trang thai billing sai'
[[ "$(jq -r '[.dunningNotices[].day] | @csv' <<<"$BILLING")" == '1,3' ]] || fail "GRACE: sai moc nhac gia han ($(jq -c '.dunningNotices' <<<"$BILLING"))"
pass 'GRACE: van ghi don binh thuong, admin thay moc nhac ngay 1 va 3'
GRACE_EVENTS="$(db_query "SELECT count(*) FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'GRACE_STARTED';")"
[[ "$GRACE_EVENTS" == '1' ]] || fail "GRACE: audit GRACE_STARTED phai co dung 1 hang (nhan $GRACE_EVENTS)"
pass 'GRACE: audit chi ghi mot hang du goi lai nhieu lan'

printf '\n[PAST_DUE]\n'
set_state PAST_DUE "now() - interval '10 days'" "now() - interval '1 day'" NULL NULL
check_blocked_state 'PAST_DUE' "$OWNER_COPY"
PAST_DUE_EVENTS="$(db_query "SELECT count(*) FROM subscription_event WHERE restaurant_id = '$RESTAURANT_ID' AND type = 'PAST_DUE';")"
[[ "$PAST_DUE_EVENTS" == '1' ]] || fail "PAST_DUE: audit thieu hoac trung (nhan $PAST_DUE_EVENTS)"
pass 'PAST_DUE: co audit qua han'

printf '\n[SUSPENDED]\n'
set_state SUSPENDED "now() - interval '60 days'" "now() - interval '30 days'" NULL NULL
check_blocked_state 'SUSPENDED' "$OWNER_SUSPENDED_COPY"

printf '\n[Thanh toan khi bi tam ngung]\n'
# Cycle da tra tien phu ky hien tai: GRACE phai duoc mo lai, SUSPENDED thi khong.
db_query "INSERT INTO subscription_cycle (restaurant_id, subscription_id, sequence_no, status, amount_vnd, period_starts_at, period_ends_at, due_at, paid_at)
  SELECT '$RESTAURANT_ID', s.id, COALESCE(MAX(c.sequence_no), 0) + 1, 'PAID', 100000, now() - interval '1 hour', now() + interval '30 days', now() - interval '1 hour', now()
  FROM subscription s LEFT JOIN subscription_cycle c ON c.subscription_id = s.id
  WHERE s.restaurant_id = '$RESTAURANT_ID' GROUP BY s.id;" >/dev/null
STATUS_AFTER_PAYMENT="$(curl -fsS "$API_BASE_URL/admin/billing" -H "Authorization: Bearer $OWNER_TOKEN" | jq -r '.subscription.status')"
[[ "$STATUS_AFTER_PAYMENT" == 'SUSPENDED' ]] || fail "SUSPENDED khong duoc tu mo lai bang thanh toan (nhan $STATUS_AFTER_PAYMENT)"
pass 'SUSPENDED: tien vao khong tu kich hoat lai dich vu'

set_state GRACE "now() - interval '5 days'" "now() + interval '2 days'" NULL NULL
STATUS_AFTER_PAYMENT="$(curl -fsS "$API_BASE_URL/admin/billing" -H "Authorization: Bearer $OWNER_TOKEN" | jq -r '.subscription.status')"
[[ "$STATUS_AFTER_PAYMENT" == 'ACTIVE' ]] || fail "GRACE co cycle da tra phai thanh ACTIVE (nhan $STATUS_AFTER_PAYMENT)"
assert_status "$(guest_order)" 201 'ACTIVE sau thanh toan: khach gui don lai binh thuong'
pass 'GRACE: cycle da tra tien kich hoat lai dich vu'

printf '\nHoan tat: matrix entitlement TRIAL/ACTIVE/GRACE/PAST_DUE/SUSPENDED da PASS.\n'
