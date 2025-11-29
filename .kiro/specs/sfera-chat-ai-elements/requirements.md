# Requirements Document

## Introduction

Создание абсолютно новой страницы группового чата для Sfera с использованием AI SDK Elements и современной streaming архитектуры. Новая реализация будет построена с нуля, используя лучшие практики из AI SDK Elements примеров, и будет существовать параллельно со старой реализацией до полного тестирования.

## Glossary

- **Sfera** — коллаборативное пространство для групповых дискуссий с множеством участников
- **Message** — редактируемый документ в Sfera, который можно создать (пустым), редактировать, стримить контент, добавлять файлы, форкнуть
- **Mention** — упоминание участника (@username) или AI-агента (@avrora) в сообщении
- **Notification** — уведомление, которое получает упомянутый участник
- **AI Agent** — AI-участник (Avrora, Kristina), который получает уведомления и создает ответы
- **Streaming** — потоковая передача контента в существующее сообщение в реальном времени
- **Fork** — создание новой Sfera от конкретного сообщения
- **Empty Message** — пустое сообщение, созданное перед началом streaming
- **Tool Execution** — выполнение AI-инструментов (web search, image generation) внутри сообщения
- **AI SDK Elements** — набор React компонентов от Vercel для построения AI интерфейсов

## Requirements

### Requirement 1

**User Story:** Как пользователь, я хочу открыть новую страницу чата для Sfera, чтобы общаться с другими участниками и AI-агентами.

#### Acceptance Criteria

1. WHEN пользователь переходит на `/sfera/[id]/chat` THEN система SHALL отобразить новую страницу чата
2. WHEN страница загружается THEN система SHALL загрузить историю сообщений из Sfera
3. WHEN пользователь не является участником Sfera THEN система SHALL показать ошибку доступа
4. WHEN Sfera не существует THEN система SHALL показать 404 страницу
5. WHEN страница загружается THEN система SHALL отобразить заголовок с названием Sfera и количеством участников

### Requirement 2

**User Story:** Как пользователь, я хочу создавать сообщения в Sfera, чтобы общаться с другими участниками.

#### Acceptance Criteria

1. WHEN пользователь вводит текст THEN система SHALL активировать кнопку отправки
2. WHEN пользователь нажимает отправку THEN система SHALL создать новое сообщение в базе данных
3. WHEN сообщение создано THEN система SHALL отобразить его в чате немедленно
4. WHEN сообщение содержит текст THEN система SHALL сохранить его в поле content
5. WHEN сообщение создано THEN система SHALL очистить input поле

### Requirement 3

**User Story:** Как пользователь, я хочу упоминать участников в сообщениях, чтобы отправить им уведомления.

#### Acceptance Criteria

1. WHEN пользователь вводит @ символ THEN система SHALL показать список всех участников Sfera
2. WHEN пользователь выбирает участника THEN система SHALL вставить @username в текст
3. WHEN сообщение с упоминанием отправляется THEN система SHALL детектировать все mentions
4. WHEN mention детектирован THEN система SHALL отправить уведомление упомянутому участнику
5. WHEN сообщение отображается THEN система SHALL подсветить mentions другим цветом

### Requirement 4

**User Story:** Как пользователь, я хочу видеть reasoning и sources от AI-агентов, чтобы понимать их мыслительный процесс.

#### Acceptance Criteria

1. WHEN AI-агент использует reasoning THEN система SHALL отобразить Reasoning компонент с collapsible UI
2. WHEN пользователь кликает на Reasoning trigger THEN система SHALL развернуть/свернуть reasoning текст
3. WHEN AI-агент использует web search THEN система SHALL отобразить Sources компонент
4. WHEN пользователь кликает на source THEN система SHALL открыть ссылку в новой вкладке
5. WHEN reasoning streaming THEN система SHALL обновлять reasoning текст в реальном времени

### Requirement 5

**User Story:** Как пользователь, я хочу видеть все сообщения в хронологическом порядке, чтобы следить за беседой.

#### Acceptance Criteria

1. WHEN страница загружается THEN система SHALL отобразить сообщения в Conversation компоненте
2. WHEN сообщение от пользователя THEN система SHALL отобразить его с email автора и временем
3. WHEN сообщение от AI-агента THEN система SHALL отобразить его с badge агента
4. WHEN новое сообщение приходит THEN система SHALL автоматически прокрутить вниз
5. WHEN пользователь прокручивает вверх THEN система SHALL показать кнопку "Scroll to bottom"

### Requirement 6

**User Story:** Как пользователь, я хочу использовать actions для сообщений, чтобы управлять контентом.

#### Acceptance Criteria

1. WHEN пользователь наводит на своё сообщение THEN система SHALL показать MessageActions (Copy, Delete)
2. WHEN пользователь наводит на сообщение AI-агента THEN система SHALL показать MessageActions (Copy, Retry)
3. WHEN пользователь нажимает Copy THEN система SHALL скопировать текст в clipboard
4. WHEN пользователь нажимает Retry THEN система SHALL повторно сгенерировать ответ агента
5. WHEN пользователь нажимает Delete THEN система SHALL удалить своё сообщение

### Requirement 7

**User Story:** Как пользователь, я хочу прикреплять файлы к сообщениям, чтобы делиться изображениями и аудио.

#### Acceptance Criteria

1. WHEN пользователь кликает на кнопку attachments THEN система SHALL открыть file picker
2. WHEN пользователь выбирает изображение THEN система SHALL загрузить его и показать preview
3. WHEN пользователь выбирает аудио THEN система SHALL загрузить его и показать audio indicator
4. WHEN пользователь удаляет attachment THEN система SHALL удалить его из списка
5. WHEN сообщение с attachments отправляется THEN система SHALL отобразить attachments в сообщении

### Requirement 8

**User Story:** Как разработчик, я хочу создать новый API endpoint для чата с streaming, чтобы интегрировать с AI SDK.

#### Acceptance Criteria

1. WHEN клиент отправляет POST /api/sfera/[id]/chat THEN система SHALL вернуть streaming response
2. WHEN API получает сообщение THEN система SHALL сохранить его в sferaMessage таблицу
3. WHEN сообщение содержит упоминание агента THEN система SHALL вызвать streamText для агента
4. WHEN streamText генерирует ответ THEN система SHALL использовать toUIMessageStreamResponse
5. WHEN streaming завершается THEN система SHALL обновить сообщение агента в базе данных

### Requirement 9

**User Story:** Как пользователь, я хочу видеть статусы отправки и генерации, чтобы понимать что происходит.

#### Acceptance Criteria

1. WHEN пользователь отправляет сообщение THEN система SHALL показать Loader компонент
2. WHEN AI-агент генерирует ответ THEN система SHALL показать streaming indicator в сообщении
3. WHEN произошла ошибка THEN система SHALL показать error toast notification
4. WHEN сообщение успешно отправлено THEN система SHALL скрыть Loader
5. WHEN все агенты ответили THEN система SHALL скрыть все streaming indicators

### Requirement 10

**User Story:** Как AI-агент, я хочу получать уведомления об упоминаниях и создавать ответы, чтобы участвовать в дискуссии.

#### Acceptance Criteria

1. WHEN AI-агент получает уведомление об упоминании THEN система SHALL создать пустое сообщение от агента
2. WHEN пустое сообщение создано THEN система SHALL установить isGenerating в true
3. WHEN агент начинает генерировать ответ THEN система SHALL стримить контент в пустое сообщение
4. WHEN агент генерирует токены THEN система SHALL обновлять content поле в реальном времени
5. WHEN агент завершает генерацию THEN система SHALL установить isGenerating в false и сохранить финальный контент

### Requirement 11

**User Story:** Как пользователь, я хочу редактировать только свои сообщения, чтобы исправлять ошибки или добавлять информацию.

#### Acceptance Criteria

1. WHEN пользователь кликает Edit на своем сообщении THEN система SHALL загрузить content в input поле
2. WHEN пользователь пытается редактировать чужое сообщение THEN система SHALL запретить редактирование
3. WHEN пользователь редактирует текст THEN система SHALL показать "Editing" indicator
4. WHEN пользователь сохраняет изменения THEN система SHALL обновить content в базе данных
5. WHEN пользователь отменяет редактирование THEN система SHALL очистить input и вернуться к нормальному режиму

### Requirement 12

**User Story:** Как пользователь, я хочу форкать сообщения в новые Sfera, чтобы создавать ответвления дискуссий.

#### Acceptance Criteria

1. WHEN пользователь кликает Fork на сообщении THEN система SHALL создать новую Sfera
2. WHEN новая Sfera создается THEN система SHALL скопировать сообщение в новую Sfera
3. WHEN новая Sfera создается THEN система SHALL скопировать всех участников из родительской Sfera
4. WHEN fork создан THEN система SHALL установить isForked в true на оригинальном сообщении
5. WHEN fork создан THEN система SHALL перенаправить пользователя на новую Sfera

### Requirement 13

**User Story:** Как AI-агент, я хочу выполнять tools во время генерации ответа, чтобы предоставлять богатый контент.

#### Acceptance Criteria

1. WHEN AI-агент решает использовать tool THEN система SHALL вызвать соответствующий tool
2. WHEN tool выполняется THEN система SHALL показать tool execution indicator в сообщении
3. WHEN tool завершается THEN система SHALL сохранить результат в toolResults поле
4. WHEN tool результат получен THEN система SHALL отобразить его в сообщении
5. WHEN сообщение содержит toolResults THEN система SHALL отобразить их в специальном формате

### Requirement 14

**User Story:** Как пользователь, я хочу добавлять файлы к существующим сообщениям, чтобы дополнять контент.

#### Acceptance Criteria

1. WHEN пользователь редактирует сообщение THEN система SHALL показать кнопку добавления файлов
2. WHEN пользователь добавляет файл THEN система SHALL загрузить его на сервер
3. WHEN файл загружен THEN система SHALL добавить его в attachments массив
4. WHEN сообщение сохраняется THEN система SHALL обновить attachments в базе данных
5. WHEN сообщение отображается THEN система SHALL показать все attachments с preview

### Requirement 15

**User Story:** Как пользователь, я хочу получать прямые ссылки на сообщения, чтобы делиться ими с другими.

#### Acceptance Criteria

1. WHEN пользователь кликает на сообщение THEN система SHALL показать action "Copy Link"
2. WHEN пользователь копирует ссылку THEN система SHALL скопировать URL вида `/m/[messageId]`
3. WHEN пользователь переходит по ссылке `/m/[messageId]` THEN система SHALL открыть страницу с этим сообщением
4. WHEN страница сообщения открывается THEN система SHALL отобразить полное содержимое (text, attachments, toolResults, reasoning, sources)
5. WHEN сообщение имеет необычное содержимое THEN система SHALL отобразить его в специальном формате

### Requirement 16

**User Story:** Как пользователь, я хочу попросить AI-агента обработать чужое сообщение, чтобы получить анализ или трансформацию контента.

#### Acceptance Criteria

1. WHEN пользователь упоминает AI-агента с ссылкой на сообщение THEN система SHALL передать контент сообщения агенту
2. WHEN AI-агент получает ссылку на сообщение THEN система SHALL загрузить полный контент сообщения (text, attachments, toolResults)
3. WHEN AI-агент обрабатывает сообщение THEN система SHALL создать новое сообщение с результатом
4. WHEN AI-агент создает ответ THEN система SHALL указать parentMessageId на оригинальное сообщение
5. WHEN ответ отображается THEN система SHALL показать связь с оригинальным сообщением
