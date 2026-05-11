import parquet from 'parquetjs';
import path from 'path';
import fs from 'fs';

export class ParquetService {
    private writer: any;
    private schema: any;
    private initPromise: Promise<void> | null = null;
    private isClosing: boolean = false;
    private isClosed: boolean = false;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(private runId: string, private type: 'telemetry' | 'events') {
        const dataDir = path.resolve(`./data/runs/${runId}`);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (type === 'telemetry') {
            this.schema = new parquet.ParquetSchema({
                tick: { type: 'INT64' },
                entityId: { type: 'UTF8' },
                side: { type: 'UTF8' },
                x: { type: 'DOUBLE' },
                y: { type: 'DOUBLE' },
                z: { type: 'DOUBLE' },
                speedKts: { type: 'DOUBLE' },
                heading: { type: 'DOUBLE' },
                hp: { type: 'DOUBLE' },
                isDestroyed: { type: 'BOOLEAN' },
                fuelPct: { type: 'DOUBLE' },
                missionType: { type: 'UTF8', optional: true },
                missionStatus: { type: 'UTF8', optional: true }
            });
        } else {
            this.schema = new parquet.ParquetSchema({
                tick: { type: 'INT64' },
                type: { type: 'UTF8' },
                entityId: { type: 'UTF8', optional: true },
                data: { type: 'UTF8', optional: true } // JSON stringified
            });
        }
    }

    private rowCount: number = 0;

    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = (async () => {
            const filePath = path.resolve(`./data/runs/${this.runId}/${this.type}.parquet`);
            this.writer = await parquet.ParquetWriter.openFile(this.schema, filePath);
            // Set rowGroupSize to 2000 to encourage more frequent flushes to disk
            this.writer.setRowGroupSize(2000);
        })();

        return this.initPromise;
    }

    async writeRow(row: any) {
        if (this.isClosed || this.isClosing) return;

        // Chain the write to ensure sequential execution even if called concurrently
        this.writeQueue = this.writeQueue.then(async () => {
            try {
                if (this.isClosed || this.isClosing) return;
                if (!this.writer) await this.init();
                
                // Defensive serialization: Ensure all fields expected to be strings are strings
                const sanitizedRow = { ...row };
                for (const [key, value] of Object.entries(sanitizedRow)) {
                    const columnSchema = this.schema.fields[key];
                    if (columnSchema && columnSchema.type === 'BYTE_ARRAY' && typeof value === 'object' && value !== null) {
                        // BYTE_ARRAY is used for UTF8 in parquetjs
                        sanitizedRow[key] = JSON.stringify(value);
                    }
                }

                await this.writer.appendRow(sanitizedRow);
                this.rowCount++;
            } catch (err: any) {
                console.error(`[ParquetService] Error writing ${this.type} row:`, err);
                console.error(`[ParquetService] Mismatched row data:`, JSON.stringify(row, null, 2));
                // Don't rethrow here to avoid breaking the queue chain indefinitely
            }
        });

        return this.writeQueue;
    }

    async close() {
        if (this.isClosed || this.isClosing) return;
        this.isClosing = true;

        // Wait for all pending writes to complete
        await this.writeQueue;

        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }
        this.isClosed = true;
        this.isClosing = false;
    }
}
