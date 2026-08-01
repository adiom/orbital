export type Gauge = {
  value: number;
  series: number[];
  total?: number;
};

/** What a delete would take with it, from POST /api/admin/users. */
export type DeleteImpact = {
  people: number;
  cells: number;
  messages: number;
  foreignMessages: number;
  chats: number;
  documents: number;
  aiLogs: number;
  keys: number;
  agents: number;
};

export type DeletePreview = {
  impact: DeleteImpact;
  skipped: Array<{ id: string; reason: string }>;
};

export type AdminOverview = {
  generatedAt: string;
  /** Sensors that failed this pass. Their panels show zeros. */
  failures: Array<{ source: string; message: string }>;
  gauges: {
    people: Gauge;
    livingCells: Gauge;
    messages24h: Gauge;
    aiRequests24h: Gauge;
    spend24hCents: Gauge;
    errors24h: Gauge;
  };
  people: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    lastSeen: string | null;
    cellCount: number;
    messageCount: number;
    onboarded: boolean;
    series: number[];
  }>;
  cells: Array<{
    id: string;
    title: string;
    visibility: "public" | "private" | "dao";
    createdAt: string;
    updatedAt: string;
    ownerName: string | null;
    ownerEmail: string;
    memberCount: number;
    messageCount: number;
  }>;
  keys: Array<{
    id: string;
    name: string;
    prefix: string;
    usageCount: number;
    lastUsedAt: string | null;
    revokedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    ownerEmail: string;
  }>;
  spend: {
    days: number;
    byProvider: Array<{
      provider: string;
      requests: number;
      tokens: number;
      cents: number;
    }>;
  };
  agents: Array<{
    id: string;
    name: string;
    healthStatus: "healthy" | "unhealthy" | "unknown";
    lastHealthCheck: string | null;
    failedWebhookCount: number;
  }>;
  events: Array<{
    at: string;
    source: string;
    label: string | null;
    detail: string | null;
    status: string;
    durationMs: number | null;
  }>;
};
