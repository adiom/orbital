import { BanitaError, type BanitaResult } from "./types";

const DEFAULT_BASE_URL = "https://banita.canfly.org";
const DEFAULT_TIMEOUT_MS = 90_000;
export const BANITA_MODEL = "banita-sketch";

function baseUrl() {
  return (process.env.BANITA_IMAGE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function isBanitaConfigured() {
  return Boolean(process.env.BANITA_API_KEY?.trim());
}

export function isBanitaEnabled() {
  return process.env.BANITA_ENABLED?.trim().toLowerCase() !== "false";
}

export async function generateBanitaImage(
  prompt: string,
  signal?: AbortSignal,
): Promise<BanitaResult> {
  if (!isBanitaEnabled()) {
    throw new BanitaError("IMAGE_CAPABILITY_DISABLED", "Рисование временно отключено");
  }
  if (!prompt.trim()) {
    throw new BanitaError("IMAGE_PROMPT_EMPTY", "Не указан сюжет для рисунка");
  }
  const apiKey = process.env.BANITA_API_KEY?.trim();
  if (!apiKey) {
    throw new BanitaError("BANITA_NOT_CONFIGURED", "Рисование временно не настроено");
  }

  const startedAt = Date.now();
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/v1/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: BANITA_MODEL,
        prompt: prompt.trim(),
        n: 1,
        response_format: "url",
      }),
      signal: requestSignal,
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new BanitaError("BANITA_TIMEOUT", "BANITA не ответила за отведённое время");
    }
    throw new BanitaError("BANITA_HTTP_ERROR", "Не удалось связаться с BANITA");
  }

  if (response.status === 401) {
    throw new BanitaError("BANITA_UNAUTHORIZED", "BANITA отклонила API-ключ");
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ url?: string }>;
  } | null;
  if (!response.ok) {
    throw new BanitaError("BANITA_HTTP_ERROR", `BANITA вернула HTTP ${response.status}`);
  }

  const imageUrl = payload?.data?.[0]?.url;
  try {
    if (!imageUrl) throw new Error("missing URL");
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("unsupported URL protocol");
    }
  } catch {
    throw new BanitaError("BANITA_INVALID_RESPONSE", "BANITA вернула некорректный результат");
  }

  return {
    imageUrl,
    prompt: prompt.trim(),
    model: BANITA_MODEL,
    executionTimeMs: Date.now() - startedAt,
  };
}

export async function checkBanita() {
  if (!isBanitaEnabled()) {
    return { ok: false, configured: isBanitaConfigured(), enabled: false, ms: 0, error: "Capability отключена" };
  }
  if (!isBanitaConfigured()) {
    return { ok: false, configured: false, enabled: true, ms: 0, error: "API key не настроен" };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl()}/health`, {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    return {
      ok: response.ok,
      configured: true,
      enabled: true,
      ms: Date.now() - startedAt,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch {
    return { ok: false, configured: true, enabled: true, ms: Date.now() - startedAt, error: "BANITA не отвечает" };
  }
}
