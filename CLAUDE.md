# AI Chat Application

A web-based chat application for interacting with AI models via OpenAI-compatible endpoints (llama.cpp, llama-swap).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI SDK**: Vercel AI SDK 6 (`ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/react`)
- **Database**: SQLite via `better-sqlite3` + Drizzle ORM
- **Testing**: Vitest + `@testing-library/react`
- **Styling**: Tailwind CSS 4
- **Package Manager**: npm

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── chat/          # Streaming chat completions
│   │   ├── chats/         # Chat CRUD operations
│   │   ├── endpoints/     # Endpoint CRUD operations
│   │   └── models/        # Fetch models from endpoint
│   ├── chat/
│   │   ├── [id]/          # Individual chat view
│   │   └── new/           # New chat page
│   └── settings/          # Endpoint management
├── components/
│   ├── chat/              # Chat UI components
│   └── settings/          # Settings UI components
├── lib/
│   ├── ai/                # AI provider utilities
│   ├── db/                # Database connection and schema
│   └── utils/             # Utility functions
└── types/                 # TypeScript types
```

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio
```

## Database

SQLite database stored at `./data/chat.db`. Schema includes:

- **endpoints**: Saved OpenAI-compatible API endpoints
- **chats**: Chat conversations with endpoint/model references
- **messages**: Individual messages within chats

The database is auto-initialized on first run.

## Key Files

- `src/lib/ai/provider.ts` - Creates OpenAI-compatible providers
- `src/lib/ai/models.ts` - Fetches available models from endpoints
- `src/lib/db/schema.ts` - Drizzle ORM schema definitions
- `src/app/api/chat/route.ts` - Streaming chat API with persistence
- `src/components/chat/ChatInterface.tsx` - Main chat UI component

## Adding a New Endpoint

1. Go to Settings page (`/settings`)
2. Enter endpoint name and base URL (e.g., `http://localhost:8080/v1`)
3. Optionally add API key and set as default
4. Test connection before saving

## Architecture Notes

- Uses `useChat` hook from `@ai-sdk/react` with `DefaultChatTransport` for streaming
- Messages use the `UIMessage` format with `parts` array containing `{ type: 'text', text: string }`
- Chat API uses `toUIMessageStreamResponse()` for streaming responses
- Messages are persisted on stream completion via `onFinish` callback
- Provider factory pattern allows switching between endpoints

## AI SDK 6 Migration Notes

The app uses Vercel AI SDK v6 which has significant API changes:

- `useChat` hook no longer provides `input`, `handleInputChange`, `handleSubmit` - manage input state separately
- Use `DefaultChatTransport` for configuring API endpoint, body, and headers
- Messages are now `UIMessage[]` with `parts` array instead of `content` string
- Use `sendMessage({ text: '...' })` instead of `handleSubmit()`
- Check `status` property (`'submitted' | 'streaming' | 'ready' | 'error'`) instead of `isLoading`
- API route uses `result.toUIMessageStreamResponse()` instead of `result.toDataStreamResponse()`

## Testing

### Test Coverage Goals

The project targets 100% test coverage. All new features must include tests.

### Running Tests

```bash
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once (CI mode)
```

### Test Structure

```
tests/
├── helpers/
│   ├── fixtures/           # Sample data (endpoints, chats, messages)
│   └── mocks/              # Mock utilities (db, fetch, navigation, ai-sdk)
├── unit/
│   ├── components/
│   │   ├── chat/           # Chat component tests
│   │   └── settings/       # Settings component tests
│   └── lib/                # Library function tests
└── integration/
    └── api/                # API route tests
```

### Writing Tests

1. **Components**: Use `@testing-library/react` with `vi.mock()` for dependencies
2. **API Routes**: Use dynamic imports with mocked database
3. **Follow existing patterns**: Check similar test files for mock setup

### Test Helpers

Import from `@tests/helpers`:

- **Fixtures**: `mockEndpoint`, `mockChats`, `mockMessages`, `createMockEndpoint()`, etc.
- **Mocks**: `createMockDb()`, `mockGlobalFetch()`, `mockNextNavigation()`, `createMockUseChat()`
