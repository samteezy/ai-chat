import type { Message } from '@/lib/db/schema';

export interface MessageWithVersionInfo extends Message {
  versionInfo?: {
    versionGroup: string;
    versionNumber: number;
    totalVersions: number;
    siblingIds: string[];
  };
}

/**
 * Build a message chain by traversing from a leaf message to the root.
 * Returns messages in chronological order (root first).
 */
export function buildMessageChain(
  messages: Message[],
  leafId: string
): Message[] {
  const messageMap = new Map<string, Message>();
  for (const msg of messages) {
    messageMap.set(msg.id, msg);
  }

  const chain: Message[] = [];
  let currentId: string | null = leafId;

  while (currentId) {
    const message = messageMap.get(currentId);
    if (!message) break;
    chain.unshift(message); // Add to beginning to maintain chronological order
    currentId = message.parentMessageId;
  }

  return chain;
}

/**
 * Get all sibling versions of a message (messages with the same versionGroup).
 * Returns them sorted by versionNumber.
 */
export function getVersionSiblings(
  messages: Message[],
  versionGroup: string
): Message[] {
  return messages
    .filter((m) => m.versionGroup === versionGroup)
    .sort((a, b) => (a.versionNumber ?? 1) - (b.versionNumber ?? 1));
}

/**
 * Get the next version number for a version group.
 */
export function getNextVersionNumber(
  messages: Message[],
  versionGroup: string
): number {
  const siblings = getVersionSiblings(messages, versionGroup);
  if (siblings.length === 0) return 1;
  const maxVersion = Math.max(...siblings.map((m) => m.versionNumber ?? 1));
  return maxVersion + 1;
}

/**
 * Add version info to each message in the chain.
 * Requires all messages from the chat to compute sibling info.
 */
export function addVersionInfoToChain(
  chain: Message[],
  allMessages: Message[]
): MessageWithVersionInfo[] {
  return chain.map((msg) => {
    if (!msg.versionGroup) {
      return msg as MessageWithVersionInfo;
    }

    const siblings = getVersionSiblings(allMessages, msg.versionGroup);
    return {
      ...msg,
      versionInfo: {
        versionGroup: msg.versionGroup,
        versionNumber: msg.versionNumber ?? 1,
        totalVersions: siblings.length,
        siblingIds: siblings.map((s) => s.id),
      },
    };
  });
}

/**
 * Find the active leaf message for a chat.
 * If no active branch record exists, returns the most recently created message.
 */
export function findActiveLeaf(
  messages: Message[],
  activeLeafId?: string | null
): Message | undefined {
  if (activeLeafId) {
    return messages.find((m) => m.id === activeLeafId);
  }

  // Fallback: find the most recent message without any children
  const messageIds = new Set(messages.map((m) => m.id));
  const messagesWithChildren = new Set(
    messages.filter((m) => m.parentMessageId).map((m) => m.parentMessageId!)
  );

  const leaves = messages.filter((m) => !messagesWithChildren.has(m.id));
  if (leaves.length === 0) return messages[messages.length - 1];

  // Return the most recently created leaf
  return leaves.reduce((latest, msg) =>
    msg.createdAt > latest.createdAt ? msg : latest
  );
}
