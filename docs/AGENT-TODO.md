# Agent Integration TODO

## Goal

Improve the agent architecture in `avrora-area` before adding more agents, then connect external `cf-kristina` as a separate Sfera participant.

`cf-kristina` must be called only by the `@cf-kristina` mention. It must not replace or intercept the existing local `@kristina` / `@кристина` agent.

## Current State

- `Avrora` and local `Kristina` are internal agents registered in `lib/ai/agents/registry.ts`.
- Internal agents are triggered by mention detection in `lib/ai/agents/detector.ts`.
- Sfera chat routes create placeholder messages and call `streamAgentResponse(...)`.
- `cf-kristina` runs outside this project at `http://localhost:3000/api/mcp`.
- `cf-kristina` exposes MCP tools: `agent_message`, `agent_search`, `agent_info`.
- `agent_message` returns an MCP text payload containing JSON `AgentResult`; the Sfera adapter should render `AgentResult.text`.

## Before Adding Agents

### 1. Separate Agent Runtime Types

Introduce a clear distinction between internal and external agents.

- Internal agent: prompt, model, tools, `streamText(...)` inside `avrora-area`.
- External MCP agent: metadata plus endpoint/tool configuration; actual reasoning lives outside `avrora-area`.

Expected outcome:

- Existing `Avrora` and local `Kristina` keep working as internal agents.
- New external agents can be added without duplicating route logic.

### 2. Centralize Agent Response Dispatch

Create one dispatcher function for agent responses.

Current problem:

- `app/api/sfera/[id]/chat/route.ts` and `app/api/sfera/[id]/messages/route.ts` both directly call `streamAgentResponse(...)`.

Target behavior:

- Routes call a single agent dispatcher.
- Dispatcher decides whether to call the internal streamer or external MCP streamer.

Conceptual flow:

```text
agent.runtime === "external-mcp" -> streamExternalMcpAgentResponse(...)
otherwise                         -> streamAgentResponse(...)
```

### 3. Reuse Context Building

Avoid duplicating Sfera context selection logic.

The external MCP adapter needs nearly the same context as internal agents:

- Sfera title and description.
- Trigger message.
- Requesting user.
- Recent conversation history.
- Target placeholder message.

Target behavior:

- Shared helper builds a normalized conversation context.
- Internal and external agents consume that context differently.

### 4. Make Failure Handling Consistent

All agent failures must update the placeholder message.

Required behavior:

- If agent generation fails, save a readable error in `sferaMessage.content`.
- Always set `isGenerating: false` on failure.
- Do not leave infinite loaders in the UI.

### 5. Keep User Identity Stable

External agents should be represented as system users in Sfera.

For `cf-kristina`:

- Use a new fixed user ID.
- Use a dedicated email such as `cf-kristina@avrora.click`.
- Do not reuse the existing local `Kristina` user ID.

## cf-kristina Integration Plan

### 1. Add External Agent Config

Create a new agent instance for `cf-kristina`.

Required properties:

- `id`: `cf-kristina`
- `name`: `cf-kristina`
- `email`: `cf-kristina@avrora.click`
- `userId`: new fixed UUID, for example `00000000-0000-0000-0000-000000000003`
- `mentionPatterns`: only `@cf-kristina`
- `runtime`: `external-mcp`
- `endpoint`: `http://localhost:3000/api/mcp` as MVP fallback
- `toolName`: `agent_message`

Do not include:

- `@kristina`
- `@кристина`
- plain `cf-kristina` without `@`, unless explicitly requested later.

### 2. Register Agent Server-Side

Add `cf-kristina` to the server-side agent registry.

Expected behavior:

- `detectMentionedAgents(...)` returns `cf-kristina` only for `@cf-kristina`.
- Existing `@avrora`, `@kristina`, and `@кристина` behavior remains unchanged.

### 3. Register Agent Client-Side

Add `cf-kristina` to client-safe metadata.

This is needed for:

- mention button UI;
- optimistic placeholder messages;
- client-side agent lookup.

Files likely involved:

- `lib/ai/agents/client-registry.ts`
- `components/orbit/orbit-input.tsx`

### 4. Implement External MCP Streamer

Create a function that calls `cf-kristina` over MCP.

Responsibilities:

- Load Sfera data.
- Load recent messages.
- Build `AgentContext` for `cf-kristina`.
- Call `tools/call` with `name: "agent_message"`.
- Parse MCP result.
- Parse `AgentResult` JSON from `result.content[0].text`.
- Save `AgentResult.text` into the placeholder message.
- Set `isGenerating: false`.

### 5. AgentContext for Sfera

Send this context to `cf-kristina`:

```text
source: "sfera"
serviceId: "avrora-area"
serviceName: "Avrora Area"
spaceId: <sfera id>
spaceName: <sfera title>
userId: <requesting user id>
userName: <requesting user name or email prefix>
trigger: "mention"
responseMode: "public"
conversationHistory: <recent Sfera messages>
memoryAccess:
  own: true
  user: true
  space: true
  service: true
  write: true
```

For first safe tests, `write` may be set to `false`; for normal usage it should be `true`.

### 6. Update Sfera Routes

Routes that currently start agent generation must use the new dispatcher.

Files:

- `app/api/sfera/[id]/chat/route.ts`
- `app/api/sfera/[id]/messages/route.ts`

Required behavior:

- Internal agents still use internal streaming.
- `cf-kristina` uses external MCP streaming.
- Both paths create and update Sfera messages the same way.

### 7. Test In Chat

Manual test in Sfera:

```text
@cf-kristina привет, ты видишь контекст этой Сферы?
```

Expected UI behavior:

- User message appears.
- Placeholder from `cf-kristina` appears.
- `avrora-area` calls `http://localhost:3000/api/mcp`.
- Placeholder is replaced by `AgentResult.text`.
- `@kristina` still calls the local internal Kristina agent.

## Safety Checks

- `@cf-kristina` must not trigger local `Kristina`.
- `@kristina` must not trigger external `cf-kristina`.
- External MCP failures must not leave messages stuck in `isGenerating`.
- `cf-kristina` endpoint should eventually come from environment config, not a hardcoded URL.
- Do not move `cf-kristina` memory or reasoning into `avrora-area`.

## Later Improvements

- Add env var `CF_KRISTINA_MCP_URL`.
- Add timeout and retry policy for external MCP calls.
- Add an agent badge for `cf-kristina` in Sfera messages.
- Store external agent call metadata in `toolResults` for debugging.
- Add admin UI for enabling/disabling external agents per Sfera.
- Add integration tests for mention detection and external agent dispatch.
