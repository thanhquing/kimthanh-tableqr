#!/usr/bin/env bash

# Dien tap backup/restore (`SA-12`): chung minh audit thue bao va thanh toan
# song sot sau khi phuc hoi. Dump ca database roi restore vao mot database rieng
# trong cung cluster, so tung bang billing bang so hang + checksum noi dung.
#
# Chay sau: docker compose -f tableqr-api/docker-compose.yml up -d db
# Khong dung vao database dang phuc vu: chi doc, va chi ghi vao database dien tap.

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-tableqr-api/docker-compose.yml}"
SOURCE_DB="${SOURCE_DB:-tableqr}"
DRILL_DB="${DRILL_DB:-tableqr_restore_drill}"
DUMP_PATH="/tmp/${DRILL_DB}.sql"

command -v docker >/dev/null || { printf 'Thieu lenh bat buoc: docker\n' >&2; exit 1; }

fail() { printf '✗ %s\n' "$1" >&2; exit 1; }
pass() { printf '✓ %s\n' "$1"; }

db() { docker compose -f "$COMPOSE_FILE" exec -T db "$@"; }
query() { db psql -qAt -U tableqr -d "$1" -c "$2"; }

# Bang nao mat du lieu la mat kha nang doi soat tien.
BILLING_TABLES=(plan subscription subscription_cycle subscription_event payment payment_webhook_event)

cleanup() {
  db psql -qAt -U tableqr -d postgres -c "DROP DATABASE IF EXISTS \"$DRILL_DB\" WITH (FORCE);" >/dev/null 2>&1 || true
  db rm -f "$DUMP_PATH" >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf 'Dien tap backup/restore tren cluster local\n\n'

printf '[1] Backup\n'
db pg_dump -U tableqr -d "$SOURCE_DB" --format=plain --no-owner --file "$DUMP_PATH" \
  || fail 'pg_dump that bai'
DUMP_BYTES="$(db stat -c %s "$DUMP_PATH")"
[[ "$DUMP_BYTES" -gt 1000 ]] || fail "Ban dump qua nho ($DUMP_BYTES byte)"
pass "pg_dump xong ($DUMP_BYTES byte)"

printf '\n[2] Restore vao database dien tap\n'
db psql -qAt -U tableqr -d postgres -c "DROP DATABASE IF EXISTS \"$DRILL_DB\" WITH (FORCE);" >/dev/null
db psql -qAt -U tableqr -d postgres -c "CREATE DATABASE \"$DRILL_DB\";" >/dev/null
RESTORE_LOG="$(db psql -q -U tableqr -d "$DRILL_DB" -v ON_ERROR_STOP=1 -f "$DUMP_PATH" 2>&1)" \
  || fail "Restore that bai: $(tail -c 400 <<<"$RESTORE_LOG")"
pass "Restore vao $DRILL_DB thanh cong"

printf '\n[3] So tung bang billing\n'
for table in "${BILLING_TABLES[@]}"; do
  source_count="$(query "$SOURCE_DB" "SELECT count(*) FROM \"$table\";")"
  drill_count="$(query "$DRILL_DB" "SELECT count(*) FROM \"$table\";")"
  [[ "$source_count" == "$drill_count" ]] || fail "$table lech so hang ($source_count vs $drill_count)"
  # So ca noi dung: dung so hang ma sai gia tri thi doi soat tien van hong.
  checksum_query="SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) FROM \"$table\" t;"
  source_sum="$(query "$SOURCE_DB" "$checksum_query")"
  drill_sum="$(query "$DRILL_DB" "$checksum_query")"
  [[ "$source_sum" == "$drill_sum" ]] || fail "$table lech noi dung sau restore"
  pass "$table: $source_count hang, checksum khop"
done

printf '\n[4] Audit va rang buoc con nguyen\n'
EVENT_TYPES="$(query "$DRILL_DB" "SELECT string_agg(DISTINCT type::text, ',' ORDER BY type::text) FROM subscription_event;")"
[[ -n "$EVENT_TYPES" ]] || fail 'Ban phuc hoi khong con su kien lifecycle nao'
pass "Con du loai su kien lifecycle: $EVENT_TYPES"

PAID_SOURCE="$(query "$SOURCE_DB" "SELECT count(*) FROM payment WHERE status = 'SUCCEEDED' AND paid_at IS NOT NULL;")"
PAID_DRILL="$(query "$DRILL_DB" "SELECT count(*) FROM payment WHERE status = 'SUCCEEDED' AND paid_at IS NOT NULL;")"
[[ "$PAID_SOURCE" == "$PAID_DRILL" ]] || fail "Lech so thanh toan da thu ($PAID_SOURCE vs $PAID_DRILL)"
pass "Giu nguyen $PAID_DRILL thanh toan da thu kem moc tra tien"

WEBHOOK_UNIQUE="$(query "$DRILL_DB" "SELECT count(*) FROM pg_indexes WHERE tablename = 'payment_webhook_event' AND indexname = 'payment_webhook_event_provider_event_id_key';")"
[[ "$WEBHOOK_UNIQUE" == '1' ]] || fail 'Mat unique chong replay webhook sau restore'
pass 'Unique chong replay webhook con nguyen'

RLS_OFF="$(query "$DRILL_DB" "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY(ARRAY['subscription','subscription_cycle','subscription_event','payment','payment_webhook_event']) AND NOT rowsecurity;")"
[[ "$RLS_OFF" == '0' ]] || fail "Con $RLS_OFF bang billing mat RLS sau restore"
pass 'Moi bang billing van bat RLS sau restore'

printf '\nHoan tat: backup/restore giu nguyen audit thue bao va thanh toan.\n'
