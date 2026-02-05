import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const endpoints = sqliteTable('endpoints', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  endpointId: text('endpoint_id').references(() => endpoints.id),
  model: text('model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  parts: text('parts', { mode: 'json' }),
  parentMessageId: text('parent_message_id'),
  versionGroup: text('version_group'),
  versionNumber: integer('version_number').default(1),
  status: text('status', { enum: ['generating', 'completed', 'failed'] }).default('completed'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const chatActiveBranch = sqliteTable('chat_active_branch', {
  chatId: text('chat_id')
    .primaryKey()
    .references(() => chats.id, { onDelete: 'cascade' }),
  activeLeafMessageId: text('active_leaf_message_id').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Endpoint = typeof endpoints.$inferSelect;
export type NewEndpoint = typeof endpoints.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ChatActiveBranch = typeof chatActiveBranch.$inferSelect;
export type NewChatActiveBranch = typeof chatActiveBranch.$inferInsert;

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  level: text('level', { enum: ['debug', 'info', 'warn', 'error'] }).notNull(),
  message: text('message').notNull(),
  context: text('context', { mode: 'json' }),
  source: text('source').notNull(),
  requestId: text('request_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const userPreferences = sqliteTable('user_preferences', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;
export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;
