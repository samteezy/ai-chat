'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useCallback, FormEvent, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ModelSelector } from './ModelSelector';
import { EditMessageModal } from './EditMessageModal';
import type { Endpoint } from '@/lib/db/schema';
import type { ChatUIMessageWithVersioning, MessageMetadata, VersionInfo } from '@/types';

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
    versionInfo?: VersionInfo;
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);

  // Track chat ID with a ref to avoid stale closures in fetch callback
  const chatIdRef = useRef(currentChatId);
  chatIdRef.current = currentChatId;

  // Track endpoint/model with refs so transport body always reads latest values
  const selectedEndpointRef = useRef(selectedEndpoint);
  selectedEndpointRef.current = selectedEndpoint;

  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  // Track the parent message ID (last message in current chain) for linking new messages
  const parentMessageIdRef = useRef<string | null>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].id : null
  );

  // Convert initialMessages to UIMessage format with metadata and version info
  const convertedInitialMessages: ChatUIMessageWithVersioning[] = useMemo(
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
          versionInfo: m.versionInfo,
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
          parentMessageId: parentMessageIdRef.current,
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

  const { messages, setMessages, sendMessage, status, error } = useChat<ChatUIMessageWithVersioning>({
    transport,
    messages: convertedInitialMessages,
    onFinish: async () => {
      // Refresh messages to get server-assigned IDs and update parent ref
      if (currentChatId) {
        try {
          const response = await fetch(`/api/chats/${currentChatId}`);
          if (response.ok) {
            const data = await response.json();
            const newMessages: ChatUIMessageWithVersioning[] = data.messages.map((m: any) => {
              const metricsPart = m.parts?.find((p: any) => p.type === 'metrics');
              const displayParts = m.parts?.filter((p: any) => p.type !== 'metrics') ?? [];
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
                  ? displayParts.filter((p: any) => p.type === 'text' || p.type === 'reasoning')
                  : [{ type: 'text' as const, text: m.content }],
                metadata,
                versionInfo: m.versionInfo,
              };
            });

            setMessages(newMessages);
            // Update parent ref to the last message
            if (newMessages.length > 0) {
              parentMessageIdRef.current = newMessages[newMessages.length - 1].id;
            }
          }
        } catch (err) {
          console.error('Failed to refresh messages after send:', err);
        }
      }
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

  // Get message content by ID
  const getMessageContent = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return '';
      return message.parts
        .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
        .map((part) => part.text)
        .join('');
    },
    [messages]
  );

  // Helper to fetch and update messages from the server
  const refreshMessages = useCallback(async () => {
    if (!currentChatId) return;

    try {
      const response = await fetch(`/api/chats/${currentChatId}`);
      if (!response.ok) return;

      const data = await response.json();
      const newMessages: ChatUIMessageWithVersioning[] = data.messages.map((m: any) => {
        const metricsPart = m.parts?.find((p: any) => p.type === 'metrics');
        const displayParts = m.parts?.filter((p: any) => p.type !== 'metrics') ?? [];
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
            ? displayParts.filter((p: any) => p.type === 'text' || p.type === 'reasoning')
            : [{ type: 'text' as const, text: m.content }],
          metadata,
          versionInfo: m.versionInfo,
        };
      });

      setMessages(newMessages);
      // Update parent ref to the last message
      if (newMessages.length > 0) {
        parentMessageIdRef.current = newMessages[newMessages.length - 1].id;
      }
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }, [currentChatId, setMessages]);

  // Handle editing a user message
  const handleEdit = useCallback(
    async (newContent: string) => {
      if (!editingMessageId || !currentChatId) return;

      setEditingMessageId(null);

      try {
        const response = await fetch(`/api/messages/${editingMessageId}/edit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newContent }),
        });

        if (!response.ok) {
          throw new Error('Failed to edit message');
        }

        // Wait for streaming to complete by consuming the response
        await response.text();

        // Fetch updated messages
        await refreshMessages();
        router.refresh(); // Also refresh sidebar chat list
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [editingMessageId, currentChatId, refreshMessages, router]
  );

  // Handle regenerating an assistant message
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (!currentChatId) return;

      setRegeneratingMessageId(messageId);

      try {
        const response = await fetch(`/api/messages/${messageId}/regenerate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error('Failed to regenerate message');
        }

        // Wait for streaming to complete by consuming the response
        await response.text();

        // Fetch updated messages
        await refreshMessages();
        router.refresh(); // Also refresh sidebar chat list
      } catch (err) {
        console.error('Failed to regenerate message:', err);
      } finally {
        setRegeneratingMessageId(null);
      }
    },
    [currentChatId, refreshMessages, router]
  );

  // Handle switching message version
  const handleSwitchVersion = useCallback(
    async (messageId: string, direction: 'prev' | 'next') => {
      const message = messages.find((m) => m.id === messageId);
      if (!message?.versionInfo) return;

      const { siblingIds, versionNumber } = message.versionInfo;
      const targetIndex = direction === 'prev' ? versionNumber - 2 : versionNumber;
      const targetVersionId = siblingIds[targetIndex];

      if (!targetVersionId) return;

      try {
        const response = await fetch(`/api/messages/${messageId}/switch-version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetVersionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to switch version');
        }

        // The API returns the new message chain directly
        const data = await response.json();
        const newMessages: ChatUIMessageWithVersioning[] = data.messages.map((m: any) => {
          const metricsPart = m.parts?.find((p: any) => p.type === 'metrics');
          const displayParts = m.parts?.filter((p: any) => p.type !== 'metrics') ?? [];
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
              ? displayParts.filter((p: any) => p.type === 'text' || p.type === 'reasoning')
              : [{ type: 'text' as const, text: m.content }],
            metadata,
            versionInfo: m.versionInfo,
          };
        });

        setMessages(newMessages);
        // Update parent ref to the last message in the new chain
        if (newMessages.length > 0) {
          parentMessageIdRef.current = newMessages[newMessages.length - 1].id;
        }
      } catch (err) {
        console.error('Failed to switch version:', err);
      }
    },
    [messages, setMessages]
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
        <MessageList
          messages={messages}
          isLoading={isLoading}
          regeneratingMessageId={regeneratingMessageId}
          onEdit={(messageId) => setEditingMessageId(messageId)}
          onRegenerate={handleRegenerate}
          onSwitchVersion={handleSwitchVersion}
        />
      </div>

      {/* Edit Modal */}
      <EditMessageModal
        isOpen={!!editingMessageId}
        initialContent={editingMessageId ? getMessageContent(editingMessageId) : ''}
        onSave={handleEdit}
        onCancel={() => setEditingMessageId(null)}
      />

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
