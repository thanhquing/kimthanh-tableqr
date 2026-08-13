#!/usr/bin/env bash

# Chay TableQR qua ba hostname *.localhost ma khong can mua domain hay sua DNS.
# Dung Ctrl-C de dung Caddy va ba Vite dev server. PostgreSQL/API Docker van chay
# de lan sau khoi dong nhanh hon; dung `docker compose ... down` neu can dung han.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

if ! command -v caddy >/dev/null; then
  echo "Thieu Caddy. Cai bang: brew install caddy"
  exit 1
fi

if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
  echo "Docker Desktop chua chay. Hay mo Docker Desktop roi chay lai lenh nay."
  exit 1
fi

compose=(docker compose -f tableqr-api/docker-compose.yml -f tableqr-api/docker-compose.local.yml)

echo "Khoi dong PostgreSQL va API..."
"${compose[@]}" build api api-seed
"${compose[@]}" up -d api

echo "Cho API san sang..."
for attempt in {1..30}; do
  if curl -fsS http://localhost:3000/api/v1/readyz >/dev/null; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    echo "API khong san sang sau 60 giay. Xem log: ${compose[*]} logs api"
    exit 1
  fi
  sleep 2
done

echo "Nap du lieu demo (idempotent)..."
"${compose[@]}" --profile local run --rm api-seed

# Caddy normally writes its runtime data below the user home. Keep all local
# simulation artifacts inside the repository and out of Git instead.
export XDG_DATA_HOME="$repo_dir/.local/caddy/data"
export XDG_CONFIG_HOME="$repo_dir/.local/caddy/config"
mkdir -p "$XDG_DATA_HOME" "$XDG_CONFIG_HOME"

caddy run --config infra/local/Caddyfile --adapter caddyfile &
caddy_pid=$!

cleanup() {
  kill "$caddy_pid" "${vite_pid:-}" 2>/dev/null || true
  wait "$caddy_pid" "${vite_pid:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "\nSan sang o:"
echo "  Admin : http://tableqr.localhost:8080"
echo "  Staff : http://staff.tableqr.localhost:8080"
echo "  Guest : http://guest.tableqr.localhost:8080/t/qr-ban-01-a7f3k9m2xp"
echo "\nNhan Ctrl-C de dung frontend/proxy."

pnpm --parallel --filter tableqr-guest --filter tableqr-staff --filter tableqr-admin dev &
vite_pid=$!
wait "$vite_pid"
