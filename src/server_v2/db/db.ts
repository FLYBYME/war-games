import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import path from 'path';

const sqlite = new Database('war-games-v2.sqlite');
export const db = drizzle(sqlite, { schema });

// Helper to initialize the database (run migrations or create tables)
export async function initDb() {
    sqlite.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS weapons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            manifest TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            scenario_id TEXT,
            status TEXT NOT NULL,
            current_tick INTEGER DEFAULT 0,
            max_turns INTEGER DEFAULT 10000,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (scenario_id) REFERENCES scenarios(id)
        );
        CREATE TABLE IF NOT EXISTS bugs (
            id TEXT PRIMARY KEY,
            match_id TEXT,
            side TEXT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            status TEXT NOT NULL,
            suggested_fix TEXT,
            world_state TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bug_comments (
            id TEXT PRIMARY KEY,
            bug_id TEXT NOT NULL,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (bug_id) REFERENCES bugs(id)
        );
        CREATE TABLE IF NOT EXISTS map_regions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            min_lat REAL NOT NULL,
            max_lat REAL NOT NULL,
            min_lon REAL NOT NULL,
            max_lon REAL NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            system_prompt TEXT NOT NULL,
            model TEXT NOT NULL DEFAULT 'llama3.2',
            config TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            match_id TEXT,
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT,
            tool_calls TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (thread_id) REFERENCES threads(id)
        );
    `);
    console.log('Database initialized with tables');
}
