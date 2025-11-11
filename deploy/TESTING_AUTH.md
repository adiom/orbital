# Тестирование авторизации в режиме разработки

## Быстрый старт

Для тестирования production-поведения авторизации в dev-режиме:

1. Создайте файл `.env.local` в корне проекта (если его еще нет)

2. Добавьте следующие переменные:

```bash
# Включить тестирование production-авторизации
TEST_PRODUCTION_AUTH=true

# URL для NextAuth (важно для правильной работы cookies)
NEXTAUTH_URL=http://localhost:3000

# Секреты (должны совпадать с production)
AUTH_SECRET=your-secret-here
NEXTAUTH_SECRET=your-secret-here
```

3. Перезапустите dev-сервер:

```bash
pnpm dev
```

## Важные моменты

### Secure Cookies в Dev-режиме

По умолчанию в dev-режиме secure cookies **отключены**, потому что:
- Локальный dev-сервер обычно работает по HTTP (не HTTPS)
- Браузеры не отправляют secure cookies по HTTP

Когда `TEST_PRODUCTION_AUTH=true`:
- Secure cookies **включаются** (как в production)
- Это означает, что cookies будут работать **только по HTTPS**
- Для локального тестирования вам нужно настроить HTTPS

### Варианты тестирования

#### Вариант 1: Тестирование без secure cookies (по умолчанию)

Просто запустите dev-сервер без `TEST_PRODUCTION_AUTH`:

```bash
pnpm dev
```

Авторизация будет работать, но без secure cookies (как обычно в dev).

#### Вариант 2: Тестирование с secure cookies (как в production)

1. Настройте локальный HTTPS (см. ниже)
2. Установите `TEST_PRODUCTION_AUTH=true` в `.env.local`
3. Запустите dev-сервер

#### Вариант 3: Тестирование на staging/production-подобном окружении

Используйте тот же конфиг, что и в production, но с тестовыми данными.

## Настройка локального HTTPS для тестирования

### Использование mkcert (рекомендуется)

1. Установите mkcert:
   ```bash
   # macOS
   brew install mkcert
   
   # Linux
   # См. https://github.com/FiloSottile/mkcert
   ```

2. Создайте локальный CA:
   ```bash
   mkcert -install
   ```

3. Создайте сертификаты для localhost:
   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

4. Настройте Next.js для использования HTTPS:
   - Используйте `next dev --experimental-https` (если поддерживается)
   - Или используйте reverse proxy (nginx/caddy) с SSL

### Использование ngrok (для внешнего доступа)

```bash
# Установите ngrok
brew install ngrok

# Запустите туннель
ngrok http 3000

# Используйте HTTPS URL от ngrok в NEXTAUTH_URL
```

## Проверка работы авторизации

1. Откройте DevTools → Application → Cookies
2. Проверьте наличие cookie `next-auth.session-token` или `__Secure-next-auth.session-token`
3. Проверьте, что middleware правильно читает токен:
   - Откройте Network tab
   - Проверьте запросы к защищенным роутам
   - Убедитесь, что нет редиректов на `/api/auth/guest`

## Отладка проблем

### Cookies не устанавливаются

- Проверьте, что `NEXTAUTH_URL` совпадает с URL в браузере
- Убедитесь, что `AUTH_SECRET` и `NEXTAUTH_SECRET` установлены и совпадают
- Проверьте, что домен в cookies правильный (не `localhost` vs `127.0.0.1`)

### Secure cookies не работают по HTTP

Это нормально! Secure cookies требуют HTTPS. Либо:
- Используйте HTTPS локально (см. выше)
- Или тестируйте без `TEST_PRODUCTION_AUTH=true`

### Middleware не находит токен

- Проверьте, что `AUTH_SECRET` в middleware совпадает с `NEXTAUTH_SECRET` в NextAuth
- Убедитесь, что cookie отправляется в запросах (проверьте в DevTools)
- Проверьте логи middleware (добавьте `console.log` для отладки)

## Переменные окружения

| Переменная | Описание | Обязательна |
|-----------|----------|-------------|
| `TEST_PRODUCTION_AUTH` | Включить secure cookies в dev | Нет |
| `NEXTAUTH_URL` | Базовый URL приложения | Да (для production) |
| `AUTH_SECRET` | Секрет для middleware | Да |
| `NEXTAUTH_SECRET` | Секрет для NextAuth | Да |

**Важно:** `AUTH_SECRET` и `NEXTAUTH_SECRET` должны быть **одинаковыми**!






