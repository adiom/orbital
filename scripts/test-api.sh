#!/bin/bash

# Avrora API Test Script
# Использование: ./scripts/test-api.sh

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

echo "🧪 Тестирование Avrora API"
echo "=========================="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки статуса
check_status() {
  if [ $1 -eq 200 ] || [ $1 -eq 201 ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $1)"
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $1)"
  fi
}

echo "1️⃣  Проверка здоровья сервера..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)
check_status $STATUS
echo ""

echo "2️⃣  Тестирование API Areas..."
echo "   GET /api/areas (требует авторизацию)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/areas)
if [ $STATUS -eq 401 ]; then
  echo -e "${YELLOW}⚠ Требуется авторизация (ожидаемо)${NC}"
else
  check_status $STATUS
fi
echo ""

echo "3️⃣  Тестирование WebSocket сервера..."
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ WebSocket сервер работает${NC} (порт 3001)"
  echo "   Health check: $(curl -s http://localhost:3001/health)"
else
  echo -e "${RED}✗ WebSocket сервер не запущен${NC}"
  echo -e "${YELLOW}   Запустите: pnpm run dev:ws${NC}"
fi
echo ""

echo "4️⃣  Проверка структуры файлов..."
FILES=(
  "lib/websocket/manager.ts"
  "lib/websocket/server.ts"
  "lib/websocket/use-websocket.ts"
  "lib/mentions/parser.ts"
  "lib/mentions/intent-detection.ts"
  "lib/mentions/process.ts"
  "components/area-tree.tsx"
  "app/(area)/areas/page.tsx"
  "app/(area)/area/[id]/page.tsx"
)

ALL_EXISTS=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file ${RED}НЕ НАЙДЕН${NC}"
    ALL_EXISTS=false
  fi
done
echo ""

echo "5️⃣  Проверка компиляции TypeScript..."
npx tsc --noEmit 2>&1 | grep -E "(error TS|✓)" | head -n 5
echo ""

echo "=========================="
echo "📊 Итоги:"
echo ""
if [ "$ALL_EXISTS" = true ]; then
  echo -e "${GREEN}✓${NC} Все файлы Avrora на месте"
else
  echo -e "${RED}✗${NC} Некоторые файлы отсутствуют"
fi

echo ""
echo "📖 Подробная инструкция по тестированию: ./test-avrora.md"
echo ""
echo "🚀 Для запуска:"
echo "   Терминал 1: pnpm run dev"
echo "   Терминал 2: pnpm run dev:ws"
echo ""
