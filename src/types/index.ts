import type { UIMessage } from 'ai';

export type { Endpoint, Chat, Message, NewEndpoint, NewChat, NewMessage, ChatActiveBranch, NewChatActiveBranch } from '@/lib/db/schema';
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

export interface MessageMetadata {
  createdAt?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  endpointName?: string;
  modelName?: string;
}

export interface VersionInfo {
  versionGroup: string;
  versionNumber: number;
  totalVersions: number;
  siblingIds: string[];
}

export type ChatUIMessage = UIMessage<MessageMetadata>;

export interface ChatUIMessageWithVersioning extends ChatUIMessage {
  versionInfo?: VersionInfo;
}
