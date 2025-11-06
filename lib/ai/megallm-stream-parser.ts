/**
 * Parser for MegaLLM streaming responses (Anthropic-compatible format)
 */

export interface MegaLLMStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  message?: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: any[];
    model: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  content_block?: {
    type: 'text';
    text: string;
  };
  delta?: {
    type: 'text_delta';
    text: string;
  };
  index?: number;
  usage?: {
    output_tokens: number;
  };
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Parses MegaLLM streaming response and yields text chunks
 */
export async function* parseMegaLLMStream(
  response: Response
): AsyncGenerator<string, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete events in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith(':')) {
          continue;
        }

        // Parse SSE format: "data: {json}"
        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6);

          // Skip "[DONE]" marker
          if (jsonStr === '[DONE]') {
            continue;
          }

          try {
            const event: MegaLLMStreamEvent = JSON.parse(jsonStr);

            // Extract text from content_block_delta events
            if (event.type === 'content_block_delta' && event.delta?.text) {
              yield event.delta.text;
            }

            // Handle errors
            if (event.type === 'error') {
              throw new Error(event.error?.message || 'Unknown MegaLLM error');
            }
          } catch (parseError) {
            console.error('Failed to parse MegaLLM event:', parseError, jsonStr);
            // Continue processing other events
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Converts MegaLLM stream to UI message stream format
 */
export async function convertMegaLLMStreamToUIStream(
  response: Response,
  messageId: string
): Promise<ReadableStream> {
  return new ReadableStream({
    async start(controller) {
      try {
        // Send text-start event
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'text-start',
              id: messageId,
            })}\n\n`
          )
        );

        // Stream text deltas
        for await (const textChunk of parseMegaLLMStream(response)) {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: 'text-delta',
                id: messageId,
                delta: textChunk,
              })}\n\n`
            )
          );
        }

        // Send text-end event
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'text-end',
              id: messageId,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error('Error in MegaLLM stream conversion:', error);

        // Send error event
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`
          )
        );

        controller.close();
      }
    },
  });
}
