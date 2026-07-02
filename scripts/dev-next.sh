#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PG_APP="/Applications/Postgres.app/Contents/Versions/18/bin"
PG_DATA="$HOME/Library/Application Support/Postgres/var-18"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; }

# --- PostgreSQL ---
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  ok "PostgreSQL уже запущен"
elif [ -d "$PG_APP" ]; then
  echo -e "${YELLOW}→${NC} Запуск PostgreSQL (Postgres.app)..."
  "$PG_APP/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/server.log" start >/dev/null 2>&1
  sleep 1
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    ok "PostgreSQL запущен"
  else
    err "PostgreSQL не смог запуститься"
    exit 1
  fi
else
  warn "Postgres.app не найден — убедись что PostgreSQL запущен"
fi

# --- Redis ---
if redis-cli ping >/dev/null 2>&1; then
  ok "Redis уже запущен"
else
  echo -e "${YELLOW}→${NC} Запуск Redis через brew..."
  brew services start redis >/dev/null 2>&1
  sleep 1
  if redis-cli ping >/dev/null 2>&1; then
    ok "Redis запущен"
  else
    err "Redis не смог запуститься"
    exit 1
  fi
fi

# --- .env.local ---
if [ ! -f ".env.local" ]; then
  err ".env.local не найден. Скопируй .env.example → .env.local"
  exit 1
fi

exec next dev
