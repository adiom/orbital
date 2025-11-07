#!/bin/bash

# Скрипт для обновления всех установленных shadcn/ui компонентов
# Использование: ./scripts/update-shadcn.sh

set -e

echo "🔄 Обновление shadcn/ui компонентов..."
echo ""

# Список установленных компонентов
COMPONENTS=(
  "alert-dialog"
  "avatar"
  "badge"
  "button"
  "card"
  "carousel"
  "collapsible"
  "dialog"
  "dropdown-menu"
  "hover-card"
  "input"
  "label"
  "progress"
  "scroll-area"
  "select"
  "separator"
  "sheet"
  "sidebar"
  "skeleton"
  "textarea"
  "tooltip"
)

# Обновляем каждый компонент
for component in "${COMPONENTS[@]}"; do
  echo "📦 Обновление: $component"
  npx shadcn@latest add "$component" --overwrite --yes
  echo "✅ $component обновлен"
  echo ""
done

echo "✨ Все компоненты обновлены!"

