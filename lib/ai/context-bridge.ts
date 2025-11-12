import fs from "fs";
import path from "path";

/**
 * ContextBridge — собирает смысловые ядра проекта
 * Это не код исполнения — а когнитивный слой для ИИ
 */

export function collectContextSources() {
  const roots = ["app", "components", "hooks", "lib", "docs"];

  const result: Record<string, string> = {};

  for (const dir of roots) {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) continue;

    const files = fs.readdirSync(fullPath, { recursive: true });
    for (const file of files) {
      if (typeof file !== "string") continue;
      if (
        !file.endsWith(".ts") &&
        !file.endsWith(".tsx") &&
        !file.endsWith(".md")
      )
        continue;

      const filePath = path.join(fullPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      result[filePath] = content;
    }
  }

  return result;
}
