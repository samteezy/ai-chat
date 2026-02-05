import { randomBytes } from 'crypto';

export function generateId(prefix?: string): string {
  const id = randomBytes(12).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}

export function generateChatId(): string {
  return generateId('chat');
}

export function generateMessageId(): string {
  return generateId('msg');
}

export function generateEndpointId(): string {
  return generateId('ep');
}

export function generateVersionGroupId(): string {
  return generateId('vg');
}

export function generateLogId(): string {
  return generateId('log');
}
