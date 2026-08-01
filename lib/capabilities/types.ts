export type ImageIntent = {
  prompt: string;
};

export type BanitaResult = {
  imageUrl: string;
  prompt: string;
  model: string;
  executionTimeMs: number;
};

export type BanitaErrorCode =
  | "BANITA_NOT_CONFIGURED"
  | "BANITA_UNAUTHORIZED"
  | "BANITA_TIMEOUT"
  | "BANITA_HTTP_ERROR"
  | "BANITA_INVALID_RESPONSE"
  | "IMAGE_PROMPT_EMPTY"
  | "IMAGE_APPROVAL_DENIED"
  | "IMAGE_CAPABILITY_DISABLED";

export class BanitaError extends Error {
  constructor(
    public readonly code: BanitaErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BanitaError";
  }
}
