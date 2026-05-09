import parquet from 'parquetjs';
import path from 'path';
import fs from 'fs';

export class ParquetService {
    private writer: any;
    private schema: any;

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

    async init() {
        const filePath = path.resolve(`./data/runs/${this.runId}/${this.type}.parquet`);
        this.writer = await parquet.ParquetWriter.openFile(this.schema, filePath);
    }

    async writeRow(row: any) {
        if (!this.writer) await this.init();
        await this.writer.appendRow(row);
    }

    async close() {
        if (this.writer) {
            await this.writer.close();
            this.writer = null;
        }
    }
}
