import { describe, expect, it, vi } from "vitest";

import { emitAgentResponseEvent } from "./stream-events";
import type { AgentResponseContext, AgentResponseEvent } from "./types";

const event: AgentResponseEvent = {
  phase: "streaming",
  agentId: "avrora",
  messageId: "message-id",
  content: "Hello",
  sequence: 1,
};

function createContext(
  onEvent?: AgentResponseContext["onEvent"]
): AgentResponseContext {
  return {
    sferaId: "sfera-id",
    triggerMessageId: "trigger-id",
    targetMessageId: "message-id",
    requestingUserId: "user-id",
    agent: {} as AgentResponseContext["agent"],
    onEvent,
  };
}

describe("emitAgentResponseEvent", () => {
  it("delivers events to the configured realtime sink", async () => {
    const onEvent = vi.fn();

    emitAgentResponseEvent(createContext(onEvent), event);

    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it("does not fail generation when the realtime sink rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onEvent = vi.fn().mockRejectedValue(new Error("disconnected"));

    emitAgentResponseEvent(createContext(onEvent), event);
    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalledOnce();

    errorSpy.mockRestore();
  });
});
