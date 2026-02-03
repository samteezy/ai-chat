export type { Endpoint, Chat, Message, NewEndpoint, NewChat, NewMessage } from '@/lib/db/schema';
export type { Model, ModelsResponse } from '@/lib/ai/models';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
