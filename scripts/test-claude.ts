import { createAIClient } from "@/lib/ai/clients";
import { myLanguageModels } from "@/lib/ai/providers";

async function main() {
  const ai = createAIClient();

  // Use the alias if present; fallback to 'poetic'.
  const targetModel = "gpt-5-mini";
  const languageModels = myLanguageModels;
  const modelNames = Object.keys(languageModels);
  console.log("Доступные модели:", modelNames);

  if (!languageModels[targetModel]) {
    console.warn(
      `Модель ${targetModel} отсутствует. Использую fallback 'poetic' или первую доступную.`
    );
  }

  const response = await ai.chat.completions.create({
    model: languageModels[targetModel]
      ? targetModel
      : modelNames.includes("poetic")
        ? "poetic"
        : modelNames[0],
    messages: [{ role: "user", content: "Скажи мне одно красивое слово" }],
  });

  console.log("\nОтвет Claude:\n");
  console.log(response.choices[0].message.content);
}

main().catch((err) => {
  console.error("\nОшибка при обращении к Claude\n");
  console.error(err);
});
