# Requirements Document

## Introduction

Улучшение Sfera API для повышения производительности, надёжности и масштабируемости. Ключевое изменение — переход от синхронной обработки AI-агентов к асинхронной webhook-based архитектуре, где агенты работают как независимые сервисы. Также требуется добавить пагинацию, улучшить валидацию, оптимизировать запросы к БД и внедрить систему уведомлений в реальном времени.

## Glossary

- **Sfera System**: Система коллаборативных пространств для обсуждений с поддержкой форков и веток
- **Message Threading**: Механизм создания древовидной структуры сообщений через parentMessageId
- **Fork Operation**: Создание нового Sfera пространства из существующего сообщения
- **Rate Limiter**: Компонент ограничения частоты запросов для предотвращения злоупотреблений
- **Pagination System**: Механизм постраничной загрузки данных с курсорами
- **Validation Layer**: Слой валидации входных данных с использованием Zod схем
- **Transaction Manager**: Компонент управления транзакциями базы данных
- **AI Agent Service**: Внешний сервис AI-агента, работающий независимо от основного API
- **Notification System**: Система уведомлений для отправки событий AI-агентам
- **Webhook Endpoint**: HTTP endpoint AI-агента для получения уведомлений о событиях
- **Agent Registry**: Реестр зарегистрированных AI-агентов с их webhook URLs
- **Idempotency Key**: Уникальный идентификатор запроса для предотвращения дублирования операций
- **Message Type**: Тип сообщения (user, agent, system) для различения источника
- **Webhook Signature**: HMAC-SHA256 подпись webhook payload для проверки подлинности
- **Health Status**: Статус доступности AI-агента (healthy, unhealthy, unknown)
- **Priority Level**: Уровень приоритета webhook (high, normal, low)

## Requirements

### Requirement 1

**User Story:** Как пользователь, я хочу быстро загружать большие списки сообщений, чтобы не ждать загрузки всех данных сразу.

#### Acceptance Criteria

1. WHEN пользователь запрашивает сообщения Sfera, THE Sfera System SHALL возвращать результаты с пагинацией по 50 элементов
2. WHEN пользователь запрашивает следующую страницу, THE Sfera System SHALL использовать cursor-based пагинацию для эффективной загрузки
3. WHEN запрос содержит параметр limit, THE Sfera System SHALL ограничивать результаты указанным значением от 1 до 100
4. WHEN достигнут конец списка, THE Sfera System SHALL возвращать hasMore равным false

### Requirement 2

**User Story:** Как разработчик, я хочу иметь строгую валидацию всех API запросов, чтобы предотвратить ошибки и уязвимости.

#### Acceptance Criteria

1. WHEN API получает запрос, THE Validation Layer SHALL проверять все входные параметры через Zod схемы
2. WHEN валидация не проходит, THE Sfera System SHALL возвращать ошибку 400 с детальным описанием проблемы
3. WHEN запрос содержит неизвестные поля, THE Validation Layer SHALL игнорировать их или возвращать ошибку в зависимости от strict режима
4. WHEN email адрес передан в запросе, THE Validation Layer SHALL проверять его формат через email валидатор

### Requirement 3

**User Story:** Как администратор системы, я хочу контролировать нагрузку на API, чтобы предотвратить злоупотребления и перегрузку.

#### Acceptance Criteria

1. WHEN пользователь делает запросы к API, THE Rate Limiter SHALL отслеживать количество запросов за временное окно
2. WHEN превышен лимит запросов, THE Sfera System SHALL возвращать ошибку 429 с информацией о времени ожидания
3. WHEN пользователь является владельцем Sfera, THE Rate Limiter SHALL применять повышенные лимиты
4. WHEN запрос от AI агента, THE Rate Limiter SHALL использовать отдельные лимиты для агентов

### Requirement 4

**User Story:** Как пользователь, я хочу получать только необходимые данные в ответах API, чтобы ускорить загрузку и снизить трафик.

#### Acceptance Criteria

1. WHEN запрашиваются сообщения, THE Sfera System SHALL возвращать только запрошенные поля через select параметр
2. WHEN запрашивается список Sfera, THE Sfera System SHALL не включать полный контент сообщений по умолчанию
3. WHEN нужна детальная информация, THE Sfera System SHALL поддерживать параметр include для загрузки связанных данных
4. WHEN возвращаются пользовательские данные, THE Sfera System SHALL исключать чувствительную информацию

### Requirement 5

**User Story:** Как разработчик, я хочу иметь атомарные операции для сложных действий, чтобы гарантировать целостность данных.

#### Acceptance Criteria

1. WHEN выполняется fork операция, THE Transaction Manager SHALL выполнять все шаги в одной транзакции
2. WHEN транзакция не удалась, THE Transaction Manager SHALL откатывать все изменения
3. WHEN создаётся Sfera с членами, THE Transaction Manager SHALL создавать Sfera и членов атомарно
4. WHEN удаляется сообщение с форками, THE Sfera System SHALL предотвращать удаление через constraint проверку

### Requirement 6

**User Story:** Как пользователь, я хочу искать сообщения в Sfera, чтобы быстро находить нужную информацию.

#### Acceptance Criteria

1. WHEN пользователь вводит поисковый запрос, THE Sfera System SHALL искать по содержимому сообщений
2. WHEN поиск выполняется, THE Sfera System SHALL использовать полнотекстовый поиск PostgreSQL
3. WHEN найдены результаты, THE Sfera System SHALL возвращать их с пагинацией
4. WHEN поиск не дал результатов, THE Sfera System SHALL возвращать пустой массив с hasMore равным false

### Requirement 7

**User Story:** Как пользователь, я хочу фильтровать сообщения по различным критериям, чтобы видеть только релевантные данные.

#### Acceptance Criteria

1. WHEN указан фильтр по автору, THE Sfera System SHALL возвращать только сообщения указанного пользователя
2. WHEN указан фильтр по дате, THE Sfera System SHALL возвращать сообщения в указанном временном диапазоне
3. WHEN указан фильтр hasAttachments, THE Sfera System SHALL возвращать только сообщения с вложениями
4. WHEN указан фильтр isForked, THE Sfera System SHALL возвращать только сообщения, которые были форкнуты

### Requirement 8

**User Story:** Как разработчик, я хочу иметь оптимизированные запросы к базе данных, чтобы минимизировать время ответа API.

#### Acceptance Criteria

1. WHEN загружаются сообщения с авторами, THE Sfera System SHALL использовать JOIN вместо N+1 запросов
2. WHEN проверяются права доступа, THE Sfera System SHALL кэшировать результаты проверки на время запроса
3. WHEN запрашиваются счётчики, THE Sfera System SHALL использовать агрегатные запросы вместо загрузки всех данных
4. WHEN выполняется сложный запрос, THE Sfera System SHALL использовать индексы базы данных

### Requirement 9

**User Story:** Как AI-агент, я хочу получать уведомления о упоминаниях в Sfera через webhook, чтобы обрабатывать их как отдельный сервис.

#### Acceptance Criteria

1. WHEN пользователь упоминает AI-агента в сообщении, THE Notification System SHALL отправлять HTTP POST запрос на webhook URL агента
2. WHEN webhook запрос отправляется, THE Notification System SHALL включать полный контекст сообщения и Sfera
3. WHEN webhook недоступен, THE Notification System SHALL повторять попытки с exponential backoff до 3 раз
4. WHEN все попытки не удались, THE Notification System SHALL логировать ошибку и создавать системное сообщение в Sfera
5. WHEN AI-агент регистрируется, THE Agent Registry SHALL сохранять его webhook URL и authentication token
6. WHEN отправляется webhook, THE Notification System SHALL подписывать payload через HMAC-SHA256 с секретом агента
7. WHEN агент получает webhook, THE AI Agent Service SHALL проверять подпись перед обработкой

### Requirement 10

**User Story:** Как администратор, я хочу иметь детальное логирование API операций, чтобы отслеживать проблемы и аномалии.

#### Acceptance Criteria

1. WHEN выполняется API запрос, THE Sfera System SHALL логировать метод, путь, userId и timestamp
2. WHEN происходит ошибка, THE Sfera System SHALL логировать полный stack trace и контекст
3. WHEN выполняется критическая операция, THE Sfera System SHALL логировать детали операции для аудита
4. WHEN превышен rate limit, THE Sfera System SHALL логировать информацию о пользователе и запросе

### Requirement 11

**User Story:** Как AI-агент, я хочу отправлять свои ответы обратно в Sfera через API, чтобы пользователи видели мои сообщения.

#### Acceptance Criteria

1. WHEN AI-агент генерирует ответ, THE Sfera System SHALL принимать POST запрос с authentication token агента
2. WHEN агент отправляет сообщение, THE Sfera System SHALL проверять что агент является членом Sfera
3. WHEN агент отправляет streaming ответ, THE Sfera System SHALL поддерживать PATCH запросы для обновления контента
4. WHEN агент завершает ответ, THE Sfera System SHALL устанавливать isGenerating в false
5. WHEN агент использует tools, THE Sfera System SHALL сохранять toolResults в JSONB поле
6. WHEN агент отправляет слишком много запросов, THE Rate Limiter SHALL возвращать 429 с retry-after header
7. WHEN агент превышает лимит символов в сообщении, THE Sfera System SHALL возвращать ошибку 413

### Requirement 12

**User Story:** Как разработчик AI-агента, я хочу регистрировать своего агента в системе, чтобы он мог получать уведомления.

#### Acceptance Criteria

1. WHEN регистрируется новый агент, THE Agent Registry SHALL сохранять webhook URL, authentication token и metadata
2. WHEN агент обновляет конфигурацию, THE Agent Registry SHALL валидировать webhook URL через test ping
3. WHEN агент удаляется, THE Agent Registry SHALL удалять все связанные данные и отзывать токены
4. WHEN запрашивается список агентов, THE Agent Registry SHALL возвращать только активных агентов с валидными webhooks

### Requirement 13

**User Story:** Как пользователь, я хочу получать WebSocket уведомления о новых сообщениях в реальном времени, чтобы видеть обновления без перезагрузки.

#### Acceptance Criteria

1. WHEN создаётся новое сообщение, THE Sfera System SHALL отправлять WebSocket событие всем подключённым членам Sfera
2. WHEN обновляется сообщение агента, THE Sfera System SHALL отправлять incremental updates через WebSocket
3. WHEN пользователь подключается, THE Sfera System SHALL подписывать его на события всех его Sfera
4. WHEN пользователь отключается, THE Sfera System SHALL очищать все подписки

### Requirement 14

**User Story:** Как AI-агент, я хочу получать контекст предыдущих сообщений в webhook payload, чтобы генерировать релевантные ответы.

#### Acceptance Criteria

1. WHEN отправляется webhook, THE Notification System SHALL включать последние 30 сообщений из Sfera
2. WHEN сообщение имеет parentMessageId, THE Notification System SHALL включать полную цепочку родительских сообщений
3. WHEN Sfera имеет artifacts, THE Notification System SHALL включать ссылки на связанные документы
4. WHEN payload превышает 1MB, THE Notification System SHALL отправлять только ссылки на сообщения вместо полного контента

### Requirement 15

**User Story:** Как AI-агент, я хочу безопасно обрабатывать дубликаты webhook, чтобы не создавать повторные ответы.

#### Acceptance Criteria

1. WHEN отправляется webhook, THE Notification System SHALL включать уникальный idempotency key
2. WHEN агент отправляет ответ с idempotency key, THE Sfera System SHALL проверять что сообщение с таким ключом не существует
3. WHEN обнаружен дубликат запроса, THE Sfera System SHALL возвращать 200 OK с существующим сообщением
4. WHEN idempotency key истёк (старше 24 часов), THE Sfera System SHALL разрешать создание нового сообщения

### Requirement 16

**User Story:** Как разработчик, я хочу различать типы сообщений, чтобы правильно их обрабатывать и отображать.

#### Acceptance Criteria

1. WHEN создаётся сообщение, THE Sfera System SHALL устанавливать поле messageType в user, agent или system
2. WHEN AI-агент создаёт сообщение, THE Sfera System SHALL автоматически устанавливать messageType в agent
3. WHEN происходит системное событие, THE Sfera System SHALL создавать сообщение с messageType равным system
4. WHEN фильтруются сообщения, THE Sfera System SHALL поддерживать фильтр по messageType

### Requirement 17

**User Story:** Как администратор, я хочу мониторить доступность AI-агентов, чтобы быстро реагировать на проблемы.

#### Acceptance Criteria

1. WHEN агент не отвечает на webhook, THE Agent Registry SHALL помечать агент как unhealthy после 3 неудачных попыток
2. WHEN агент unhealthy, THE Sfera System SHALL не отправлять новые webhook до восстановления
3. WHEN агент восстанавливается, THE Agent Registry SHALL автоматически помечать его как healthy после успешного webhook
4. WHEN запрашивается статус агентов, THE Agent Registry SHALL возвращать health status и последнее время ответа

### Requirement 18

**User Story:** Как AI-агент, я хочу получать приоритетные уведомления быстрее, чтобы отвечать на важные сообщения первыми.

#### Acceptance Criteria

1. WHEN пользователь упоминает агента напрямую, THE Notification System SHALL отправлять webhook с priority равным high
2. WHEN агент упомянут в thread, THE Notification System SHALL устанавливать priority в normal
3. WHEN агент упомянут в большой группе, THE Notification System SHALL устанавливать priority в low
4. WHEN обрабатываются webhook, THE Notification System SHALL отправлять high priority первыми
