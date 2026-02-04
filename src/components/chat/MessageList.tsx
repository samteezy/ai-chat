'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatUIMessageWithVersioning, VersionInfo } from '@/types';
import { MessageControls } from './MessageControls';

interface MessageListProps {
  messages: ChatUIMessageWithVersioning[];
  isLoading: boolean;
  regeneratingMessageId?: string | null;
  onEdit?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onSwitchVersion?: (messageId: string, direction: 'prev' | 'next') => void;
}

interface ReasoningBlockProps {
  reasoning: string;
}

function ReasoningBlock({ reasoning }: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>Thinking</span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
          {reasoning}
        </div>
      )}
    </div>
  );
}

export function MessageList({
  messages,
  isLoading,
  regeneratingMessageId,
  onEdit,
  onRegenerate,
  onSwitchVersion,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p>Start a conversation by sending a message</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => {
        const isRegenerating = regeneratingMessageId === message.id;
        const messageContent = message.parts
          .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
          .map((part) => part.text)
          .join('');

        return (
          <div
            key={message.id}
            className={`flex flex-col ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{messageContent}</p>
              ) : (
                <div>
                  {isRegenerating ? (
                    <div className="flex space-x-1 py-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  ) : (
                    <>
                      {message.parts.map((part, index) => {
                        if (part.type === 'reasoning') {
                          return (
                            <ReasoningBlock
                              key={index}
                              reasoning={'text' in part ? (part as { type: 'reasoning'; text: string }).text : ''}
                            />
                          );
                        }
                        if (part.type === 'text') {
                          return (
                            <div key={index} className="prose dark:prose-invert prose-sm max-w-none">
                              <ReactMarkdown>{(part as { type: 'text'; text: string }).text}</ReactMarkdown>
                            </div>
                          );
                        }
                        return null;
                      })}
                      {message.metadata && (message.metadata.durationMs || message.metadata.inputTokens || message.metadata.outputTokens || message.metadata.endpointName || message.metadata.modelName) && (
                        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                          {(message.metadata.endpointName || message.metadata.modelName) && (
                            <span>
                              {message.metadata.endpointName}{message.metadata.endpointName && message.metadata.modelName ? ' / ' : ''}{message.metadata.modelName}
                            </span>
                          )}
                          {message.metadata.durationMs != null && (
                            <span>{(message.metadata.durationMs / 1000).toFixed(1)}s</span>
                          )}
                          {(message.metadata.inputTokens != null || message.metadata.outputTokens != null) && (
                            <span>
                              {message.metadata.inputTokens ?? '?'} → {message.metadata.outputTokens ?? '?'} tokens
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Message controls */}
            <MessageControls
              messageId={message.id}
              role={message.role as 'user' | 'assistant' | 'system'}
              versionInfo={message.versionInfo}
              isLoading={isLoading || isRegenerating}
              onEdit={message.role === 'user' ? () => onEdit?.(message.id) : undefined}
              onRegenerate={message.role === 'assistant' ? () => onRegenerate?.(message.id) : undefined}
              onSwitchVersion={
                message.versionInfo && message.versionInfo.totalVersions > 1
                  ? (direction) => onSwitchVersion?.(message.id, direction)
                  : undefined
              }
            />
          </div>
        );
      })}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex justify-start">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
