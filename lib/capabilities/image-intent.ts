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
