/**
 * Client-side mirror of the console payload.
 *
 * lib/admin/agents.ts is server-only, so its types cannot cross into a client
 * component. Keep the two in step when either changes.
 */

export type AgentOverrides = {
  enabled: boolean;
  model: string | null;
  temperature: number | null;
  maxSteps: number | null;
  tools: string[] | null;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    cooldownSeconds: number;
  } | null;
  mcpEndpoint: string | null;
};

export type AgentReading = {
  id: string;
  name: string;
  email: string;
  userId: string;
  runtime: "internal" | "external-mcp";

  /** Straight from code — shown, never edited. */
  code: {
    model: string;
    temperature: number | null;
    maxSteps: number | null;
    mentionPatterns: string[];
    toolNames: string[];
    mcpEndpoint: string | null;
    hasPrompt: boolean;
  };

  /** Null when no row exists: the agent runs exactly as written. */
  overrides: AgentOverrides | null;

  /** What the agent is actually running with. */
  effective: {
    enabled: boolean;
    model: string;
    temperature: number | null;
    maxSteps: number | null;
    toolNames: string[];
    mcpEndpoint: string | null;
  };

  prompt: {
    version: number | null;
    updatedAt: string | null;
    authorEmail: string | null;
    overridden: boolean;
  };

  activity: {
    requests: number;
    errors: number;
    spendCents: number;
    lastReplyAt: string | null;
    series: number[];
  };

  check: {
    at: string | null;
    ok: boolean | null;
    ms: number | null;
    error: string | null;
  };
};

export type ToolReading = {
  name: string;
  description: string;
  calls: number;
  errors: number;
  avgMs: number | null;
  lastCalledAt: string | null;
  /** Agent ids whose effective tool set includes this tool. */
  usedBy: string[];
};

export type AgentsSnapshot = {
  generatedAt: string;
  failures: Array<{ source: string; message: string }>;
  agents: AgentReading[];
  tools: ToolReading[];
};

export type PromptVersion = {
  version: number;
  prompt: string;
  note: string | null;
  createdAt: string;
  authorEmail: string | null;
};

export type PromptHistory = {
  agentId: string;
  /** Null when the agent builds its prompt from context it cannot fake. */
  code: string | null;
  versions: PromptVersion[];
};

export type CheckResult = {
  ok: boolean;
  ms: number;
  error: string | null;
  target: string;
};

/** Fields the console may send back. */
export type OverridePatch = Partial<{
  enabled: boolean;
  model: string | null;
  temperature: number | null;
  maxSteps: number | null;
  tools: string[] | null;
  mcpEndpoint: string | null;
}>;
