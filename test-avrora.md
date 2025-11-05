# Тестирование Avrora

## Запуск системы

### 1. Запустить Next.js сервер
```bash
# Терминал 1
pnpm run dev
```
Откроется http://localhost:3000

### 2. Запустить WebSocket сервер
```bash
# Терминал 2
pnpm run dev:ws
```
Запустится ws://localhost:3001

## Тестирование через браузер

### Шаг 1: Авторизация
1. Откройте http://localhost:3000
2. Войдите или зарегистрируйтесь

### Шаг 2: Проверка Areas
1. Откройте http://localhost:3000/areas
2. Вы должны увидеть список своих Areas (если есть)
3. Можно увидеть фильтры: All Areas, Root Areas, Forked Areas

### Шаг 3: Создание Area (через API)
```bash
# Сначала получите session token из браузера (DevTools > Application > Cookies)

# Создать новую Area
curl -X POST http://localhost:3000/api/areas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Моя первая Area",
    "description": "Тестовая Area для Avrora",
    "visibility": "private"
  }'
```

### Шаг 4: Просмотр Area
1. После создания скопируйте `id` из ответа
2. Откройте http://localhost:3000/area/{id}
3. Вы должны увидеть:
   - Заголовок Area
   - Sidebar с деревом навигации
   - Количество участников
   - Кнопки управления (если вы owner/admin)

## Тестирование API endpoints

### 1. Получить список Areas
```bash
curl http://localhost:3000/api/areas
```

### 2. Получить конкретную Area
```bash
curl http://localhost:3000/api/areas/{area_id}
```

### 3. Создать Area
```bash
curl -X POST http://localhost:3000/api/areas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Area",
    "description": "Description",
    "visibility": "private"
  }'
```

**Автоматически создаётся:**
- Area с указанными параметрами
- Владелец добавляется как участник с ролью "owner"
- **Default group chat** с названием "{Title} - General"
- Владелец добавляется как admin в default chat

### 4. Форкнуть Area
```bash
curl -X POST http://localhost:3000/api/areas/{parent_area_id}/fork \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Forked Area",
    "description": "Child area"
  }'
```

Ответ будет содержать `inheritedSummary` - AI-generated summary родительской Area!

### 5. Получить дерево Area
```bash
curl http://localhost:3000/api/areas/{area_id}/tree
```

### 6. Добавить участника в Area
```bash
curl -X POST http://localhost:3000/api/areas/{area_id}/members \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{user_id}",
    "role": "member"
  }'
```

**Автоматически происходит:**
- Участник добавляется в Area с указанной ролью
- Участник **автоматически добавляется в default group chat** Area
- Роль в чате: admin (если owner/admin в Area) или member

### 7. Получить участников Area
```bash
curl http://localhost:3000/api/areas/{area_id}/members
```

### 8. Создать групповой чат в Area
```bash
curl -X POST http://localhost:3000/api/areas/{area_id}/chats \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Обсуждение проекта",
    "chatType": "group",
    "memberUserIds": ["{user_id_1}", "{user_id_2}"]
  }'
```

Ответ будет содержать `chat.id` - используйте его для подключения к WebSocket!

### 9. Получить список чатов в Area
```bash
curl http://localhost:3000/api/areas/{area_id}/chats
```

### 10. Добавить участника в групповой чат
```bash
curl -X POST http://localhost:3000/api/chats/{chat_id}/members \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{user_id}",
    "role": "member"
  }'
```

### 11. Получить участников чата
```bash
curl http://localhost:3000/api/chats/{chat_id}/members
```

## Тестирование групповых чатов

### Полный сценарий тестирования:

1. **Создать Area** (если еще нет):
```bash
AREA_RESPONSE=$(curl -X POST http://localhost:3000/api/areas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Area",
    "description": "For group chat testing",
    "visibility": "private"
  }')
echo $AREA_RESPONSE
# Сохраните area_id из ответа
```

2. **Создать групповой чат**:
```bash
CHAT_RESPONSE=$(curl -X POST http://localhost:3000/api/areas/{area_id}/chats \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Групповой чат для тестирования",
    "chatType": "group"
  }')
echo $CHAT_RESPONSE
# Сохраните chat_id из ответа
```

3. **Добавить участников** (опционально):
```bash
curl -X POST http://localhost:3000/api/chats/{chat_id}/members \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{another_user_id}",
    "role": "member"
  }'
```

4. **Подключиться к WebSocket** и отправить сообщение с упоминанием @avrora (см. ниже)

## Тестирование WebSocket

### Через JavaScript в браузере:
```javascript
// Откройте DevTools > Console на localhost:3000

// 1. Подключиться к WebSocket (используйте chat_id из предыдущего шага)
const ws = new WebSocket('ws://localhost:3001?chatId=YOUR_CHAT_ID&token=dev_YOUR_USER_ID');

// 2. Обработчики
ws.onopen = () => {
  console.log('✅ Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Received:', data);
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

// 3. Отправить сообщение
ws.send(JSON.stringify({
  type: 'chat_message',
  messageId: 'msg-123',
  content: '@avrora привет, как дела?'
}));

// 4. Отправить typing indicator
ws.send(JSON.stringify({
  type: 'typing',
  isTyping: true
}));

// 5. Ping
ws.send(JSON.stringify({
  type: 'ping'
}));
```

### Через wscat (CLI tool):
```bash
# Установить wscat
npm install -g wscat

# Подключиться
wscat -c "ws://localhost:3001?chatId=test-chat&token=dev_user123"

# Отправить сообщение
{"type":"chat_message","messageId":"msg-1","content":"@avrora hello"}

# Отправить typing
{"type":"typing","isTyping":true}

# Ping
{"type":"ping"}
```

## Тестирование Mention системы

### 1. Парсинг mentions
```javascript
// В Node.js или DevTools Console (после импорта)
import { parseMentions, hasAvroraMention } from '@/lib/mentions/parser';

const text = "Hey @avrora, можешь помочь? @john тоже посмотри";
const mentions = parseMentions(text);
console.log(mentions);
// [
//   { type: 'avrora', username: 'avrora', start: 4, end: 11, text: '@avrora' },
//   { type: 'user', username: 'john', start: 38, end: 43, text: '@john' }
// ]

console.log(hasAvroraMention(text)); // true
```

### 2. Intent detection
```javascript
import { detectIntent } from '@/lib/mentions/intent-detection';

const intent1 = detectIntent("@avrora как создать новый документ?", true);
console.log(intent1);
// { shouldRespond: true, confidence: 'high', reason: 'Direct mention of @avrora', intent: 'question' }

const intent2 = detectIntent("просто обсуждаем идею", true);
console.log(intent2);
// { shouldRespond: false, confidence: 'high', reason: 'No @avrora mention in group chat' }
```

## Проверка Area Tree навигации

1. Создайте root Area
2. Форкните её несколько раз
3. Откройте любую Area
4. В левом sidebar должно быть дерево:
   - Root Area (с иконкой FolderTree)
   - └─ Child Area 1 (с иконкой GitBranch)
   - └─ Child Area 2 (с иконкой GitBranch)
5. Клик по любой Area перенаправит на её страницу
6. Текущая Area подсвечена

## Проверка Inherited Summary

1. Создайте Area с несколькими чатами и сообщениями
2. Форкните её через API:
```bash
curl -X POST http://localhost:3000/api/areas/{parent_id}/fork \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Форк для тестирования",
    "description": "Проверка AI summary"
  }'
```
3. В ответе будет поле `inheritedSummary` - AI-сгенерированный summary
4. Откройте forked Area в браузере
5. Вверху страницы должен быть блок "Inherited Context" с этим summary

## Что проверить:

✅ **Backend:**
- [ ] API создания Area работает
- [ ] API форка создает inheritedSummary
- [ ] API tree возвращает корректную иерархию
- [ ] WebSocket принимает подключения
- [ ] WebSocket broadcast работает

✅ **Frontend:**
- [ ] Страница /areas отображается
- [ ] Фильтры работают
- [ ] Страница /area/{id} отображается
- [ ] Area tree навигация работает
- [ ] Inherited summary отображается для forked Areas

✅ **Mention система:**
- [ ] Парсинг @avrora работает
- [ ] Intent detection определяет намерения
- [ ] В group chat без @avrora AI не отвечает

## Дебаг

### Проверить логи WebSocket:
```bash
# В терминале где запущен dev:ws
# Должны видеть:
# ✅ Saved X mentions for message...
# 📨 Broadcasted to chat...
# Client {id} joined chat...
```

### Проверить БД:
```bash
pnpm run db:studio
```
Откроется Drizzle Studio на http://localhost:4983

### Проверить TypeScript ошибки:
```bash
npx tsc --noEmit
```

## Известные ограничения:

⚠️ **Текущая версия:**
1. UI для создания Area через интерфейс еще не реализован (только API)
2. Миграция для MessageMention еще не применена (таблица может отсутствовать)
3. Chat integration с mentions еще не подключена
4. Merge proposals UI не реализован

💡 **Для полного тестирования нужно:**
1. Применить миграцию для MessageMention
2. Интегрировать mention detection в существующий chat flow
3. Добавить модальные окна для создания/редактирования Areas
