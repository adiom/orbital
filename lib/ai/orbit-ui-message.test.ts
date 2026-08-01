import { describe, expect, it } from "vitest";

import type { OrbitAgentMessageData } from "./orbit-ui-message";

function reconcileAgentSnapshots(events: OrbitAgentMessageData[]) {
  const messages = new Map<string, OrbitAgentMessageData>();

  for (const event of events) {
    const previous = messages.get(event.messageId);
    if (!previous || event.sequence >= previous.sequence) {
      messages.set(event.messageId, event);
    }
  }

  return messages;
}

describe("Orbit agent stream snapshots", () => {
  it("reconciles interleaved agents independently by database message id", () => {
    const base = {
      userId: "agent-user",
      userEmail: "agent@orbital.local",
      parentMessageId: "user-message",
      createdAt: new Date(0).toISOString(),
    };
    const events: OrbitAgentMessageData[] = [
      {
        ...base,
        messageId: "agent-a-message",
        agentId: "agent-a",
        content: "",
        phase: "started",
        sequence: 0,
      },
      {
        ...base,
        messageId: "agent-b-message",
        agentId: "agent-b",
        content: "Second",
        phase: "completed",
        sequence: 1,
      },
      {
        ...base,
        messageId: "agent-a-message",
        agentId: "agent-a",
        content: "First",
        phase: "completed",
        sequence: 2,
      },
    ];

    const reconciled = reconcileAgentSnapshots(events);

    expect(reconciled).toHaveLength(2);
    expect(reconciled.get("agent-a-message")?.content).toBe("First");
    expect(reconciled.get("agent-b-message")?.content).toBe("Second");
  });

  it("ignores an out-of-order snapshot for the same message", () => {
    const base: OrbitAgentMessageData = {
      messageId: "agent-message",
      agentId: "agent",
      userId: "agent-user",
      userEmail: "agent@orbital.local",
      parentMessageId: "user-message",
      content: "complete answer",
      phase: "completed",
      sequence: 4,
      createdAt: new Date(0).toISOString(),
    };

    const reconciled = reconcileAgentSnapshots([
      base,
      { ...base, content: "older", phase: "streaming", sequence: 3 },
    ]);

    expect(reconciled.get("agent-message")).toEqual(base);
  });
});
