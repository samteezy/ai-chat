import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateChatId,
  generateMessageId,
  generateEndpointId,
  generateLogId,
} from '@/lib/utils/id';

describe('ID generation', () => {
  describe('generateId', () => {
    it('generates a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('generates an ID with 24 hex characters (12 bytes)', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]{24}$/);
    });

    it('adds prefix when provided', () => {
      const id = generateId('test');
      expect(id).toMatch(/^test_[a-f0-9]{24}$/);
    });
  });

  describe('generateChatId', () => {
    it('generates an ID with chat_ prefix', () => {
      const id = generateChatId();
      expect(id).toMatch(/^chat_[a-f0-9]{24}$/);
    });
  });

  describe('generateMessageId', () => {
    it('generates an ID with msg_ prefix', () => {
      const id = generateMessageId();
      expect(id).toMatch(/^msg_[a-f0-9]{24}$/);
    });
  });

  describe('generateEndpointId', () => {
    it('generates an ID with ep_ prefix', () => {
      const id = generateEndpointId();
      expect(id).toMatch(/^ep_[a-f0-9]{24}$/);
    });
  });

  describe('generateLogId', () => {
    it('generates an ID with log_ prefix', () => {
      const id = generateLogId();
      expect(id).toMatch(/^log_[a-f0-9]{24}$/);
    });
  });
});
