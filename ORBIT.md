# Orbit - Новый фронтенд для Sfera

## Обзор

**Orbit** — это современный фронтенд для функциональности Sfera с улучшенным дизайном и user experience. Использует те же API endpoints, что и Sfera, но с совершенно новым интерфейсом.

## Основные отличия от Sfera

### Дизайн
- **Градиенты**: Использование gradient backgrounds (blue-purple-pink) для более современного вида
- **Анимации**: Плавные transitions и hover эффекты
- **Улучшенная типографика**: Gradient text для заголовков
- **Скруглённые углы**: Rounded-3xl вместо Rounded-2xl для более мягкого вида
- **Тени и блур**: Shadow-lg и backdrop-blur для глубины

### UX улучшения
- **Hover эффекты**: Сообщения scale при наведении
- **Inline actions**: Действия появляются при hover
- **Better feedback**: Тосты для всех операций
- **Счётчик символов**: В форме ввода
- **Show more/less**: Для длинных сообщений

### Компоненты

#### OrbitInput ([components/orbit/orbit-input.tsx](components/orbit/orbit-input.tsx))
- Увеличенная высота (48px min)
- Градиентные кнопки отправки
- Счётчик символов
- Улучшенные preview для attachments
- Лучшие индикаторы reply/edit

#### OrbitMessage ([components/orbit/orbit-message.tsx](components/orbit/orbit-message.tsx))
- Использует `<article>` вместо `<div>` для accessibility
- Gradient badges для AI сообщений
- Плавная анимация scale при hover
- Inline action buttons с gradients
- Лучшее отображение parent messages

#### OrbitChat ([components/orbit/orbit-chat.tsx](components/orbit/orbit-chat.tsx))
- Gradient background для всей страницы
- Backdrop blur для header и footer
- Improved empty states
- Better loading indicators

## Роуты

### Список Orbit
```
/orbits
```
- График визуализация всех Orbit
- Улучшенные node cards с градиентами
- Анимированные связи между форками

### Создание Orbit
```
/orbits/new
```
- Современная форма создания
- Validation feedback
- Gradient submit button

### Просмотр Orbit
```
/orbit/[id]
```
- Полнофункциональный чат
- Поддержка fork, reply, edit, delete
- @Avrora AI integration

## API Integration

Orbit использует те же API endpoints, что и Sfera:

- `GET /api/sfera` - список Orbit
- `POST /api/sfera` - создание Orbit
- `GET /api/sfera/[id]` - получение Orbit
- `POST /api/sfera/[id]/messages` - отправка сообщения
- `PATCH /api/sfera/[id]/messages/[messageId]` - редактирование сообщения
- `DELETE /api/sfera/[id]/messages/[messageId]` - удаление сообщения
- `POST /api/sfera/[id]/fork` - fork сообщения или Orbit

Нет необходимости в отдельных API - всё работает через существующие endpoints!

## Технологии

- **Next.js 15.3.0**: App Router с RSC
- **React 19 RC**: Latest features
- **Tailwind CSS v4**: Modern styling
- **shadcn/ui**: Component library
- **Lucide React**: Icons
- **Sonner**: Toast notifications

## Цветовая схема

- **Primary**: Blue 600 (`#2563eb`)
- **Secondary**: Purple 600 (`#9333ea`)
- **Accent**: Pink 50-200
- **AI Messages**: Blue-purple-pink gradient
- **Backgrounds**: Subtle gradients from gray-blue-purple

## Особенности

### Fork Functionality
- Визуальное отображение forked messages
- "Enter Fork" button для перехода
- Gradient badges для статуса fork

### @Avrora AI
- Sparkles icon для AI сообщений
- Gradient badge "Avrora AI"
- Highlighted mentions в тексте

### Threading
- Reply to любому сообщению
- Контекст родительского сообщения
- Визуальные индикаторы threads

### Attachments
- Image upload и preview
- Drag and drop support (planned)
- Inline отображение в messages

## Запуск

```bash
# Development
pnpm dev

# Откройте
http://localhost:3001/orbits
```

## Миграция с Sfera

Orbit и Sfera могут работать параллельно:

- Используют одну БД
- Одни и те же API
- Совместимые данные

Пользователи могут выбирать между `/sferas` (старый UI) и `/orbits` (новый UI).

## Будущие улучшения

- [ ] Keyboard shortcuts
- [ ] Rich text editor
- [ ] Markdown support
- [ ] Emoji picker
- [ ] File drag and drop
- [ ] Real-time updates via WebSocket
- [ ] Dark mode
- [ ] Mobile optimizations
- [ ] Accessibility improvements

## Кредиты

Создано с использованием:
- shadcn/ui components
- Tailwind CSS gradients
- Lucide icons
- Next.js 15
