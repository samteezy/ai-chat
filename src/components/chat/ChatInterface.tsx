'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useState, useCallback, FormEvent, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
import type { Endpoint } from '@/lib/db/schema';

interface ChatInterfaceProps {
  chatId: string;
  endpoint: Endpoint | null;
  model: string;
  initialMessages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  endpoints: Endpoint[];
}

export function ChatInterface({
  chatId,
  endpoint: initialEndpoint,
  model: initialModel,
  initialMessages,
  endpoints,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(
    initialEndpoint
  );
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [input, setInput] = useState('');

  // Convert initialMessages to UIMessage format
  const convertedInitialMessages: UIMessage[] = useMemo(
    () =>
      initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
      })),
    [initialMessages]
  );

  // Create transport with dynamic body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          endpointId: selectedEndpoint?.id,
          model: selectedModel,
          chatId: currentChatId,
        },
      }),
    [selectedEndpoint?.id, selectedModel, currentChatId]
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: convertedInitialMessages,
    onFinish: () => {
      // Refresh to update chat list if this was a new chat
      if (!chatId) {
        router.refresh();
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';
  const canSend = selectedEndpoint && selectedModel && input.trim();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!canSend || isLoading) return;

      const text = input.trim();
      setInput('');

      try {
        await sendMessage({ text });
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [canSend, isLoading, input, sendMessage]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with model selector */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <ModelSelector
          endpoints={endpoints}
          selectedEndpoint={selectedEndpoint}
          selectedModel={selectedModel}
          onEndpointChange={setSelectedEndpoint}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          Error: {error.message}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <MessageInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          disabled={!canSend}
        />
      </div>
    </div>
  );
}
