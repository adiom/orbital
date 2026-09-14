# MCP API Documentation

> **Implementation authority:** This document is not a protocol specification. Any MCP implementation, migration, review, or documentation update must follow the current official MCP TypeScript SDK documentation at `https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/refs/heads/main/docs/index.md` and the MCP specification linked from it. The official SDK, supported transports, schemas, and validation patterns take precedence over examples in this file.

## Обзор

Model Context Protocol (MCP) API предоставляет программный доступ к Сферам Avrora через стандартизированный JSON-RPC 2.0 интерфейс. Это позволяет внешним приложениям (например, Claude Desktop) взаимодействовать с вашими Сферами, отправлять сообщения и вызывать Avrora AI.

## Быстрый старт

### 1. Получение API ключа

1. Перейдите в [Настройки → API ключи](/settings/api-keys)
2. Нажмите "Создать новый ключ"
3. Укажите название и разрешения
4. **Сохраните ключ безопасно** - он показывается только один раз!

### 2. Настройка Claude Desktop

Добавьте в конфигурацию Claude Desktop:

```json
{
  "mcpServers": {
    "avrora": {
      "url": "https://your-domain.com/api/mcp",
      "apiKey": "avr_live_YOUR_KEY_HERE"
    }
  }
}
```

### 3. Первый запрос

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer avr_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/list",
    "params": {},
    "id": 1
  }'
```

## Аутентификация

Все запросы требуют API ключ в заголовке `Authorization`:

```
Authorization: Bearer avr_live_YOUR_KEY_HERE
```

### Формат ключей
- **Production**: `avr_live_` + 32 символа
- **Test**: `avr_test_` + 32 символа

## Эндпоинт

```
POST /api/mcp
```

Все операции выполняются через единый эндпоинт используя JSON-RPC 2.0.

## Доступные методы

### Resources (Чтение данных)

#### `resources/list`
Список доступных ресурсов.

**Запрос:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/list",
  "params": {},
  "id": 1
}
```

**Ответ:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "resources": [
      {
        "uri": "sfera://list",
        "name": "List of Sferas",
        "mimeType": "application/json"
      },
      {
        "uri": "sfera://{id}",
        "name": "Sfera details",
        "mimeType": "application/json"
      }
    ]
  },
  "id": 1
}
```

#### `resources/read`
Чтение конкретного ресурса.

**Параметры:**
- `uri` (string, required) - URI ресурса

**Примеры URI:**
- `sfera://list` - Список всех ваших Сфер
- `sfera://{id}` - Детали конкретной Сферы
- `sfera://{id}/messages` - Сообщения Сферы
- `sfera://search?q={query}` - Поиск по Сферам
- `user://profile` - Ваш профиль

**Запрос:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "uri": "sfera://list"
  },
  "id": 2
}
```

**Ответ:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "contents": [
      {
        "uri": "sfera://list",
        "mimeType": "application/json",
        "text": {
          "sferas": [
            {
              "id": "uuid",
              "title": "My Sfera",
              "description": "Description",
              "visibility": "private",
              "role": "owner",
              "createdAt": "2024-01-01T00:00:00Z",
              "updatedAt": "2024-01-01T00:00:00Z"
            }
          ],
          "count": 1
        }
      }
    ]
  },
  "id": 2
}
```

### Tools (Выполнение действий)

#### `tools/list`
Список доступных инструментов.

**Запрос:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {},
  "id": 3
}
```

**Ответ:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "createSfera",
        "description": "Create a new Sfera",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": {"type": "string", "description": "Sfera title"},
            "description": {"type": "string", "description": "Sfera description"},
            "visibility": {"type": "string", "enum": ["public", "private", "dao"]},
            "members": {"type": "array", "items": {"type": "string"}}
          },
          "required": ["title"]
        }
      }
    ]
  },
  "id": 3
}
```

#### `tools/call`
Вызов инструмента.

**Параметры:**
- `name` (string, required) - Имя инструмента
- `arguments` (object, required) - Аргументы инструмента

**Доступные инструменты:**

##### `createSfera`
Создать новую Сферу.

**Аргументы:**
- `title` (string, required) - Название
- `description` (string) - Описание
- `visibility` (string) - "public" | "private" | "dao" (по умолчанию "private")
- `members` (string[]) - Email или ID пользователей для добавления

##### `sendMessage`
Отправить сообщение в Сферу.

**Аргументы:**
- `sferaId` (string, required) - ID Сферы
- `content` (string, required) - Текст сообщения
- `parentMessageId` (string) - ID родительского сообщения (для веток)

##### `invokeAvrora`
Вызвать Avrora AI в Сфере.

**Аргументы:**
- `sferaId` (string, required) - ID Сферы
- `prompt` (string) - Подсказка для Avrora

##### `addMember`
Добавить участника в Сферу.

**Аргументы:**
- `sferaId` (string, required) - ID Сферы
- `memberIdentifier` (string, required) - Email или ID пользователя
- `role` (string) - "admin" | "member" | "viewer" (по умолчанию "member")

##### `forkSfera`
Создать форк Сферы или сообщения.

**Аргументы:**
- `sferaId` (string, required) - ID исходной Сферы
- `messageId` (string) - ID сообщения для форка
- `title` (string, required) - Название новой Сферы
- `description` (string) - Описание

**Пример запроса:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sendMessage",
    "arguments": {
      "sferaId": "uuid-here",
      "content": "Hello from MCP!"
    }
  },
  "id": 4
}
```

**Пример ответа:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Message sent successfully"
      }
    ]
  },
  "id": 4
}
```

## Rate Limiting

### Лимиты по уровням

#### Free Tier
- **В минуту**: 20 запросов
- **В час**: 500 запросов
- **В день**: 5,000 запросов

#### Pro Tier
- **В минуту**: 60 запросов
- **В час**: 2,000 запросов
- **В день**: 20,000 запросов

#### Enterprise Tier
- **В минуту**: 200 запросов
- **В час**: 10,000 запросов
- **В день**: 100,000 запросов

### Заголовки Rate Limit

В ответе всегда присутствуют:
- `X-RateLimit-Limit` - Максимум запросов в минуту
- `X-RateLimit-Remaining` - Осталось запросов
- `X-RateLimit-Reset` - Время сброса лимита (ISO 8601)
- `X-RateLimit-Tier` - Ваш уровень (free/pro/enterprise)

## Коды ошибок

### Стандартные JSON-RPC коды
- `-32700` - Parse error
- `-32600` - Invalid Request
- `-32601` - Method not found
- `-32602` - Invalid params
- `-32603` - Internal error

### Кастомные коды
- `-32001` - Authentication failed
- `-32002` - Rate limit exceeded
- `-32003` - Permission denied
- `-32004` - Resource not found
- `-32005` - Invalid input

## Примеры

### Python клиент

```python
import requests
import json

class AvroraClient:
    def __init__(self, api_key, base_url="https://your-domain.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.request_id = 0

    def call(self, method, params=None):
        self.request_id += 1
        response = requests.post(
            f"{self.base_url}/api/mcp",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "jsonrpc": "2.0",
                "method": method,
                "params": params or {},
                "id": self.request_id
            }
        )
        return response.json()

# Использование
client = AvroraClient("avr_live_YOUR_KEY")

# Список Сфер
sferas = client.call("resources/read", {"uri": "sfera://list"})

# Отправка сообщения
result = client.call("tools/call", {
    "name": "sendMessage",
    "arguments": {
        "sferaId": "sfera-uuid",
        "content": "Hello from Python!"
    }
})
```

### TypeScript/Node.js клиент

```typescript
interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: number | string;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

class AvroraClient {
  private requestId = 0;

  constructor(
    private apiKey: string,
    private baseUrl = "https://your-domain.com"
  ) {}

  async call(method: string, params?: any): Promise<any> {
    this.requestId++;

    const response = await fetch(`${this.baseUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: params || {},
        id: this.requestId
      } as JsonRpcRequest)
    });

    const json: JsonRpcResponse = await response.json();

    if (json.error) {
      throw new Error(`RPC Error: ${json.error.message}`);
    }

    return json.result;
  }
}

// Использование
const client = new AvroraClient("avr_live_YOUR_KEY");

// Список Сфер
const sferas = await client.call("resources/read", { uri: "sfera://list" });

// Создание Сферы
const newSfera = await client.call("tools/call", {
  name: "createSfera",
  arguments: {
    title: "My New Sfera",
    description: "Created via MCP"
  }
});
```

## Разрешения API ключей

При создании ключа можно настроить разрешения:

- **resources** - Чтение данных (Сферы, сообщения, профиль)
- **tools** - Выполнение действий (отправка сообщений, создание Сфер)
- **admin** - Административные действия (управление участниками)

## Аудит и безопасность

Все вызовы MCP API логируются в таблице `McpAuditLog` со следующей информацией:
- ID пользователя и API ключа
- Вызванный метод и параметры
- Время выполнения
- IP адрес и User Agent
- Результат (успех/ошибка)

## Поддержка

- **Проблемы**: [GitHub Issues](https://github.com/your-repo/issues)
- **Email**: support@your-domain.com
- **Документация**: [/docs](/docs)

## Changelog

### v1.0.0 (2024-11-13)
- Начальный релиз MCP API
- Поддержка Resources и Tools
- Rate limiting по уровням
- API ключи с разрешениями
