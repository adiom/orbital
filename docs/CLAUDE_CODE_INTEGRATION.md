# Claude Code Integration

Полная интеграция Claude Code с Avrora через Model Context Protocol (MCP) для доступа к Сферам и автоматического логирования работы.

## Обзор

Avrora поддерживает два типа интеграции с Claude Code:

1. **MCP API** - Полный доступ к Сферам через Model Context Protocol
2. **Direct Logging** - Прямое логирование работы в специальную Сферу

## MCP Integration (Рекомендуется)

### Быстрый старт

#### 1. Получение API ключа

1. Войдите в систему Avrora
2. Перейдите в [Настройки → API ключи](/settings/api-keys)
3. Создайте новый ключ с разрешениями:
   - ✅ Read Resources
   - ✅ Use Tools
4. Сохраните ключ безопасно

#### 2. Настройка Claude Desktop

Файл конфигурации находится в:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Добавьте:

```json
{
  "mcpServers": {
    "avrora": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-proxy",
        "--transport=stdio",
        "--url=http://localhost:3000/api/mcp",
        "--header=Authorization: Bearer avr_live_YOUR_KEY_HERE"
      ]
    }
  }
}
```

#### 3. Использование в Claude Code

После перезапуска Claude Desktop вы можете:

```
// Просмотр Сфер
Покажи мои Сферы в Avrora

// Создание Сферы
Создай новую Сферу "Разработка функции X"

// Отправка сообщений
Отправь в Сферу [ID] сообщение о завершении задачи

// Работа с Avrora AI
Вызови @avrora в Сфере и спроси про архитектуру
```

### Доступные возможности

**Resources (чтение):**
- Список Сфер
- Сообщения Сфер
- Профиль пользователя
- Поиск по Сферам

**Tools (действия):**
- Создание Сфер
- Отправка сообщений
- Вызов Avrora AI
- Добавление участников
- Форк Сфер

## Direct Logging API

Для автоматического логирования работы Claude Code использует специальный API:

## Настройка

### 1. Environment Variables

Добавь в `.env.local`:

```bash
# API ключ для аутентификации Claude Code
CLAUDE_CODE_API_KEY=your-secret-key-here

# URL приложения (для API calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Создание Сферы

Создай специальную Сферу с названием "Avrora - Claude Code" и запомни её ID.

### 3. Создание пользователя в БД

Пользователь Claude Code создастся автоматически при первом сообщении:
- ID: `00000000-0000-0000-0000-000000000002`
- Email: `claude-code@avrora.click`

## API

### POST /api/sfera/[id]/claude-code

Отправить сообщение от Claude Code.

**Headers:**
```
Authorization: Bearer {CLAUDE_CODE_API_KEY}
Content-Type: application/json
```

**Body:**
```json
{
  "content": "feat: Add parent message indicators\n\n- Created 5 indicator variants\n- Removed animations and gradients\n- Simplified color scheme",
  "files": [
    "components/orbit/orbit-message.tsx",
    "components/orbit/parent-message-indicators.tsx"
  ]
}
```

**Response:**
```json
{
  "message": {
    "id": "msg-123",
    "content": "feat: Add parent message indicators...",
    "userId": "00000000-0000-0000-0000-000000000002",
    ...
  },
  "success": true
}
```

## Использование в коде

### Базовое использование

```typescript
import { logClaudeCodeWork } from "@/lib/claude-code/logger";

await logClaudeCodeWork({
  sferaId: "your-sfera-id",
  content: "feat: Implement new feature\n\n- Added X\n- Fixed Y",
  files: ["path/to/file1.ts", "path/to/file2.tsx"],
});
```

### С хелперами форматирования

```typescript
import {
  logClaudeCodeWork,
  formatTaskComplete,
  formatRefactor,
  formatFix,
} from "@/lib/claude-code/logger";

// Task completion
await logClaudeCodeWork({
  sferaId,
  content: formatTaskComplete("Simplify orbit message design", [
    "Removed animations",
    "Created 5 indicator variants",
    "Updated color scheme to neutral grays",
  ]),
  files: ["components/orbit/orbit-message.tsx"],
});

// Refactor
await logClaudeCodeWork({
  sferaId,
  content: formatRefactor("Extract system user constants", [
    "Created lib/constants/system-users.ts",
    "Added helper functions for user type checks",
  ]),
  files: ["lib/constants/system-users.ts"],
});

// Bug fix
await logClaudeCodeWork({
  sferaId,
  content: formatFix(
    "Loading animation not showing",
    "Replaced animate-bounce with static dots"
  ),
  files: ["components/orbit/orbit-message.tsx"],
});
```

## Commit Message Conventions

Следуй GitHub commit style:

### Типы

- `feat`: Новая функциональность
- `fix`: Исправление бага
- `refactor`: Рефакторинг без изменения функциональности
- `docs`: Документация
- `style`: Форматирование, стиль кода
- `test`: Добавление/изменение тестов
- `chore`: Обслуживание, конфигурация

### Формат

```
<type>: <subject>

<body>

<footer>
```

### Примеры

```
feat: Add user authentication

- Implement JWT token generation
- Add login/logout endpoints
- Create auth middleware
```

```
fix: Prevent duplicate message submission

Added debouncing to submit button to prevent rapid clicks
from creating duplicate messages.
```

```
refactor: Extract message formatting logic

- Created lib/messages/formatter.ts
- Moved formatting functions from component
- Added unit tests
```

## UI

Сообщения от Claude Code отображаются с специальным badge:

```
┌─────────────────────────────────┐
│ 🤖 Claude Code                  │
│ claude-code@avrora.click        │
│                                 │
│ feat: Add parent indicators     │
│                                 │
│ - Created 5 variants            │
│ - Simplified design             │
│                                 │
│ Modified files:                 │
│ - orbit-message.tsx             │
└─────────────────────────────────┘
```

## Hooks Integration

Можно настроить автоматическое логирование через Claude Code hooks:

### .claude/hooks/post-task.sh

```bash
#!/bin/bash
# Автоматически логируем после завершения задачи

SFERA_ID="your-sfera-id"
TASK_SUMMARY="$1"
FILES_CHANGED="$2"

curl -X POST "http://localhost:3000/api/sfera/$SFERA_ID/claude-code" \
  -H "Authorization: Bearer $CLAUDE_CODE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"chore: $TASK_SUMMARY\",
    \"files\": $FILES_CHANGED
  }"
```

## Best Practices

1. **Группируй связанные изменения** в одно сообщение
2. **Используй правильный тип** (feat/fix/refactor)
3. **Перечисляй файлы** для удобства навигации
4. **Пиши понятные описания** - как будто это настоящий commit
5. **Не логируй тривиальные изменения** (опечатки, форматирование)

## Security

- API ключ хранится только в `.env.local`
- Endpoint доступен только с валидным ключом
- Claude Code user не имеет особых привилегий в Сфере
- Сообщения не могут быть изменены задним числом

## Troubleshooting

### "CLAUDE_CODE_API_KEY not configured"

Убедись что добавил `CLAUDE_CODE_API_KEY` в `.env.local`.

### "Invalid API key"

Проверь что ключ в запросе совпадает с `CLAUDE_CODE_API_KEY` в environment.

### "Sfera not found"

Проверь что Sfera ID правильный и Сфера существует в БД.

### Сообщения не появляются

1. Проверь network tab - успешен ли POST request
2. Проверь console - есть ли ошибки
3. Проверь что WebSocket сервер запущен (`pnpm run dev:ws`)
