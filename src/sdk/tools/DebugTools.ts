import * as fs from 'fs';
import * as path from 'path';
import * as Z from 'zod';
import { WarGamesTool, defineTool } from './Tool.js';

export function DebugTools(): WarGamesTool<any, any>[] {
    const report_bug = defineTool({
        name: "report_bug",
        description: "Reports a bug or anomaly to the engineering team.",
        inputSchema: Z.object({
            title: Z.string().describe('A short summary of the bug'),
            description: Z.string().describe('Detailed description of the bug'),
            worldState: Z.string().describe('The current world state').optional(),
            severity: Z.enum(['Low', 'Medium', 'High', 'Critical']).describe('The severity of the bug'),
            suggestedFix: Z.string().describe('A suggested fix for the bug').optional(),
        }),
        outputSchema: Z.object({ success: Z.boolean(), reportId: Z.string(), details: Z.any() }),
        async call(matchId, side, args) {
            const reportId = `BUG-${Date.now()}`;

            const json = {
                id: reportId,
                matchId: matchId || 'debug',
                side: side || 'Neutral',
                ...args
            };

            console.log(json);

            fs.appendFileSync('bug_reports.jsonl', JSON.stringify(json) + '\n');
            return { success: true, reportId, details: args };
        }
    });

    const list_files = defineTool({
        name: "list_files",
        description: "List files and directories within a given directory path",
        inputSchema: Z.object({ dirPath: Z.string().describe('The relative or absolute path to the directory') }),
        outputSchema: Z.array(Z.string()),
        async call(matchId, side, args) {
            try {
                const files = await fs.promises.readdir(args.dirPath);
                return files;
            } catch (err: any) {
                throw new Error(`Failed to list directory ${args.dirPath}: ${err.message}`);
            }
        }
    });

    const read_file = defineTool({
        name: "read_file",
        description: "Read the contents of a file",
        inputSchema: Z.object({ filePath: Z.string().describe('The relative or absolute path to the file') }),
        outputSchema: Z.string(),
        async call(matchId, side, args) {
            try {
                const content = await fs.promises.readFile(args.filePath, 'utf-8');
                return content;
            } catch (err: any) {
                throw new Error(`Failed to read file ${args.filePath}: ${err.message}`);
            }
        }
    });

    return [
        report_bug,
        list_files,
        read_file
    ];
}
