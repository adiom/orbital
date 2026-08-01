import type { ImageIntent } from "./types";

const IMAGE_PATTERNS = [
  /^(?:@banita\s+)?нарисуй\s+(.+)$/i,
  /^(?:@banita\s+)?создай\s+(?:картинку|изображение|рисунок)\s*:?-?\s*(.+)$/i,
  /^(?:@banita\s+)?сгенерируй\s+(?:картинку|изображение|рисунок)\s*:?-?\s*(.+)$/i,
  /^(?:@banita\s+)?сделай\s+(?:картинку|изображение|рисунок)\s*:?-?\s*(.+)$/i,
];

export function detectImageIntent(content: string): ImageIntent | null {
  const normalized = content.trim();
  for (const pattern of IMAGE_PATTERNS) {
    const match = normalized.match(pattern);
    const prompt = match?.[1]?.trim();
    if (prompt) return { prompt };
  }
  return null;
}

export function isIncompleteImageIntent(content: string): boolean {
  return /^(?:@banita\s+)?(?:нарисуй|создай\s+(?:картинку|изображение|рисунок)|сгенерируй\s+(?:картинку|изображение|рисунок)|сделай\s+(?:картинку|изображение|рисунок))\s*$/i.test(
    content.trim(),
  );
}

/** Keep chat context bounded while preserving the latest human intent. */
export function buildBanitaPrompt(
  prompt: string,
  context: Array<{ author: string; content: string }>,
): string {
  const relevant = context
    .map(({ author, content }) => `${author}: ${content.trim()}`)
    .filter((line) => line.length > 0)
    .join("\n")
    .slice(-4000);

  if (!relevant) return prompt;
  return `${prompt}\n\nКонтекст чата (используй только для уточнения замысла):\n${relevant}`;
}
