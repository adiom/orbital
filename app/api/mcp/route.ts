import { type NextRequest, NextResponse } from "next/server";
import {
  authenticateMcpRequest,
  checkMcpPermission,
  getClientIp,
  logMcpCall,
} from "@/lib/mcp/auth";
import { logToAvraaDevSfera } from "@/lib/mcp/logger";
import { checkMcpRateLimit, getRateLimitHeaders } from "@/lib/mcp/rate-limit";
import {
  getSfera,
  getSferaMessages,
  getUserProfile,
  listSferas,
  searchSferas,
} from "@/lib/mcp/resources";
import {
  addMember,
  createSfera,
  forkSfera,
  invokeAvrora,
  sendMessage,
} from "@/lib/mcp/tools";

/**
 * MCP Server Implementation
 * Implements the Model Context Protocol (JSON-RPC 2.0) for Sfera access
 */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null; // Добавляем | null
}

// MCP method mappings
const RESOURCE_METHODS = new Set([
  "resources/list",
  "resources/read",
  "resources/search",
]);

const TOOL_METHODS = new Set(["tools/list", "tools/call"]);

// POST /api/mcp - Main MCP endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let jsonRpcRequest: JsonRpcRequest;

  try {
    // Parse JSON-RPC request
    try {
      jsonRpcRequest = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_700,
            message: "Parse error",
          },
          id: null,
        } as JsonRpcResponse,
        { status: 400 }
      );
    }

    // Validate JSON-RPC format
    if (jsonRpcRequest.jsonrpc !== "2.0" || !jsonRpcRequest.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_600,
            message: "Invalid Request",
          },
          id: jsonRpcRequest.id || null,
        } as JsonRpcResponse,
        { status: 400 }
      );
    }

    // Authenticate the request
    const authResult = await authenticateMcpRequest(request);
    if (!authResult.success) {
      // Log failed authentication attempt
      const ipAddress = getClientIp(request);
      console.warn(
        `MCP authentication failed from ${ipAddress}: ${authResult.error}`
      );

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_001,
            message: authResult.error,
          },
          id: jsonRpcRequest.id,
        } as JsonRpcResponse,
        { status: authResult.status }
      );
    }

    const { apiKey, user } = authResult;

    // Check rate limits
    const tier = (user.mcpQuota as any)?.tier || "free";
    const rateLimitResult = await checkMcpRateLimit(user.id, tier);

    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded
      await logMcpCall({
        apiKeyId: apiKey.id,
        userId: user.id,
        method: jsonRpcRequest.method,
        statusCode: 429,
        responseTimeMs: Date.now() - startTime,
        errorMessage: rateLimitResult.error,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        params: jsonRpcRequest.params,
      });

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_002,
            message: rateLimitResult.error || "Rate limit exceeded",
          },
          id: jsonRpcRequest.id,
        } as JsonRpcResponse,
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, tier),
        }
      );
    }

    // Process the request based on method
    let result: any;
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      switch (jsonRpcRequest.method) {
        // Initialize MCP session
        case "initialize":
          result = {
            protocolVersion: "2024-11-05",
            capabilities: {
              resources: {
                list: true,
                read: true,
                search: true,
              },
              tools: {
                list: true,
                call: true,
              },
            },
            serverInfo: {
              name: "Avrora MCP Server",
              version: "1.0.0",
            },
          };
          break;

        // List available resources
        case "resources/list":
          if (!checkMcpPermission(apiKey, "resources")) {
            throw new Error("Permission denied: resources access required");
          }
          result = {
            resources: [
              {
                uri: "sfera://list",
                name: "Your Sferas",
                description: "List of Sferas you have access to",
                mimeType: "application/json",
              },
              {
                uri: "user://profile",
                name: "Your Profile",
                description: "Your user profile and settings",
                mimeType: "application/json",
              },
            ],
          };
          break;

        // Read a resource
        case "resources/read": {
          if (!checkMcpPermission(apiKey, "resources")) {
            throw new Error("Permission denied: resources access required");
          }

          const { uri } = jsonRpcRequest.params || {};
          if (!uri) {
            throw new Error("URI parameter is required");
          }

          // Parse the URI and route to appropriate handler
          if (uri === "sfera://list") {
            const resource = await listSferas(user.id);
            result = { contents: [resource] };
          } else if (uri === "user://profile") {
            const resource = await getUserProfile(user.id);
            result = { contents: [resource] };
          } else if (uri.startsWith("sfera://")) {
            const parts = uri.substring(8).split("/");
            const sferaId = parts[0];

            if (parts.length === 1) {
              const resource = await getSfera(sferaId, user.id);
              result = { contents: [resource] };
            } else if (parts[1] === "messages") {
              const resource = await getSferaMessages(
                sferaId,
                user.id,
                jsonRpcRequest.params?.limit,
                jsonRpcRequest.params?.offset
              );
              result = { contents: [resource] };
            } else {
              throw new Error(`Unknown resource URI: ${uri}`);
            }
          } else if (uri.startsWith("sfera://search")) {
            const url = new URL(uri);
            const query = url.searchParams.get("q");
            if (!query) {
              throw new Error("Search query is required");
            }
            const resource = await searchSferas(user.id, query);
            result = { contents: [resource] };
          } else {
            throw new Error(`Unknown resource URI: ${uri}`);
          }
          break;
        }

        // List available tools
        case "tools/list":
          if (checkMcpPermission(apiKey, "tools")) {
            result = {
              tools: [
                {
                  name: "createSfera",
                  description: "Create a new Sfera discussion space",
                  inputSchema: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Sfera title" },
                      description: {
                        type: "string",
                        description: "Sfera description",
                      },
                      visibility: {
                        type: "string",
                        enum: ["public", "private", "dao"],
                        description: "Sfera visibility",
                      },
                      members: {
                        type: "array",
                        items: { type: "string" },
                        description:
                          "Email addresses or user IDs to add as members",
                      },
                    },
                    required: ["title"],
                  },
                },
                {
                  name: "sendMessage",
                  description: "Send a message to a Sfera",
                  inputSchema: {
                    type: "object",
                    properties: {
                      sferaId: { type: "string", description: "Sfera ID" },
                      content: {
                        type: "string",
                        description: "Message content",
                      },
                      parentMessageId: {
                        type: "string",
                        description: "Parent message ID for threading",
                      },
                    },
                    required: ["sferaId", "content"],
                  },
                },
                {
                  name: "invokeAvrora",
                  description: "Invoke Avrora AI to respond in a Sfera",
                  inputSchema: {
                    type: "object",
                    properties: {
                      sferaId: { type: "string", description: "Sfera ID" },
                      prompt: {
                        type: "string",
                        description: "Optional prompt to guide Avrora",
                      },
                    },
                    required: ["sferaId"],
                  },
                },
                {
                  name: "addMember",
                  description: "Add a member to a Sfera",
                  inputSchema: {
                    type: "object",
                    properties: {
                      sferaId: { type: "string", description: "Sfera ID" },
                      memberIdentifier: {
                        type: "string",
                        description: "Email or user ID",
                      },
                      role: {
                        type: "string",
                        enum: ["admin", "member", "viewer"],
                        description: "Member role",
                      },
                    },
                    required: ["sferaId", "memberIdentifier"],
                  },
                },
                {
                  name: "forkSfera",
                  description: "Fork a Sfera or message",
                  inputSchema: {
                    type: "object",
                    properties: {
                      sferaId: {
                        type: "string",
                        description: "Source Sfera ID",
                      },
                      messageId: {
                        type: "string",
                        description: "Message ID to fork from",
                      },
                      title: { type: "string", description: "New Sfera title" },
                      description: {
                        type: "string",
                        description: "New Sfera description",
                      },
                    },
                    required: ["sferaId", "title"],
                  },
                },
              ],
            };
          } else {
            result = { tools: [] }; // Return empty list if no permission
          }
          break;

        // Call a tool
        case "tools/call": {
          if (!checkMcpPermission(apiKey, "tools")) {
            throw new Error("Permission denied: tools access required");
          }

          const { name, arguments: args } = jsonRpcRequest.params || {};
          if (!name) {
            throw new Error("Tool name is required");
          }

          // Route to appropriate tool handler
          let toolResult;
          const toolStartTime = Date.now();
          switch (name) {
            case "createSfera":
              toolResult = await createSfera(user.id, args);
              break;
            case "sendMessage":
              toolResult = await sendMessage(user.id, args);
              break;
            case "invokeAvrora":
              toolResult = await invokeAvrora(user.id, args);
              break;
            case "addMember":
              if (!checkMcpPermission(apiKey, "admin")) {
                throw new Error(
                  "Permission denied: admin access required for adding members"
                );
              }
              toolResult = await addMember(user.id, args);
              break;
            case "forkSfera":
              toolResult = await forkSfera(user.id, args);
              break;
            default:
              throw new Error(`Unknown tool: ${name}`);
          }

          if (!toolResult.success) {
            throw new Error(toolResult.error || "Tool execution failed");
          }

          // Log the successful tool execution to AVRORA DEV Sfera
          const toolExecutionTime = Date.now() - toolStartTime;
          await logToAvraaDevSfera({
            toolName: name,
            arguments: args,
            success: true,
            result: toolResult.data,
            responseTimeMs: toolExecutionTime,
          });

          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify(toolResult.data, null, 2),
              },
            ],
          };
          break;
        }

        default:
          throw new Error(`Method not found: ${jsonRpcRequest.method}`);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Internal error";
      statusCode = 500;

      // Log the error
      await logMcpCall({
        apiKeyId: apiKey.id,
        userId: user.id,
        method: jsonRpcRequest.method,
        statusCode,
        responseTimeMs: Date.now() - startTime,
        errorMessage,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") || undefined,
        params: jsonRpcRequest.params,
      });

      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32_603,
            message: errorMessage,
          },
          id: jsonRpcRequest.id,
        } as JsonRpcResponse,
        {
          status: statusCode,
          headers: getRateLimitHeaders(rateLimitResult, tier),
        }
      );
    }

    // Log successful call
    await logMcpCall({
      apiKeyId: apiKey.id,
      userId: user.id,
      method: jsonRpcRequest.method,
      resourceUri: jsonRpcRequest.params?.uri,
      toolName: jsonRpcRequest.params?.name,
      statusCode,
      responseTimeMs: Date.now() - startTime,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      params: jsonRpcRequest.params,
    });

    // Return successful response
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        result,
        id: jsonRpcRequest.id,
      } as JsonRpcResponse,
      {
        headers: getRateLimitHeaders(rateLimitResult, tier),
      }
    );
  } catch (error) {
    console.error("MCP server error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32_603,
          message: "Internal error",
        },
        id: null,
      } as JsonRpcResponse,
      { status: 500 }
    );
  }
}

// OPTIONS /api/mcp - Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
