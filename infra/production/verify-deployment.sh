#!/usr/bin/env bash

# Chạy từ một mạng nằm ngoài VM sau khi deploy production. Script không gửi
# dữ liệu và không cần JWT; nó chỉ kiểm DNS/HTTPS/same-origin của ba frontend.
set -euo pipefail

admin_host="${ADMIN_HOST:-tableqr.vn}"
staff_host="${STAFF_HOST:-staff.tableqr.vn}"
guest_host="${GUEST_HOST:-guest.tableqr.vn}"

if ! command -v curl >/dev/null; then
  echo "Thiếu curl nên không thể kiểm tra deployment." >&2
  exit 1
fi

scratch_dir="$(mktemp -d)"
cleanup() { rm -rf "$scratch_dir"; }
trap cleanup EXIT

check_endpoint() {
  local host="$1"
  local path="$2"
  local expected_status="$3"
  local response_body="$scratch_dir/$(tr '/' '_' <<<"$host$path").body"
  local response_headers="$scratch_dir/$(tr '/' '_' <<<"$host$path").headers"
  local url="https://${host}${path}"

  curl --fail --silent --show-error --proto '=https' --tlsv1.2 \
    --connect-timeout 5 --max-time 20 --dump-header "$response_headers" \
    --output "$response_body" "$url"

  if ! grep -Fq "\"status\":\"${expected_status}\"" "$response_body"; then
    echo "$url trả body không mong đợi:" >&2
    cat "$response_body" >&2
    exit 1
  fi

  if ! grep -Eiq '^strict-transport-security: max-age=31536000; includesubdomains' "$response_headers"; then
    echo "$url thiếu header HSTS production." >&2
    exit 1
  fi
}

for host in "$admin_host" "$staff_host" "$guest_host"; do
  echo "Kiểm tra https://${host} ..."
  check_endpoint "$host" '/api/v1/healthz' 'ok'
  check_endpoint "$host" '/api/v1/readyz' 'ready'
done

echo "Đạt: DNS, chứng chỉ HTTPS, reverse proxy cùng origin và API ready trên cả ba hostname."
