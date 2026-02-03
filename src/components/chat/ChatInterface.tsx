'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useCallback, FormEvent, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
import type { Endpoint } from '@/lib/db/schema';
import type { ChatUIMessage, MessageMetadata } from '@/types';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'metrics'; durationMs?: number; inputTokens?: number; outputTokens?: number; endpointName?: string; modelName?: string };

interface ChatInterfaceProps {
  chatId: string;
  endpoint: Endpoint | null;
  model: string;
  initialMessages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    parts?: MessagePart[] | null;
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

  // Track chat ID with a ref to avoid stale closures in fetch callback
  const chatIdRef = useRef(currentChatId);
  chatIdRef.current = currentChatId;

  // Track endpoint/model with refs so transport body always reads latest values
  const selectedEndpointRef = useRef(selectedEndpoint);
  selectedEndpointRef.current = selectedEndpoint;

  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  // Convert initialMessages to UIMessage format with metadata
  const convertedInitialMessages: ChatUIMessage[] = useMemo(
    () =>
      initialMessages.map((m) => {
        const metricsPart = m.parts?.find((p): p is { type: 'metrics'; durationMs?: number; inputTokens?: number; outputTokens?: number; endpointName?: string; modelName?: string } => p.type === 'metrics');
        const displayParts = m.parts?.filter(p => p.type !== 'metrics') ?? [];
        const metadata: MessageMetadata | undefined = metricsPart ? {
          durationMs: metricsPart.durationMs,
          inputTokens: metricsPart.inputTokens,
          outputTokens: metricsPart.outputTokens,
          endpointName: metricsPart.endpointName,
          modelName: metricsPart.modelName,
        } : undefined;

        return {
          id: m.id,
          role: m.role,
          parts: displayParts.length > 0
            ? displayParts.filter((p): p is { type: 'text'; text: string } | { type: 'reasoning'; text: string } => p.type === 'text' || p.type === 'reasoning')
            : [{ type: 'text' as const, text: m.content }],
          metadata,
        };
      }),
    [initialMessages]
  );

  // Create transport with dynamic body and header capture
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        // Function is called on each request, reads current ref values
        body: () => ({
          endpointId: selectedEndpointRef.current?.id,
          model: selectedModelRef.current,
          chatId: chatIdRef.current,
        }),
        fetch: async (url, options) => {
          const response = await fetch(url, options);
          // Capture the chat ID from header when a new chat is created
          const chatIdHeader = response.headers.get('X-Chat-Id');
          if (chatIdHeader && !chatIdRef.current) {
            chatIdRef.current = chatIdHeader;
            setCurrentChatId(chatIdHeader);
          }
          return response;
        },
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat<ChatUIMessage>({
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
