import { DuckDBInstance, DuckDBConnection, DuckDBValue, DuckDBInstanceCache } from '@duckdb/node-api';
import path from 'path';

let instanceCache: DuckDBInstanceCache | null = null;
let connection: DuckDBConnection | null = null;

/**
 * Gets a singleton DuckDB connection.
 * Uses an instance cache and an in-memory database.
 */
export async function getDuckDBConnection(): Promise<DuckDBConnection> {
    if (!instanceCache) {
        instanceCache = new DuckDBInstanceCache();
    }
    
    if (!connection) {
        const instance = await instanceCache.getOrCreateInstance(':memory:');
        connection = await instance.connect();
        
        // Note: @duckdb/node-api usually includes parquet by default, 
        // but we can ensure it's loaded if needed via connection.run()
        try {
            await connection.run('INSTALL parquet;');
            await connection.run('LOAD parquet;');
        } catch (e) {
            // If it fails, it's likely already built-in or not needed for this env
            console.warn('Failed to explicitly load parquet extension, continuing...', e);
        }
    }
    
    return connection;
}

/**
 * Queries a Parquet file for a specific simulation run.
 * @param runId The ID of the simulation run.
 * @param type The type of data to query ('telemetry' or 'events').
 * @param sql The SQL query with {{FILE}} placeholder for the parquet path.
 */
export async function queryParquet(
    runId: string, 
    type: 'telemetry' | 'events', 
    sql: string
): Promise<Record<string, unknown>[]> {
    const conn = await getDuckDBConnection();
    
    // Resolve absolute path to the parquet file
    const filePath = path.resolve(`./data/runs/${runId}/${type}.parquet`);
    
    // Replace placeholder with actual path
    const finalSql = sql.replace('{{FILE}}', `'${filePath}'`);
    
    // Execute and read all rows
    const reader = await conn.runAndReadAll(finalSql);
    
    const names = reader.columnNames();
    const rows: DuckDBValue[][] = reader.getRows();
    
    return rows.map(row => {
        const obj: Record<string, unknown> = {};
        names.forEach((name, i) => {
            obj[name] = row[i] as unknown;
        });
        return obj;
    });
}
