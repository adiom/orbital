#!/usr/bin/env node

/**
 * Тестовый скрипт для MCP API
 *
 * Использование:
 * 1. Сначала получите API ключ на /settings/api-keys
 * 2. Установите переменную окружения: export AVRORA_API_KEY="avr_live_YOUR_KEY"
 * 3. Запустите скрипт: node scripts/test-mcp.js
 */

const https = require("https");
const http = require("http");

// Конфигурация
const API_KEY = process.env.AVRORA_API_KEY;
const BASE_URL = process.env.AVRORA_BASE_URL || "http://localhost:3000";
const MCP_ENDPOINT = "/api/mcp";

if (!API_KEY) {
  console.error("❌ Ошибка: Установите AVRORA_API_KEY в переменных окружения");
  console.error('Пример: export AVRORA_API_KEY="avr_live_YOUR_KEY"');
  process.exit(1);
}

/**
 * Класс для работы с MCP API
 */
class McpClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = new URL(baseUrl);
    this.requestId = 0;
  }

  /**
   * Выполнить JSON-RPC вызов
   */
  async call(method, params = {}) {
    this.requestId++;

    const requestData = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: this.requestId,
    });

    return new Promise((resolve, reject) => {
      const protocol = this.baseUrl.protocol === "https:" ? https : http;

      const options = {
        hostname: this.baseUrl.hostname,
        port:
          this.baseUrl.port || (this.baseUrl.protocol === "https:" ? 443 : 80),
        path: MCP_ENDPOINT,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestData),
        },
      };

      const req = protocol.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);

            if (response.error) {
              console.error(`❌ RPC Error: ${response.error.message}`);
              reject(response.error);
            } else {
              resolve(response.result);
            }
          } catch (e) {
            console.error(`❌ Parse error: ${e.message}`);
            console.error("Response:", data);
            reject(e);
          }
        });
      });

      req.on("error", (e) => {
        console.error(`❌ Request error: ${e.message}`);
        reject(e);
      });

      req.write(requestData);
      req.end();
    });
  }
}

/**
 * Тесты MCP API
 */
async function runTests() {
  console.log("🚀 Запуск тестов MCP API...");
  console.log(`📍 URL: ${BASE_URL}${MCP_ENDPOINT}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...\\n`);

  const client = new McpClient(API_KEY, BASE_URL);

  try {
    // Test 1: Получить список ресурсов
    console.log("📋 Test 1: resources/list");
    const resourcesList = await client.call("resources/list");
    console.log("✅ Доступные ресурсы:");
    resourcesList.resources.forEach((r) => {
      console.log(`   - ${r.name} (${r.uri})`);
    });
    console.log("");

    // Test 2: Получить список инструментов
    console.log("🔧 Test 2: tools/list");
    const toolsList = await client.call("tools/list");
    console.log("✅ Доступные инструменты:");
    toolsList.tools.forEach((t) => {
      console.log(`   - ${t.name}: ${t.description}`);
    });
    console.log("");

    // Test 3: Получить профиль пользователя
    console.log("👤 Test 3: resources/read (user://profile)");
    const profile = await client.call("resources/read", {
      uri: "user://profile",
    });
    const userData = JSON.parse(profile.contents[0].text);
    console.log("✅ Профиль пользователя:");
    console.log(`   - Email: ${userData.profile.email}`);
    console.log(`   - Name: ${userData.profile.name || "Не указано"}`);
    console.log(`   - MCP Enabled: ${userData.profile.mcpEnabled}`);
    console.log(`   - MCP Tier: ${userData.profile.mcpQuota?.tier || "free"}`);
    console.log("");

    // Test 4: Получить список Сфер
    console.log("🌐 Test 4: resources/read (sfera://list)");
    const sferas = await client.call("resources/read", { uri: "sfera://list" });
    const sferaData = JSON.parse(sferas.contents[0].text);
    console.log(`✅ Найдено Сфер: ${sferaData.count}`);

    if (sferaData.count > 0) {
      console.log("   Первые 3 Сферы:");
      sferaData.sferas.slice(0, 3).forEach((s) => {
        console.log(`   - ${s.title} (${s.visibility}, role: ${s.role})`);
      });
    }
    console.log("");

    // Test 5: Создать тестовую Сферу
    console.log("➕ Test 5: tools/call (createSfera)");
    const testSferaTitle = `Test MCP Sfera ${Date.now()}`;
    const createResult = await client.call("tools/call", {
      name: "createSfera",
      arguments: {
        title: testSferaTitle,
        description: "Тестовая Сфера, созданная через MCP API",
        visibility: "private",
      },
    });

    // Парсим результат из text content
    const createResponse = createResult.content[0].text;
    const sferaIdMatch = createResponse.match(/([a-f0-9-]{36})/);
    const newSferaId = sferaIdMatch ? sferaIdMatch[1] : null;

    if (newSferaId) {
      console.log(`✅ Сфера создана: ${testSferaTitle}`);
      console.log(`   ID: ${newSferaId}`);
      console.log("");

      // Test 6: Отправить сообщение в Сферу
      console.log("💬 Test 6: tools/call (sendMessage)");
      const messageResult = await client.call("tools/call", {
        name: "sendMessage",
        arguments: {
          sferaId: newSferaId,
          content: "Привет! Это тестовое сообщение от MCP API 🚀",
        },
      });
      console.log("✅ Сообщение отправлено");
      console.log("");

      // Test 7: Вызвать Avrora
      console.log("🤖 Test 7: tools/call (invokeAvrora)");
      const avroraResult = await client.call("tools/call", {
        name: "invokeAvrora",
        arguments: {
          sferaId: newSferaId,
          prompt: "Расскажи что-нибудь интересное про MCP протокол",
        },
      });
      console.log("✅ Avrora вызвана");
      console.log("");

      // Test 8: Получить сообщения Сферы
      console.log("📨 Test 8: resources/read (sfera messages)");
      const messages = await client.call("resources/read", {
        uri: `sfera://${newSferaId}/messages`,
      });
      const msgData = JSON.parse(messages.contents[0].text);
      console.log(`✅ Получено сообщений: ${msgData.count}`);
      if (msgData.count > 0) {
        console.log("   Последние сообщения:");
        msgData.messages.slice(0, 3).forEach((m) => {
          const preview = m.content.substring(0, 50);
          console.log(`   - ${m.userName}: ${preview}...`);
        });
      }
    } else {
      console.log("⚠️  Не удалось извлечь ID созданной Сферы");
    }

    // Test 9: Поиск
    console.log("\\n🔍 Test 9: resources/read (search)");
    const searchResult = await client.call("resources/read", {
      uri: "sfera://search?q=test",
    });
    const searchData = JSON.parse(searchResult.contents[0].text);
    console.log(`✅ Результатов поиска: ${searchData.totalResults}`);
    console.log(`   - Сфер: ${searchData.sferas.length}`);
    console.log(`   - Сообщений: ${searchData.messages.length}`);

    console.log("\\n✨ Все тесты выполнены успешно!");
  } catch (error) {
    console.error("\\n❌ Ошибка при выполнении тестов:", error);
    process.exit(1);
  }
}

// Запуск тестов
runTests().catch(console.error);
