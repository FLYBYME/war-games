import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import * as fs from 'fs';
import * as path from 'path';
import { C } from '../core/Utils.js';

/**
 * ViewBugsCommand: Visualises anomalies reported by AI agents during simulation.
 */
export class ViewBugsCommand extends BaseCommand {
    public readonly name = 'view-bugs';
    public readonly description = 'Displays simulation anomalies and bugs reported by AI agents.';
    public readonly category = 'Intelligence';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-f, --file <path>', 'Path to bug reports file', 'bug_reports.jsonl')
            .option('--limit <count>', 'Number of latest reports to show', '10')
            .action((opts) => this.execute(opts));
    }

    protected async execute(opts: any): Promise<void> {
        const filePath = path.resolve(process.cwd(), opts.file);
        const limit = parseInt(opts.limit);

        if (!fs.existsSync(filePath)) {
            console.error(`\n${C.yellow}${C.bold}⚠ No Bug Reports Found:${C.reset} ${filePath} does not exist.`);
            return;
        }

        console.log(`\n${C.red}${C.bold}🐞 SIMULATION ANOMALY REPORT${C.reset}`);
        console.log(`${C.dim}Reading from: ${opts.file}${C.reset}\n`);

        const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');
        const reports = lines.map(l => JSON.parse(l)).reverse().slice(0, limit);

        if (reports.length === 0) {
            console.log(`${C.dim}No anomalies logged.${C.reset}`);
            return;
        }

        for (const r of reports) {
            const date = new Date(r.timestamp).toLocaleString();
            const severityColor = this.getSeverityColor(r.severity);

            console.log(`${C.white}${C.bold}ID: ${r.id}${C.reset} | ${C.cyan}${date}${C.reset} | ${severityColor}${C.bold}${r.severity}${C.reset}`);
            console.log(`${C.yellow}${C.bold}Title: ${r.title}${C.reset}`);
            console.log(`${C.white}${r.description}${C.reset}`);
            
            if (r.reproductionSteps) {
                console.log(`${C.dim}Reproduction: ${r.reproductionSteps}${C.reset}`);
            }

            console.log(`${C.dim}Match: ${r.matchId} | Side: ${r.side}${C.reset}`);
            console.log(C.dim + "─".repeat(60) + C.reset + "\n");
        }
    }

    private getSeverityColor(severity: string): string {
        switch (severity) {
            case 'Critical': return C.red;
            case 'High': return C.yellow;
            case 'Medium': return C.cyan;
            default: return C.green;
        }
    }
}
