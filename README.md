# AI Chat Application

A web-based chat application for interacting with AI models via OpenAI-compatible endpoints (llama.cpp, llama-swap, and other compatible servers).

## Features

- **Multiple Endpoints**: Connect to any OpenAI-compatible API endpoint
- **Message Versioning**: Edit messages and regenerate responses with branching history
- **Thinking/Reasoning Display**: View model reasoning tokens when available
- **Sidebar Search**: Filter chats by title
- **Bulk Operations**: Multi-select chats for bulk deletion
- **Usage Metrics**: Track token usage per response
- **Streaming Responses**: Real-time streaming with Vercel AI SDK

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI SDK**: Vercel AI SDK 6
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Styling**: Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chat

# Install dependencies
npm install

# Initialize the database
npm run db:push

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8084`.

### Configuration

1. Navigate to Settings (`/settings`)
2. Add your OpenAI-compatible endpoint:
   - **Name**: A friendly name for the endpoint
   - **Base URL**: The API URL (e.g., `http://localhost:8080/v1`)
   - **API Key**: Optional, if required by your endpoint
3. Test the connection and save
4. Set an endpoint as default for new chats

## Usage

### Creating a Chat

1. Click "New Chat" or navigate to `/chat/new`
2. Select an endpoint and model from the dropdowns
3. Start chatting

### Message Versioning

- **Edit**: Click the edit icon on any user message to modify it
- **Regenerate**: Click regenerate on an assistant message for a new response
- **Navigate Versions**: Use the version arrows to browse message history

### Managing Chats

- **Search**: Use the search box in the sidebar to filter chats
- **Delete**: Click the trash icon on individual chats
- **Bulk Delete**: Select multiple chats with checkboxes, then delete all at once

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio
```

## License

MIT
