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


# --- .env.local ---
if [ ! -f ".env.local" ]; then
  err ".env.local не найден. Скопируй .env.example → .env.local"
  exit 1
fi

exec next dev
