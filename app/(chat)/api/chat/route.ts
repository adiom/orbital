import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { callMegaLLMWithImages, hasImages } from "@/lib/ai/megallm-direct";
import { parseMegaLLMStream } from "@/lib/ai/megallm-stream-parser";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

// Regex constants for performance
const AVRORA_MENTION_REGEX = /@avrora|@аврора/i;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    console.error("Request validation failed:", error);

    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];

    if (chat) {
      // Check access permissions
      // For group chats - all are open (no permission check)
      // For other chats - only owner has access
      const hasAccess =
        chat.chatType === "group" || chat.userId === session.user.id;

      if (!hasAccess) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
      // Only fetch messages if chat already exists
      messagesFromDb = await getMessagesByChatId({ id });
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          userId: session.user.id, // Track author for group chats
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    // For group chats, check if Avrora is mentioned
    if (chat?.chatType === "group") {
      const messageText = message.parts
        .filter(
          (part): part is { type: "text"; text: string } => part.type === "text"
        )
        .map((part) => part.text)
        .join(" ");

      const mentionsAvrora = AVRORA_MENTION_REGEX.test(messageText);

      if (!mentionsAvrora) {
        // Just save the message without AI response
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"type":"message-saved"}\n\n')
              );
              controller.close();
            },
          }),
          {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          }
        );
      }

      // Avrora is mentioned - take last 20 messages as context
      const last20Messages = uiMessages.slice(-20);
      // Replace uiMessages with context-limited version
      uiMessages.length = 0;
      uiMessages.push(...last20Messages);

      console.log(
        `[Group Chat] @Avrora mentioned, using last ${last20Messages.length} messages as context`
      );
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;
    let hasStreamError = false;
    let errorMessage = "An error occurred during response generation.";

    // Check if messages contain images
    const containsImages = hasImages(uiMessages);

    console.log("=== DEBUG: Message Analysis ===");
    console.log("Contains Images:", containsImages);
    console.log("UIMessages:", JSON.stringify(uiMessages, null, 2));
    console.log("================================");

    // Use custom MegaLLM API for messages with images (temporary workaround)
    if (containsImages) {
      console.log("Using custom MegaLLM API for image support");

      const stream = createUIMessageStream({
        execute: async ({ writer: dataStream }) => {
          try {
            const apiKey = process.env.MEGALLM_API_KEY;
            if (!apiKey) {
              throw new Error("MEGALLM_API_KEY is not configured");
            }

            // Get model ID from selected chat model
            const modelIdMap: Record<string, string> = {
              "chat-model": "gpt-4o-mini",
              "chat-model-reasoning": "gpt-4o-mini",
            };
            const modelId = modelIdMap[selectedChatModel] || "gpt-4o-mini";

            // Call MegaLLM API with images
            const response = await callMegaLLMWithImages({
              model: modelId,
              messages: uiMessages,
              systemPrompt: systemPrompt({
                selectedChatModel,
                requestHints,
                useAvroraMode: chat?.chatType === "group",
              }),
              maxTokens: 4096,
              apiKey,
            });

            // Start assistant message
            const assistantMessageId = generateUUID();
            dataStream.write({
              type: "text-start",
              id: assistantMessageId,
            });

            let fullText = "";

            // Stream response chunks
            for await (const textChunk of parseMegaLLMStream(response)) {
              fullText += textChunk;
              dataStream.write({
                type: "text-delta",
                id: assistantMessageId,
                delta: textChunk,
              });
            }

            // End assistant message
            dataStream.write({
              type: "text-end",
              id: assistantMessageId,
            });

            // Save assistant message to database
            await saveMessages({
              messages: [
                {
                  id: assistantMessageId,
                  role: "assistant",
                  userId: null,
                  parts: [{ type: "text", text: fullText }],
                  createdAt: new Date(),
                  attachments: [],
                  chatId: id,
                },
              ],
            });
          } catch (error) {
            console.error("Error in custom MegaLLM API call:", error);
            hasStreamError = true;
            errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to process image request";
            throw error;
          }
        },
        generateId: generateUUID,
        onFinish: async () => {
          if (finalMergedUsage) {
            try {
              await updateChatLastContextById({
                chatId: id,
                context: finalMergedUsage,
              });
            } catch (err) {
              console.warn("Unable to persist last usage for chat", id, err);
            }
          }
        },
        onError: (error: unknown) => {
          hasStreamError = true;
          errorMessage =
            error instanceof Error
              ? error.message
              : "Произошла ошибка при генерации ответа.";
          return errorMessage;
        },
      });

      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }

    // Standard flow for text-only messages
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Отладка: логируем параметры перед отправкой в модель
        console.log("=== DEBUG: StreamText Params ===");
        //console.log('Selected Chat Model:', selectedChatModel);
        console.log("UIMessages:", JSON.stringify(uiMessages, null, 2));
        console.log(
          "Converted Model Messages:",
          JSON.stringify(convertToModelMessages(uiMessages), null, 2)
        );
        //console.log('System Prompt:', systemPrompt({ selectedChatModel, requestHints }));

        console.log("================================");

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({
            selectedChatModel,
            requestHints,
            useAvroraMode: chat?.chatType === "group",
          }),
          providerOptions: {
            openai: {
              textVerbosity: "low", // 'low' for concise, 'medium' (default), or 'high' for verbose
            },
          },
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [
                  "getWeather",
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                ],
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          onFinish: async ({ usage }) => {
            try {
              const providers = await getTokenlensCatalog();
              const modelId =
                myProvider.languageModel(selectedChatModel).modelId;
              if (!modelId) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              if (!providers) {
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
                return;
              }

              const summary = getUsage({ modelId, usage, providers });
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            } catch (err) {
              console.warn("TokenLens enrichment failed", err);
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
            }
          },
        });

        result.consumeStream().catch((error) => {
          hasStreamError = true;
          errorMessage = error?.message || "Failed to connect to AI service";
          console.error("Stream error:", error);
        });

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        // Save only the assistant's response message (not all messages)
        // responseMessage contains the complete message with populated parts
        const parts =
          hasStreamError &&
          (!responseMessage.parts || responseMessage.parts.length === 0)
            ? [{ type: "text", text: errorMessage }]
            : responseMessage.parts;

        await saveMessages({
          messages: [
            {
              id: responseMessage.id,
              role: responseMessage.role,
              userId: null, // AI messages don't have a user author
              parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            },
          ],
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: (error: unknown) => {
        hasStreamError = true;
        errorMessage =
          error instanceof Error
            ? error.message
            : "Произошла ошибка при генерации ответа.";
        return errorMessage;
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  // Check access permissions
  // For group chats - all are open (no permission check)
  // For other chats - only owner has access
  const hasAccess =
    chat.chatType === "group" || chat.userId === session.user.id;

  if (!hasAccess) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const messagesFromDb = await getMessagesByChatId({ id });
  const uiMessages = convertToUIMessages(messagesFromDb);

  return Response.json({ chat, messages: uiMessages }, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
