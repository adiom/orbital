/**
 * System user IDs and emails for special bot accounts
 */

// Avrora AI - main AI assistant
export const AVRORA_USER_ID = "00000000-0000-0000-0000-000000000001";
export const AVRORA_EMAIL = "avrora@avrora.click";

// Claude Code - development assistant that logs its work
export const CLAUDE_CODE_USER_ID = "00000000-0000-0000-0000-000000000002";
export const CLAUDE_CODE_EMAIL = "claude-code@avrora.click";

// cf-kristina - external MCP agent
export const CF_KRISTINA_USER_ID = "00000000-0000-0000-0000-000000000003";
export const CF_KRISTINA_EMAIL = "cf-kristina@avrora.click";

// Banita - direct Orbital image capability
export const BANITA_USER_ID = "00000000-0000-0000-0000-000000000004";
export const BANITA_EMAIL = "banita@avrora.click";
export const BANITA_DISPLAY_NAME = "Banita";

// Helper function to check if user is a system bot
export function isSystemUser(userId: string): boolean {
  return (
    userId === AVRORA_USER_ID ||
    userId === CLAUDE_CODE_USER_ID ||
    userId === CF_KRISTINA_USER_ID ||
    userId === BANITA_USER_ID
  );
}

// Helper function to check if user is Claude Code
export function isClaudeCodeUser(userId: string): boolean {
  return userId === CLAUDE_CODE_USER_ID;
}

// Helper function to check if user is Avrora AI
export function isAvroraUser(userId: string): boolean {
  return userId === AVRORA_USER_ID;
}

// Helper function to check if user is cf-kristina
export function isCfKristinaUser(userId: string): boolean {
  return userId === CF_KRISTINA_USER_ID;
}

export function isBanitaUser(userId: string): boolean {
  return userId === BANITA_USER_ID;
}
