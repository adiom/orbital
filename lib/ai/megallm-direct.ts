/**
 * Direct MegaLLM API client for handling images
 * Temporary workaround for image support via base64 encoding
 */

import { getMediaType, imageUrlToBase64, isImagePart } from "./image-utils";

type MessagePart = {
  type: "text" | "file";
  text?: string;
  url?: string;
  name?: string;
  mediaType?: string;
};

type UIMessage = {
  role: string;
  parts: MessagePart[];
};

type MegaLLMContentPart = {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

type MegaLLMMessage = {
  role: string;
  content: MegaLLMContentPart[];
};

/**
 * Converts UI messages to MegaLLM API format with base64 images
 */
export async function convertToMegaLLMMessages(
  messages: UIMessage[]
): Promise<MegaLLMMessage[]> {
  const converted: MegaLLMMessage[] = [];

  for (const message of messages) {
    const content: MegaLLMContentPart[] = [];

    for (const part of message.parts) {
      if (part.type === "text" && part.text) {
        content.push({
          type: "text",
          text: part.text,
        });
      } else if (isImagePart(part) && part.url && part.mediaType) {
        try {
          // Convert image URL to base64
          const base64Data = await imageUrlToBase64(part.url);
          const mediaType = getMediaType(part.mediaType);

          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          });
        } catch (error) {
          console.error("Failed to convert image to base64:", error);
          // Add error message instead of image
          content.push({
            type: "text",
            text: `[Failed to load image: ${part.name || part.url}]`,
          });
        }
      }
    }

    if (content.length > 0) {
      converted.push({
        role: message.role,
        content,
      });
    }
  }

  return converted;
}

/**
 * Checks if messages contain images
 */
export function hasImages(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    message.parts.some((part) => isImagePart(part))
  );
}

/**
 * Calls MegaLLM API directly with image support
 */
export async function callMegaLLMWithImages(params: {
  model: string;
  messages: UIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  apiKey: string;
}): Promise<Response> {
  const { model, messages, systemPrompt, maxTokens = 4096, apiKey } = params;

  // Convert messages to MegaLLM format with base64 images
  const megallmMessages = await convertToMegaLLMMessages(messages);

  const requestBody: any = {
    model,
    max_tokens: maxTokens,
    messages: megallmMessages,
    stream: true, // Enable streaming
  };

  // Add system prompt if provided
  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  // Call MegaLLM API directly
  const response = await fetch("https://ai.megallm.io/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MegaLLM API error: ${response.status} ${errorText}`);
  }

  return response;
}
