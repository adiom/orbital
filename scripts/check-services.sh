#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check_postgres() {
  if command -v pg_isready &>/dev/null && pg_isready -q 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    return 0
  fi
  echo -e "${RED}✗ PostgreSQL is not running${NC}"
  return 1
}

check_redis() {
  if command -v redis-cli &>/dev/null && redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "${GREEN}✓ Redis is running${NC}"
    return 0
  fi
  echo -e "${RED}✗ Redis is not running${NC}"
  return 1
}

echo "Checking required services..."
ok=true
check_postgres || ok=false
check_redis || ok=false
echo

if ! $ok; then
  echo -e "${RED}Start missing services and try again.${NC}"
  echo "  PostgreSQL: Open Postgres.app or run: open -a Postgres"
  echo "  Redis:      brew services start redis"
  exit 1
fi
