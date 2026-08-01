import type { UIMessage } from "ai";

import type { Attachment, ToolResult } from "@/components/chat/shared-message-type";
import type { AgentResponsePhase } from "@/lib/ai/agents/types";

export type OrbitUserMessageData = {
  clientMessageId: string;
  message: {
    id: string;
    content: string;
    userId: string;
    userEmail: string;
    parentMessageId: string | null;
    attachments: Attachment[];
    isForked: false;
    forkedSferaId: null;
    createdAt: string;
  };
};

export type OrbitStreamInitData = {
  clientMessageId: string;
  agentMessageIds: string[];
};

export type OrbitAgentMessageData = {
  messageId: string;
  agentId: string;
  userId: string;
  userEmail: string;
  parentMessageId: string;
  content: string;
  phase: AgentResponsePhase;
  sequence: number;
  createdAt: string;
  error?: string;
  toolResults?: ToolResult[];
};

export type OrbitUIMessage = UIMessage<
  never,
  {
    "stream-init": OrbitStreamInitData;
    "user-message": OrbitUserMessageData;
    "agent-message": OrbitAgentMessageData;
  }
>;
