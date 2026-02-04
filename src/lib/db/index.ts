import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';

const DATABASE_PATH = process.env.DATABASE_URL || './data/chat.db';

// Ensure data directory exists
const dataDir = dirname(DATABASE_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DATABASE_PATH);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Check if a column exists in a table
function columnExists(tableName: string, columnName: string): boolean {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((col) => col.name === columnName);
}

// Initialize database with schema
export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      endpoint_id TEXT REFERENCES endpoints(id),
      model TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      parts TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_active_branch (
      chat_id TEXT PRIMARY KEY REFERENCES chats(id) ON DELETE CASCADE,
      active_leaf_message_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chats_endpoint_id ON chats(endpoint_id);
  `);

  // Add versioning columns to messages table if they don't exist
  if (!columnExists('messages', 'parent_message_id')) {
    sqlite.exec(`ALTER TABLE messages ADD COLUMN parent_message_id TEXT`);
  }
  if (!columnExists('messages', 'version_group')) {
    sqlite.exec(`ALTER TABLE messages ADD COLUMN version_group TEXT`);
  }
  if (!columnExists('messages', 'version_number')) {
    sqlite.exec(`ALTER TABLE messages ADD COLUMN version_number INTEGER DEFAULT 1`);
  }

  // Create indexes for new columns
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_version_group ON messages(version_group);
  `);

  // Migrate existing messages: link by createdAt order within each chat
  migrateExistingMessages();
}

// Migration for existing messages without version info
function migrateExistingMessages() {
  // Check if there are messages without version_group
  const needsMigration = sqlite.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE version_group IS NULL
  `).get() as { count: number };

  if (needsMigration.count === 0) return;

  // Get all chats
  const chatIds = sqlite.prepare(`SELECT DISTINCT chat_id FROM messages WHERE version_group IS NULL`).all() as { chat_id: string }[];

  for (const { chat_id } of chatIds) {
    // Get messages for this chat ordered by creation time
    const chatMessages = sqlite.prepare(`
      SELECT id, created_at FROM messages
      WHERE chat_id = ? AND version_group IS NULL
      ORDER BY created_at ASC
    `).all(chat_id) as { id: string; created_at: number }[];

    let prevMessageId: string | null = null;
    let lastMessageId: string | null = null;

    for (const msg of chatMessages) {
      // Generate a unique version group for each message
      const versionGroup = `vg_${msg.id}`;

      sqlite.prepare(`
        UPDATE messages
        SET parent_message_id = ?, version_group = ?, version_number = 1
        WHERE id = ?
      `).run(prevMessageId, versionGroup, msg.id);

      prevMessageId = msg.id;
      lastMessageId = msg.id;
    }

    // Set active branch to the last message in the chain
    if (lastMessageId) {
      const now = Date.now();
      sqlite.prepare(`
        INSERT OR REPLACE INTO chat_active_branch (chat_id, active_leaf_message_id, updated_at)
        VALUES (?, ?, ?)
      `).run(chat_id, lastMessageId, now);
    }
  }
}

// Initialize on import
initializeDatabase();
