declare module 'parquetjs' {
    export class ParquetSchema {
        constructor(schema: any);
    }
    export class ParquetWriter {
        static openFile(schema: ParquetSchema, path: string): Promise<ParquetWriter>;
        appendRow(row: any): Promise<void>;
        close(): Promise<void>;
    }
    const parquet: {
        ParquetSchema: typeof ParquetSchema;
        ParquetWriter: typeof ParquetWriter;
    };
    export default parquet;
}
