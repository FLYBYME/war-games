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
