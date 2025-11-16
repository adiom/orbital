#!/usr/bin/env tsx

/**
 * TypeScript тестовый скрипт для MCP API
 *
 * Установка:
 * pnpm add -D tsx
 *
 * Использование:
 * 1. Получите API ключ на /settings/api-keys
 * 2. Установите переменную окружения: export AVRORA_API_KEY="avr_live_YOUR_KEY"
 * 3. Запустите скрипт: pnpm tsx scripts/test-claude-code.ts
 */

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

interface McpResource {
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
}

interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface SferaInfo {
  id: string;
  title: string;
  description?: string;
  visibility: "public" | "private" | "dao";
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * MCP API клиент для Avrora
 */
class AvroraClient {
  private requestId = 0;

  constructor(
    private apiKey: string,
    private baseUrl = "http://localhost:3000"
  ) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
  }

  /**
   * Выполнить JSON-RPC вызов
   */
  async call(method: string, params?: any): Promise<any> {
    this.requestId++;

    const response = await fetch(`${this.baseUrl}/api/mcp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params: params || {},
        id: this.requestId,
      } as JsonRpcRequest),
    });

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response:", text);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: JsonRpcResponse = await response.json();

    if (json.error) {
      throw new Error(`RPC Error ${json.error.code}: ${json.error.message}`);
    }

    return json.result;
  }

  /**
   * Получить список ресурсов
   */
  async listResources(): Promise<McpResource[]> {
    const result = await this.call("resources/list");
    return result.resources;
  }

  /**
   * Получить список инструментов
   */
  async listTools(): Promise<McpTool[]> {
    const result = await this.call("tools/list");
    return result.tools;
  }

  /**
   * Прочитать ресурс
   */
  async readResource(uri: string): Promise<any> {
    const result = await this.call("resources/read", { uri });
    const content = result.contents[0];
    return content.text ? JSON.parse(content.text) : content;
  }

  /**
   * Вызвать инструмент
   */
  async callTool(name: string, args: any): Promise<any> {
    const result = await this.call("tools/call", {
      name,
      arguments: args,
    });
    return result.content[0];
  }

  /**
   * Получить список Сфер
   */
  async listSferas(): Promise<SferaInfo[]> {
    const data = await this.readResource("sfera://list");
    return data.sferas;
  }

  /**
   * Создать Сферу
   */
  async createSfera(
    title: string,
    description?: string,
    visibility: "public" | "private" | "dao" = "private"
  ): Promise<string> {
    const result = await this.callTool("createSfera", {
      title,
      description,
      visibility,
    });

    // Извлекаем ID из ответа
    const match = result.text.match(/([a-f0-9-]{36})/);
    return match ? match[1] : "";
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(
    sferaId: string,
    content: string,
    parentMessageId?: string
  ) {
    return await this.callTool("sendMessage", {
      sferaId,
      content,
      parentMessageId,
    });
  }

  /**
   * Вызвать Avrora AI
   */
  async invokeAvrora(sferaId: string, prompt?: string) {
    return await this.callTool("invokeAvrora", {
      sferaId,
      prompt,
    });
  }
}

/**
 * Цветной вывод в консоль
 */
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Запуск тестов
 */
async function main() {
  const API_KEY = process.env.AVRORA_API_KEY;
  const BASE_URL = process.env.AVRORA_BASE_URL || "http://localhost:3000";

  if (!API_KEY) {
    log(
      "❌ Ошибка: Установите AVRORA_API_KEY в переменных окружения",
      colors.red
    );
    log('Пример: export AVRORA_API_KEY="avr_live_YOUR_KEY"', colors.dim);
    process.exit(1);
  }

  log("\n🚀 Запуск тестов MCP API для Avrora", colors.bright);
  log(`📍 URL: ${BASE_URL}/api/mcp`, colors.cyan);
  log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`, colors.dim);
  log("");

  const client = new AvroraClient(API_KEY, BASE_URL);

  try {
    // Test 1: Список ресурсов
    log("📋 Test 1: Получение списка ресурсов", colors.yellow);
    const resources = await client.listResources();
    log(`✅ Найдено ресурсов: ${resources.length}`, colors.green);
    resources.forEach((r) => {
      log(`   • ${r.name} (${r.uri})`, colors.dim);
    });
    log("");

    // Test 2: Список инструментов
    log("🔧 Test 2: Получение списка инструментов", colors.yellow);
    const tools = await client.listTools();
    log(`✅ Найдено инструментов: ${tools.length}`, colors.green);
    tools.forEach((t) => {
      log(`   • ${t.name}: ${t.description}`, colors.dim);
    });
    log("");

    // Test 3: Профиль пользователя
    log("👤 Test 3: Получение профиля пользователя", colors.yellow);
    const profile = await client.readResource("user://profile");
    log("✅ Профиль получен:", colors.green);
    log(`   • Email: ${profile.profile.email}`, colors.dim);
    log(`   • Name: ${profile.profile.name || "Не указано"}`, colors.dim);
    log(`   • MCP Enabled: ${profile.profile.mcpEnabled}`, colors.dim);
    log(`   • Tier: ${profile.profile.mcpQuota?.tier || "free"}`, colors.dim);
    log("");

    // Test 4: Список Сфер
    log("🌐 Test 4: Получение списка Сфер", colors.yellow);
    const sferas = await client.listSferas();
    log(`✅ Найдено Сфер: ${sferas.length}`, colors.green);
    if (sferas.length > 0) {
      sferas.slice(0, 3).forEach((s) => {
        log(`   • ${s.title} (${s.visibility}, role: ${s.role})`, colors.dim);
      });
    }
    log("");

    // Test 5: Создание тестовой Сферы
    log("➕ Test 5: Создание тестовой Сферы", colors.yellow);
    const testTitle = `Test MCP Sfera ${new Date().toISOString()}`;
    const sferaId = await client.createSfera(
      testTitle,
      "Тестовая Сфера для проверки MCP API интеграции с Claude Code",
      "private"
    );
    log(`✅ Сфера создана: ${testTitle}`, colors.green);
    log(`   • ID: ${sferaId}`, colors.dim);
    log("");

    // Test 6: Отправка сообщения
    log("💬 Test 6: Отправка сообщения в Сферу", colors.yellow);
    await client.sendMessage(
      sferaId,
      "Привет! Это тестовое сообщение от MCP клиента 🚀\n\nПроверяем работу интеграции с Claude Code."
    );
    log("✅ Сообщение отправлено", colors.green);
    log("");

    // Test 7: Вызов Avrora AI
    log("🤖 Test 7: Вызов Avrora AI", colors.yellow);
    await client.invokeAvrora(
      sferaId,
      "@avrora Расскажи про Model Context Protocol и как он помогает AI-агентам взаимодействовать с внешними системами"
    );
    log("✅ Avrora вызвана, ответ генерируется", colors.green);
    log("");

    // Test 8: Чтение сообщений
    log("📨 Test 8: Чтение сообщений Сферы", colors.yellow);
    const messages = await client.readResource(`sfera://${sferaId}/messages`);
    log(`✅ Получено сообщений: ${messages.count}`, colors.green);
    if (messages.messages.length > 0) {
      messages.messages.slice(0, 3).forEach((m: any) => {
        const preview = m.content.substring(0, 60).replace(/\n/g, " ");
        log(`   • ${m.userName}: ${preview}...`, colors.dim);
      });
    }
    log("");

    // Test 9: Поиск
    log("🔍 Test 9: Поиск по Сферам и сообщениям", colors.yellow);
    const searchResult = await client.readResource("sfera://search?q=test");
    log(`✅ Результатов поиска: ${searchResult.totalResults}`, colors.green);
    log(`   • Сфер: ${searchResult.sferas.length}`, colors.dim);
    log(`   • Сообщений: ${searchResult.messages.length}`, colors.dim);
    log("");

    // Финальная статистика
    log("✨ Все тесты выполнены успешно!", colors.bright + colors.green);
    log("");
    log("📊 Статистика:", colors.cyan);
    log("   • Выполнено тестов: 9", colors.dim);
    log("   • Создано Сфер: 1", colors.dim);
    log("   • Отправлено сообщений: 2 (включая вызов Avrora)", colors.dim);
    log("");
    log(
      "💡 Совет: Используйте созданную Сферу для дальнейших экспериментов",
      colors.yellow
    );
    log(`   ID: ${sferaId}`, colors.dim);
  } catch (error) {
    log(`\n❌ Ошибка: ${error}`, colors.red);
    if (error instanceof Error) {
      log(`   ${error.stack}`, colors.dim);
    }
    process.exit(1);
  }
}

// Запуск
main().catch(console.error);
