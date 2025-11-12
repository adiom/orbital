# Avrora AI-SDK Alignment — PO Pattern Mode

## Основной паттерн вызова

Используем клиент через фабрику подключения:

```ts
import { createAIClient } from "@/lib/ai/client";

const ai = createAIClient();
const stream = await ai.chat.completions.stream({
  model: "claude-3",
  messages,
});

