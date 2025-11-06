export type Mention = {
  type: "user" | "avrora";
  userId?: string;
  username?: string;
  start: number;
  end: number;
  text: string;
};

// Regex constants for performance
const MENTION_REGEX = /@([\w-]+)/g;
const AVRORA_MENTION_REGEX = /@avrora\b/i;

/**
 * Parse mentions from message text
 * Supports:
 * - @avrora - AI assistant mention
 * - @username - user mention (future)
 */
export function parseMentions(text: string): Mention[] {
  const mentions: Mention[] = [];

  // Regex for @mentions (alphanumeric, underscore, hyphen)
  const mentionRegex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  let match: RegExpExecArray | null = mentionRegex.exec(text);

  while (match !== null) {
    const username = match[1];
    const start = match.index;
    const end = start + match[0].length;

    // Check if it's Avrora mention
    if (username.toLowerCase() === "avrora") {
      mentions.push({
        type: "avrora",
        username: "avrora",
        start,
        end,
        text: match[0],
      });
    } else {
      // User mention (for future implementation)
      mentions.push({
        type: "user",
        username,
        start,
        end,
        text: match[0],
      });
    }

    match = mentionRegex.exec(text);
  }

  return mentions;
}

/**
 * Check if message contains Avrora mention
 */
export function hasAvroraMention(text: string): boolean {
  return AVRORA_MENTION_REGEX.test(text);
}

/**
 * Extract user mentions from text
 */
export function extractUserMentions(text: string): string[] {
  const mentions = parseMentions(text);
  return mentions
    .filter((m) => m.type === "user" && m.username)
    .map((m) => m.username as string);
}

/**
 * Replace mentions in text with formatted versions
 * Useful for rendering mentions with special styling
 */
export function formatMentions(
  text: string,
  formatter: (mention: Mention) => string
): string {
  const mentions = parseMentions(text);

  // Sort by start position in reverse to avoid index shifting
  const sortedMentions = [...mentions].sort((a, b) => b.start - a.start);

  let result = text;
  for (const mention of sortedMentions) {
    const formatted = formatter(mention);
    result =
      result.slice(0, mention.start) + formatted + result.slice(mention.end);
  }

  return result;
}

/**
 * Remove mention from text (useful for intent detection)
 */
export function removeMentions(text: string): string {
  return text.replace(/@[\w-]+/g, "").trim();
}

/**
 * Highlight mentions in text for UI
 * Returns array of text segments with mention markers
 */
export type TextSegment = {
  text: string;
  isMention: boolean;
  mention?: Mention;
};

export function segmentTextWithMentions(text: string): TextSegment[] {
  const mentions = parseMentions(text);
  if (mentions.length === 0) {
    return [{ text, isMention: false }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const mention of mentions) {
    // Add text before mention
    if (mention.start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, mention.start),
        isMention: false,
      });
    }

    // Add mention
    segments.push({
      text: mention.text,
      isMention: true,
      mention,
    });

    lastIndex = mention.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isMention: false,
    });
  }

  return segments;
}
