export type ExternalUserProfile = {
  completed: true;
  name?: string;
  role?: string;
  interests?: string;
  goals?: string;
  context?: string;
  completedAt?: string;
};

type ExternalAgentResult = {
  text?: unknown;
  sources?: unknown;
  metadata?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readProfileField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildExternalUserProfile(
  settings: unknown
): ExternalUserProfile | undefined {
  if (!isRecord(settings)) return undefined;

  const onboarding = settings.onboarding;
  if (!isRecord(onboarding) || onboarding.completed !== true) return undefined;

  const profile: ExternalUserProfile = {
    completed: true,
  };
  const name = readProfileField(onboarding.name);
  const role = readProfileField(onboarding.role);
  const interests = readProfileField(onboarding.interests);
  const goals = readProfileField(onboarding.goals);
  const context = readProfileField(onboarding.context);
  const completedAt = readProfileField(onboarding.completedAt);

  if (name) profile.name = name;
  if (role) profile.role = role;
  if (interests) profile.interests = interests;
  if (goals) profile.goals = goals;
  if (context) profile.context = context;
  if (completedAt) profile.completedAt = completedAt;

  return profile;
}

export function canAccessPrivateKristinaMemory(user?: {
  id?: string;
  email?: string;
}): boolean {
  if (!user) return false;

  const allowedUsers = (
    process.env.CF_KRISTINA_PRIVATE_MEMORY_USERS ?? ''
  )
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  const userId = user.id?.toLowerCase();
  const userEmail = user.email?.toLowerCase();
  return allowedUsers.some(
    (allowedUser) => allowedUser === userId || allowedUser === userEmail,
  );
}

export function buildMemoryDebugToolResult(agentResult: ExternalAgentResult) {
  const sources = Array.isArray(agentResult.sources)
    ? agentResult.sources.filter(isRecord)
    : [];
  const memories = sources.map((source) => ({
    id: typeof source.id === "string" ? source.id : undefined,
    snippet:
      typeof source.snippet === "string" ? source.snippet : String(source.snippet ?? ""),
    similarity: typeof source.similarity === "number" ? source.similarity : undefined,
    source: typeof source.source === "string" ? source.source : undefined,
    sourceType:
      typeof source.sourceType === "string" ? source.sourceType : undefined,
  }));

  return {
    toolName: "cf-kristina-memory-debug",
    success: true,
    message:
      memories.length > 0
        ? "Кристина прочитала память перед ответом."
        : "Кристина прочитала память, но не нашла подходящих воспоминаний.",
    memories,
    metadata: isRecord(agentResult.metadata) ? agentResult.metadata : undefined,
  };
}
