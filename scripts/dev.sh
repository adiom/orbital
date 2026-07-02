#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PG_APP="/Applications/Postgres.app/Contents/Versions/18/bin"
PG_DATA="$HOME/Library/Application Support/Postgres/var-18"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[dev:all]${NC} $1"; }
ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; }

# --- PostgreSQL ---
start_postgres() {
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    ok "PostgreSQL уже запущен"
  elif [ -d "$PG_APP" ]; then
    log "Запуск PostgreSQL (Postgres.app)..."
    "$PG_APP/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/server.log" start >/dev/null 2>&1
    sleep 1
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      ok "PostgreSQL запущен"
    else
      err "PostgreSQL не смог запуститься"
      exit 1
    fi
  else
    warn "Postgres.app не найден — пропускаю (убедись что PostgreSQL запущен вручную)"
  fi
}

# --- Redis ---
start_redis() {
  if redis-cli ping >/dev/null 2>&1; then
    ok "Redis уже запущен"
  else
    log "Запуск Redis через brew..."
    brew services start redis >/dev/null 2>&1
    sleep 1
    if redis-cli ping >/dev/null 2>&1; then
      ok "Redis запущен"
    else
      err "Redis не смог запуститься"
      exit 1
    fi
  fi
}

# --- Cleanup ---
cleanup() {
  log "Остановка dev-серверов..."
  kill "$NEXT_PID" "$WS_PID" 2>/dev/null || true
  wait "$NEXT_PID" "$WS_PID" 2>/dev/null || true
  ok "Dev-серверы остановлены (PostgreSQL и Redis продолжают работать)"
}
trap cleanup EXIT INT TERM

# --- Main ---
log "Запуск всех сервисов для локальной разработки\n"

start_postgres
start_redis

# Проверка .env.local
if [ ! -f ".env.local" ]; then
  err ".env.local не найден. Скопируй .env.example → .env.local и заполни значения"
  exit 1
fi

log "Запуск Next.js (pnpm dev)..."
pnpm dev &
NEXT_PID=$!

log "Запуск WebSocket сервера (pnpm dev:ws)..."
pnpm dev:ws &
WS_PID=$!

echo ""
ok "Все сервисы запущены:"
echo -e "  ${GREEN}•${NC} Next.js:    http://localhost:3000"
echo -e "  ${GREEN}•${NC} WebSocket:  ws://localhost:3001"
echo -e "  ${GREEN}•${NC} PostgreSQL: localhost:5432"
echo -e "  ${GREEN}•${NC} Redis:      localhost:6379"
echo ""
log "Нажми Ctrl+C для остановки\n"

wait
