import { NextResponse } from 'next/server';

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Avrora Chat API',
      version: '1.0.0',
      description: 'API для чат-системы с ИИ и управлением областями (Areas)',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://your-domain.com' 
          : 'http://localhost:3000',
      },
    ],
    security: [{ bearerAuth: [] }],
    paths: {
      // Chat API
      '/api/chat': {
        post: {
          summary: 'Отправить сообщение в чат',
          description: 'Отправляет сообщение пользователя и получает ответ от ИИ',
          tags: ['Chat'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid', description: 'ID чата' },
                    message: { $ref: '#/components/schemas/ChatMessage' },
                    selectedChatModel: { 
                      type: 'string', 
                      enum: ['chat-model', 'chat-model-reasoning'] 
                    },
                    selectedVisibilityType: { 
                      type: 'string', 
                      enum: ['public', 'private'] 
                    }
                  },
                  required: ['id', 'message', 'selectedChatModel', 'selectedVisibilityType']
                }
              }
            }
          },
          responses: {
            200: { description: 'Успешный ответ с потоком сообщений' },
            400: { description: 'Ошибка валидации запроса' },
            401: { description: 'Не авторизован' },
            403: { description: 'Доступ запрещен' },
            429: { description: 'Превышен лимит сообщений' }
          }
        },
        get: {
          summary: 'Получить чат с сообщениями',
          description: 'Возвращает информацию о чате и все сообщения',
          tags: ['Chat'],
          security: [{ bearerAuth: [] }],
          parameters: [{
            in: 'query',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID чата'
          }],
          responses: {
            200: { description: 'Успешный ответ' },
            400: { description: 'Отсутствует параметр id' },
            401: { description: 'Не авторизован' },
            403: { description: 'Доступ запрещен' },
            404: { description: 'Чат не найден' }
          }
        },
        delete: {
          summary: 'Удалить чат',
          description: 'Удаляет чат и все связанные сообщения',
          tags: ['Chat'],
          security: [{ bearerAuth: [] }],
          parameters: [{
            in: 'query',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID чата для удаления'
          }],
          responses: {
            200: { description: 'Чат успешно удален' },
            400: { description: 'Отсутствует параметр id' },
            401: { description: 'Не авторизован' },
            403: { description: 'Доступ запрещен' },
            404: { description: 'Чат не найден' }
          }
        }
      },
      '/api/chat/{id}/stream': {
        get: {
          summary: 'Потоковый чат',
          description: 'Получить потоковое соединение для чата',
          tags: ['Chat'],
          security: [{ bearerAuth: [] }],
          parameters: [{
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID чата'
          }],
          responses: {
            200: { description: 'Потоковое соединение установлено' },
            401: { description: 'Не авторизован' },
            403: { description: 'Доступ запрещен' },
            404: { description: 'Чат не найден' }
          }
        }
      },

      // Areas API
      '/api/areas': {
        get: {
          summary: 'Получить areas пользователя',
          description: 'Возвращает список всех областей (areas) текущего пользователя',
          tags: ['Areas'],
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Список areas' },
            401: { description: 'Не авторизован' }
          }
        },
        post: {
          summary: 'Создать новую area',
          description: 'Создает новую область (area) для организации чатов',
          tags: ['Areas'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Название area' },
                    description: { type: 'string', description: 'Описание area' },
                    visibility: { 
                      type: 'string', 
                      enum: ['public', 'private'], 
                      default: 'private' 
                    }
                  },
                  required: ['title']
                }
              }
            }
          },
          responses: {
            201: { description: 'Area создана' },
            400: { description: 'Неверные данные' },
            401: { description: 'Не авторизован' }
          }
        }
      },

      // Files API
      '/api/files/upload': {
        post: {
          summary: 'Загрузить файл',
          description: 'Загружает файл на сервер (изображения, документы, видео)',
          tags: ['Files'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'Файл для загрузки (макс 10MB)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Файл загружен' },
            400: { description: 'Неверный файл или превышен размер' },
            401: { description: 'Не авторизован' }
          }
        }
      },

      // Auth API
      '/api/auth/guest': {
        get: {
          summary: 'Гостевая аутентификация',
          description: 'Войти как гость (для тестирования)',
          tags: ['Auth'],
          parameters: [{
            in: 'query',
            name: 'redirectUrl',
            schema: { type: 'string' },
            description: 'URL для перенаправления после входа'
          }],
          responses: {
            302: { description: 'Перенаправление на главную страницу' }
          }
        }
      },

      // WebSocket API
      '/api/ws': {
        get: {
          summary: 'WebSocket соединение',
          description: 'Устанавливает WebSocket соединение для реального времени',
          tags: ['WebSocket'],
          security: [{ bearerAuth: [] }],
          parameters: [{
            in: 'query',
            name: 'chatId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'ID чата'
          }],
          responses: {
            200: { description: 'WebSocket URL для подключения' },
            400: { description: 'Отсутствует chatId' },
            401: { description: 'Не авторизован' },
            403: { description: 'Доступ запрещен' },
            404: { description: 'Чат не найден' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            role: { type: 'string', enum: ['user'] },
            parts: {
              type: 'array',
              items: {
                oneOf: [
                  {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['text'] },
                      text: { type: 'string', minLength: 1, maxLength: 2000 }
                    },
                    required: ['type', 'text']
                  },
                  {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['file'] },
                      mediaType: { type: 'string' },
                      name: { type: 'string', minLength: 1, maxLength: 100 },
                      url: { type: 'string', format: 'uri' }
                    },
                    required: ['type', 'mediaType', 'name', 'url']
                  }
                ]
              }
            }
          },
          required: ['id', 'role', 'parts']
        },
        Area: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            ownerId: { type: 'string', format: 'uuid' },
            visibility: { type: 'string', enum: ['public', 'private'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  };

  return NextResponse.json(spec);
}
