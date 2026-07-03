/**
 * MCP Smoke Tests for cf-kristina external agent
 *
 * Tests the MCP protocol communication with cf-kristina at localhost:31337.
 * These are integration tests that require cf-kristina to be running.
 */

import { describe, expect, it } from "vitest";

const MCP_URL = "http://localhost:31337/api/mcp";

async function mcpCall(method: string, params?: Record<string, unknown>) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      ...(params ? { params } : {}),
    }),
  });
  return res.json();
}

describe("cf-kristina MCP Protocol", () => {
  it("tools/list returns 3 tools", async () => {
    const result = await mcpCall("tools/list");

    expect(result.jsonrpc).toBe("2.0");
    expect(result.result).toBeDefined();
    expect(result.result.tools).toBeInstanceOf(Array);
    expect(result.result.tools.length).toBe(3);

    const toolNames = result.result.tools.map((t: any) => t.name);
    expect(toolNames).toContain("agent_message");
    expect(toolNames).toContain("agent_search");
    expect(toolNames).toContain("agent_info");
  });

  it("tools/list returns correct input schemas", async () => {
    const result = await mcpCall("tools/list");
    const tools = result.result.tools;

    const agentMessage = tools.find((t: any) => t.name === "agent_message");
    expect(agentMessage).toBeDefined();
    expect(agentMessage.inputSchema.required).toContain("prompt");
    expect(agentMessage.inputSchema.required).toContain("context");
    expect(agentMessage.inputSchema.properties.prompt.type).toBe("string");
    expect(agentMessage.inputSchema.properties.context.type).toBe("object");

    const agentSearch = tools.find((t: any) => t.name === "agent_search");
    expect(agentSearch).toBeDefined();
    expect(agentSearch.inputSchema.required).toContain("query");
    expect(agentSearch.inputSchema.required).toContain("context");

    const agentInfo = tools.find((t: any) => t.name === "agent_info");
    expect(agentInfo).toBeDefined();
  });

  it("agent_info returns version and capabilities", async () => {
    const result = await mcpCall("tools/call", {
      name: "agent_info",
      arguments: {},
    });

    expect(result.result).toBeDefined();
    expect(result.result.content).toBeInstanceOf(Array);
    expect(result.result.content.length).toBe(1);
    expect(result.result.content[0].type).toBe("text");

    const info = JSON.parse(result.result.content[0].text);
    expect(info.version).toBe("1.0.0");
    expect(info.sources).toBeInstanceOf(Array);
    expect(info.sources).toContain("sfera");
    expect(info.capabilities).toBeDefined();
    expect(info.capabilities.memorySearch).toBe(true);
    expect(info.capabilities.memoryWrite).toBe(true);
  });

  it("agent_message returns structured AgentResult", { timeout: 30000 }, async () => {
    const result = await mcpCall("tools/call", {
      name: "agent_message",
      arguments: {
        prompt: "Привет, это тест",
        context: {
          source: "sfera",
          serviceId: "test-space",
          spaceId: "test-space",
          userId: "test-user",
          userName: "Test User",
          trigger: "direct",
          responseMode: "reply",
          memoryAccess: { read: true, write: false },
        },
      },
    });

    expect(result.result).toBeDefined();
    expect(result.result.content).toBeInstanceOf(Array);
    expect(result.result.content.length).toBe(1);
    expect(result.result.content[0].type).toBe("text");

    // Parse AgentResult
    const text = result.result.content[0].text;
    let agentResult;
    try {
      agentResult = JSON.parse(text);
    } catch {
      // If not JSON, treat as plain text fallback
      agentResult = { text, type: "text" };
    }

    expect(agentResult.text).toBeDefined();
    expect(typeof agentResult.text).toBe("string");
    expect(agentResult.text.length).toBeGreaterThan(0);
  });

  it("agent_search returns results or acceptable error", async () => {
    const result = await mcpCall("tools/call", {
      name: "agent_search",
      arguments: {
        query: "hello",
        context: {
          source: "sfera",
          serviceId: "test-space",
          spaceId: "test-space",
        },
      },
    });

    // agent_search may return error (no memory) or empty results — both valid
    if (result.result) {
      expect(result.result.content).toBeInstanceOf(Array);
    } else if (result.error) {
      expect(result.error.code).toBeDefined();
    }
  });

  it("MCP response has correct JSON-RPC structure", async () => {
    const result = await mcpCall("tools/list");

    // JSON-RPC 2.0 structure
    expect(result.jsonrpc).toBe("2.0");
    expect(result.id).toBeDefined();
    expect(result.result).toBeDefined();
    // Should not have error
    expect(result.error).toBeUndefined();
  });
});
