import { describe, it, expect } from 'vitest';
import {
  buildMessageChain,
  getVersionSiblings,
  getNextVersionNumber,
  addVersionInfoToChain,
  findActiveLeaf,
} from '@/lib/utils/messageTree';
import type { Message } from '@/lib/db/schema';

// Helper to create mock messages
function createMessage(
  id: string,
  parentMessageId: string | null = null,
  versionGroup: string | null = null,
  versionNumber: number | null = 1,
  createdAt: Date = new Date()
): Message {
  return {
    id,
    chatId: 'chat_123',
    role: 'user',
    content: `Message ${id}`,
    parts: null,
    parentMessageId,
    versionGroup,
    versionNumber,
    createdAt,
  };
}

describe('messageTree', () => {
  describe('buildMessageChain', () => {
    it('builds a chain from root to leaf', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_2', 'msg_1', 'vg_2', 1),
        createMessage('msg_3', 'msg_2', 'vg_3', 1),
      ];

      const chain = buildMessageChain(messages, 'msg_3');

      expect(chain).toHaveLength(3);
      expect(chain[0].id).toBe('msg_1');
      expect(chain[1].id).toBe('msg_2');
      expect(chain[2].id).toBe('msg_3');
    });

    it('returns only the target message if it has no parent', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
      ];

      const chain = buildMessageChain(messages, 'msg_1');

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe('msg_1');
    });

    it('returns empty array for non-existent message', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
      ];

      const chain = buildMessageChain(messages, 'msg_nonexistent');

      expect(chain).toHaveLength(0);
    });

    it('handles branching by only including ancestors', () => {
      // Tree structure:
      // msg_1 -> msg_2 -> msg_3a (branch A)
      //              \-> msg_3b (branch B)
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_2', 'msg_1', 'vg_2', 1),
        createMessage('msg_3a', 'msg_2', 'vg_3', 1),
        createMessage('msg_3b', 'msg_2', 'vg_3', 2),
      ];

      const chainA = buildMessageChain(messages, 'msg_3a');
      expect(chainA).toHaveLength(3);
      expect(chainA.map((m) => m.id)).toEqual(['msg_1', 'msg_2', 'msg_3a']);

      const chainB = buildMessageChain(messages, 'msg_3b');
      expect(chainB).toHaveLength(3);
      expect(chainB.map((m) => m.id)).toEqual(['msg_1', 'msg_2', 'msg_3b']);
    });
  });

  describe('getVersionSiblings', () => {
    it('returns all messages with the same version group', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_1v2', null, 'vg_1', 2),
        createMessage('msg_2', 'msg_1', 'vg_2', 1),
      ];

      const siblings = getVersionSiblings(messages, 'vg_1');

      expect(siblings).toHaveLength(2);
      expect(siblings.map((m) => m.id)).toEqual(['msg_1', 'msg_1v2']);
    });

    it('returns messages sorted by version number', () => {
      const messages: Message[] = [
        createMessage('msg_v3', null, 'vg_1', 3),
        createMessage('msg_v1', null, 'vg_1', 1),
        createMessage('msg_v2', null, 'vg_1', 2),
      ];

      const siblings = getVersionSiblings(messages, 'vg_1');

      expect(siblings.map((m) => m.versionNumber)).toEqual([1, 2, 3]);
    });

    it('returns empty array for non-existent version group', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
      ];

      const siblings = getVersionSiblings(messages, 'vg_nonexistent');

      expect(siblings).toHaveLength(0);
    });
  });

  describe('getNextVersionNumber', () => {
    it('returns next version number for existing group', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_2', null, 'vg_1', 2),
      ];

      const nextVersion = getNextVersionNumber(messages, 'vg_1');

      expect(nextVersion).toBe(3);
    });

    it('returns 1 for non-existent version group', () => {
      const messages: Message[] = [];

      const nextVersion = getNextVersionNumber(messages, 'vg_new');

      expect(nextVersion).toBe(1);
    });

    it('handles gaps in version numbers', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_2', null, 'vg_1', 5), // gap
      ];

      const nextVersion = getNextVersionNumber(messages, 'vg_1');

      expect(nextVersion).toBe(6);
    });
  });

  describe('addVersionInfoToChain', () => {
    it('adds version info to each message in the chain', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_1v2', null, 'vg_1', 2),
        createMessage('msg_2', 'msg_1', 'vg_2', 1),
      ];

      const chain = [messages[0], messages[2]];
      const result = addVersionInfoToChain(chain, messages);

      expect(result[0].versionInfo).toEqual({
        versionGroup: 'vg_1',
        versionNumber: 1,
        totalVersions: 2,
        siblingIds: ['msg_1', 'msg_1v2'],
      });

      expect(result[1].versionInfo).toEqual({
        versionGroup: 'vg_2',
        versionNumber: 1,
        totalVersions: 1,
        siblingIds: ['msg_2'],
      });
    });

    it('handles messages without version group', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, null, null),
      ];

      const result = addVersionInfoToChain(messages, messages);

      expect(result[0].versionInfo).toBeUndefined();
    });
  });

  describe('findActiveLeaf', () => {
    it('returns the message with the specified ID', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1),
        createMessage('msg_2', 'msg_1', 'vg_2', 1),
      ];

      const leaf = findActiveLeaf(messages, 'msg_2');

      expect(leaf?.id).toBe('msg_2');
    });

    it('returns the most recently created leaf when no activeLeafId provided', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1, new Date('2024-01-01')),
        createMessage('msg_2', 'msg_1', 'vg_2', 1, new Date('2024-01-02')),
        createMessage('msg_3', 'msg_1', 'vg_3', 1, new Date('2024-01-03')), // Newer leaf
      ];

      const leaf = findActiveLeaf(messages);

      expect(leaf?.id).toBe('msg_3');
    });

    it('excludes messages that have children when finding leaf', () => {
      const messages: Message[] = [
        createMessage('msg_1', null, 'vg_1', 1, new Date('2024-01-01')),
        createMessage('msg_2', 'msg_1', 'vg_2', 1, new Date('2024-01-03')), // Has child
        createMessage('msg_3', 'msg_2', 'vg_3', 1, new Date('2024-01-02')), // Leaf
      ];

      const leaf = findActiveLeaf(messages);

      expect(leaf?.id).toBe('msg_3');
    });

    it('returns undefined for empty messages array', () => {
      const leaf = findActiveLeaf([]);

      expect(leaf).toBeUndefined();
    });
  });
});
