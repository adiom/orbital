[17 tools called]

# Документация API Avrora Chat System

## Обзор

Avrora - это система чатов с ИИ, которая поддерживает как личные, так и групповые чаты, организованные в "области" (Areas). API предоставляет полный функционал для управления чатами, областями, пользователями и сообщениями.

## Базовая информация

- **Базовый URL**: `http://localhost:3000` (разработка) / `https://your-domain.com` (продакшн)
- **Аутентификация**: Bearer токены JWT
- **Формат данных**: JSON
- **Кодировка**: UTF-8

## Основные сущности

### Areas (Области)
Области используются для организации чатов и управления доступом. Каждая область имеет:
- Владельца (owner)
- Участников с разными ролями (owner, admin, member)
- Видимость (public/private)
- Возможность форкинга для создания производных областей

### Chats (Чаты)
- **Личные чаты**: Только владелец имеет доступ
- **Групповые чаты**: Все участники области могут читать, но AI отвечает только при упоминании @Avrora
- **Типы**: personal, group

### Messages (Сообщения)
Сообщения могут содержать:
- Текст
- Файлы (изображения, документы)
- AI-генерируемый контент

---

## API Endpoints

### 🔐 Аутентификация

Все запросы к API требуют аутентификации через Bearer токен.

```
Authorization: Bearer <jwt_token>
```

### 📁 Areas API

#### Получить все области пользователя
```
GET /api/areas
```

**Ответ:**
```json
{
  "areas": [
    {
      "id": "uuid",
      "title": "Название области",
      "description": "Описание",
      "ownerId": "uuid",
      "visibility": "private|public",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Создать новую область
```
POST /api/areas
```

**Тело запроса:**
```json
{
  "title": "Название области",
  "description": "Описание области",
  "visibility": "private"
}
```

#### Получить область по ID
```
GET /api/areas/{id}
```

**Ответ:**
```json
{
  "area": { /* данные области */ },
  "members": [
    {
      "userId": "uuid",
      "role": "owner|admin|member",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Обновить область
```
PATCH /api/areas/{id}
```

**Тело запроса:**
```json
{
  "title": "Новое название",
  "description": "Новое описание",
  "visibility": "public"
}
```

#### Удалить область
```
DELETE /api/areas/{id}
```

### 👥 Управление участниками областей

#### Получить участников области
```
GET /api/areas/{id}/members
```

#### Добавить участника
```
POST /api/areas/{id}/members
```

**Тело запроса:**
```json
{
  "userId": "uuid-пользователя",
  "role": "member"
}
```

#### Обновить роль участника
```
PATCH /api/areas/{id}/members
```

**Тело запроса:**
```json
{
  "userId": "uuid-пользователя",
  "role": "admin"
}
```

#### Удалить участника
```
DELETE /api/areas/{id}/members?userId={userId}
```

### 💬 Chats API

#### Получить чаты в области
```
GET /api/areas/{id}/chats
```

**Ответ:**
```json
{
  "chats": [
    {
      "id": "uuid",
      "title": "Название чата",
      "chatType": "personal|group",
      "areaId": "uuid",
      "createdAt": "2024-01-01T00:00:00Z",
      "userRole": "admin|member"
    }
  ]
}
```

#### Создать новый чат
```
POST /api/areas/{id}/chats
```

**Тело запроса:**
```json
{
  "title": "Название чата",
  "chatType": "group",
  "memberUserIds": ["uuid1", "uuid2"]
}
```

#### Получить участников чата
```
GET /api/chats/{chatId}/members
```

#### Добавить участника в чат
```
POST /api/chats/{chatId}/members
```

**Тело запроса:**
```json
{
  "userId": "uuid",
  "role": "member"
}
```

### 💭 Messages API

#### Отправить сообщение в чат
```
POST /api/chat
```

**Тело запроса:**
```json
{
  "id": "uuid-чата",
  "message": {
    "id": "uuid-сообщения",
    "role": "user",
    "parts": [
      {
        "type": "text",
        "text": "Привет, @Avrora!"
      }
    ]
  },
  "selectedChatModel": "chat-model",
  "selectedVisibilityType": "private"
}
```

**Потоковый ответ:** Server-Sent Events с типами:
- `text-start` - начало сообщения AI
- `text-delta` - фрагмент текста
- `text-end` - окончание сообщения
- `data-usage` - информация об использовании токенов

#### Получить чат с сообщениями
```
GET /api/chat?id={chatId}
```

**Ответ:**
```json
{
  "chat": { /* данные чата */ },
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant",
      "parts": [
        {
          "type": "text",
          "text": "Сообщение"
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Удалить чат
```
DELETE /api/chat?id={chatId}
```

### 🔀 Forking и Merge Proposals

#### Форкнуть область
```
POST /api/areas/{id}/fork
```

**Тело запроса:**
```json
{
  "title": "Название новой области",
  "description": "Описание форка"
}
```

#### Получить дерево областей
```
GET /api/areas/{id}/tree
```

**Ответ:**
```json
{
  "tree": {
    "id": "uuid",
    "title": "Область",
    "children": [/* дочерние области */],
    "hasAccess": true
  },
  "currentAreaId": "uuid",
  "path": ["uuid1", "uuid2"]
}
```

### 👤 Users API

#### Найти пользователя по email
```
GET /api/users/by-email?email=user@example.com
```

**Ответ:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### 🌐 WebSocket API

#### Получить WebSocket URL
```
GET /api/ws?chatId={chatId}
```

**Ответ:**
```json
{
  "message": "Use standalone WebSocket server on port 3001",
  "wsUrl": "ws://localhost:3001?chatId={chatId}"
}
```

---

## Особенности работы

### Групповые чаты
- AI (Avrora) отвечает только при явном упоминании `@Avrora` или `@аврора`
- Все сообщения сохраняются, но AI игнорирует неадресованные сообщения
- При упоминании AI использует последние 20 сообщений как контекст

### Видимость и доступ
- **Private области**: только приглашенные участники
- **Public области**: любой авторизованный пользователь может читать
- **Личные чаты**: только владелец
- **Групповые чаты**: открыты для всех участников области

### Роли пользователей
- **owner**: полный контроль над областью
- **admin**: управление участниками, создание чатов
- **member**: чтение и участие в чатах

### Лимиты и квоты
- Ограничение по количеству сообщений в день в зависимости от типа пользователя
- Максимальный размер файлов: 10MB
- Поддержка изображений через специальный MegaLLM API

### AI Модели
- `chat-model`: стандартная модель для чатов
- `chat-model-reasoning`: модель с расширенными возможностями reasoning

---

## Коды ошибок

- `400`: Неверный запрос
- `401`: Не авторизован
- `403`: Доступ запрещен
- `404`: Ресурс не найден
- `429`: Превышен лимит запросов
- `500`: Внутренняя ошибка сервера

## OpenAPI Спецификация

Полная спецификация доступна по адресу:
```
GET /api/docs
```

Возвращает OpenAPI 3.0 JSON спецификацию для интеграции с внешними инструментами.