import * as fs from 'fs';
import * as Z from 'zod';
import { WarGamesTool, defineTool } from './Tool.js';

import { WarGamesClient } from '../WarGamesClient.js';

export function DebugTools(client?: WarGamesClient): WarGamesTool[] {
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
        outputSchema: Z.object({ success: Z.boolean(), reportId: Z.string(), details: Z.unknown() }),
        async call(matchId, side, args) {
            if (client) {
                try {
                    const bug = await client.bugs.report({
                        matchId: matchId || 'debug',
                        side: side || 'Neutral',
                        ...args
                    });
                    console.log(`[report_bug] Reported via API: ${bug.id}`);
                    return { success: true, reportId: bug.id, details: args };
                } catch (e: unknown) {
                    const error = e as Error;
                    console.error(`[report_bug] API Error: ${error.message}. Falling back to local file.`);
                }
            }

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
        async call(_matchId, _side, args) {
            try {
                const files = await fs.promises.readdir(args.dirPath);
                return files;
            } catch (err: unknown) {
                const error = err as Error;
                throw new Error(`Failed to list directory ${args.dirPath}: ${error.message}`);
            }
        }
    });

    const read_file = defineTool({
        name: "read_file",
        description: "Read the contents of a file",
        inputSchema: Z.object({ filePath: Z.string().describe('The relative or absolute path to the file') }),
        outputSchema: Z.string(),
        async call(_matchId, _side, args) {
            try {
                const content = await fs.promises.readFile(args.filePath, 'utf-8');
                return content;
            } catch (err: unknown) {
                const error = err as Error;
                throw new Error(`Failed to read file ${args.filePath}: ${error.message}`);
            }
        }
    });

    return [
        report_bug,
        list_files,
        read_file
    ];
}
