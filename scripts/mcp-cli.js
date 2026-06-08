#!/usr/bin/env node
// scripts/mcp-cli.js (CommonJS)
const process = require("node:process");

function write(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
function ok(id, result) {
  write({ jsonrpc: "2.0", id, result });
}
function err(id, code, message) {
  write({ jsonrpc: "2.0", id, error: { code, message } });
}

function listResources() {
  return {
    resources: [
      {
        uri: "sfera://list",
        name: "List of Sferas",
        mimeType: "application/json",
      },
      {
        uri: "user://profile",
        name: "User Profile",
        mimeType: "application/json",
      },
    ],
  };
}

async function readResource(uri) {
  switch (uri) {
    case "sfera://list":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: { sferas: [], count: 0 },
          },
        ],
      };
    case "user://profile":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: { id: "local-user", name: "Local Dev", roles: ["owner"] },
          },
        ],
      };
    default:
      throw new Error("Unknown resource");
  }
}

function listTools() {
  return {
    tools: [
      {
        name: "createSfera",
        description: "Create a new Sfera (stub)",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Sfera title" },
            description: { type: "string", description: "Sfera description" },
          },
          required: ["title"],
        },
      },
    ],
  };
}

async function callTool(name, args) {
  switch (name) {
    case "createSfera":
      return {
        content: [
          { type: "text", text: `Created Sfera '${args.title}' (stub)` },
        ],
      };
    default:
      throw new Error("Unknown tool");
  }
}

process.stdin.setEncoding("utf8");
let buffer = "";
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      continue;
    }
    const { id, method, params = {} } = req;
    try {
      switch (method) {
        case "resources/list":
          ok(id, listResources());
          break;
        case "resources/read":
          ok(id, await readResource(params.uri));
          break;
        case "tools/list":
          ok(id, listTools());
          break;
        case "tools/call":
          ok(id, await callTool(params.name, params.arguments || {}));
          break;
        default:
          err(id, -32_601, "Method not found");
      }
    } catch (e) {
      err(id, -32_603, e.message || "Internal error");
    }
  }
});

process.stdin.on("end", () => {});
