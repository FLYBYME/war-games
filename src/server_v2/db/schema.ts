import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    data: text('data', { mode: 'json' }).notNull(), // Full EntityProfile JSON
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const weapons = sqliteTable('weapons', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    data: text('data', { mode: 'json' }).notNull(), // Full WeaponProfile JSON
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const scenarios = sqliteTable('scenarios', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    manifest: text('manifest', { mode: 'json' }).notNull(), // Full ScenarioManifest JSON
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const matches = sqliteTable('matches', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    scenarioId: text('scenario_id').references(() => scenarios.id),
    status: text('status').notNull(), // 'pending', 'running', 'completed', 'failed'
    currentTick: integer('current_tick').default(0),
    maxTurns: integer('max_turns').default(10000),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const bugs = sqliteTable('bugs', {
    id: text('id').primaryKey(),
    matchId: text('match_id'),
    side: text('side'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    severity: text('severity').notNull(), // 'Low', 'Medium', 'High', 'Critical'
    status: text('status').notNull(),   // 'Open', 'InProgress', 'Resolved', 'Closed'
    suggestedFix: text('suggested_fix'),
    worldState: text('world_state', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const bugComments = sqliteTable('bug_comments', {
    id: text('id').primaryKey(),
    bugId: text('bug_id').notNull().references(() => bugs.id),
    author: text('author').notNull(),
    text: text('text').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const mapRegions = sqliteTable('map_regions', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    minLat: real('min_lat').notNull(),
    maxLat: real('max_lat').notNull(),
    minLon: real('min_lon').notNull(),
    maxLon: real('max_lon').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    model: text('model').notNull().default('llama3.2'),
    config: text('config', { mode: 'json' }).notNull(), // AgentConfig JSON (temp, etc)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const threads = sqliteTable('threads', {
    id: text('id').primaryKey(),
    agentId: text('agent_id').notNull().references(() => agents.id),
    matchId: text('match_id'),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const messages = sqliteTable('messages', {
    id: text('id').primaryKey(),
    threadId: text('thread_id').notNull().references(() => threads.id),
    role: text('role').notNull(), // 'user', 'assistant', 'tool', 'system'
    content: text('content'),
    toolCalls: text('tool_calls', { mode: 'json' }), // JSON array of tool calls
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
