import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { C } from '../core/Utils.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { BugReport } from '../../sdk/schemas/bugs.js';

interface BugsListOptions {
    host: string;
}

interface BugsShowOptions {
    host: string;
}

interface BugsUpdateOptions {
    host: string;
    status?: string;
    link?: string;
}

interface BugsCommentOptions {
    host: string;
    author: string;
    message: string;
}

export class BugsCommand extends BaseCommand {
    public readonly name = 'bugs';
    public readonly description = 'Manage simulation bug reports';
    public readonly category = 'Intelligence';

    public register(program: CommanderCommand): void {
        const bugsCmd = program
            .command(this.name)
            .description(this.description);

        bugsCmd
            .command('list')
            .description('List all bug reports')
            .option('--host <url>', 'Server API host', 'http://localhost:3000')
            .action((opts: BugsListOptions) => this.executeList(opts));

        bugsCmd
            .command('show <id>')
            .description('Show details for a specific bug')
            .option('--host <url>', 'Server API host', 'http://localhost:3000')
            .action((id: string, opts: BugsShowOptions) => this.executeShow(id, opts));

        bugsCmd
            .command('update <id>')
            .description('Update a bug report (status or link)')
            .option('--host <url>', 'Server API host', 'http://localhost:3000')
            .option('--status <status>', 'Set status (Open, InProgress, Resolved, Closed)')
            .option('--link <relatedId>', 'Link a related bug')
            .action((id: string, opts: BugsUpdateOptions) => this.executeUpdate(id, opts));

        bugsCmd
            .command('comment <id>')
            .description('Add a comment to a bug report')
            .option('--host <url>', 'Server API host', 'http://localhost:3000')
            .requiredOption('-a, --author <author>', 'Comment author')
            .requiredOption('-m, --message <message>', 'Comment text')
            .action((id: string, opts: BugsCommentOptions) => this.executeComment(id, opts));
    }

    protected async execute(_opts: unknown, _globalOpts: unknown): Promise<void> {
        // Handled by subcommands
    }

    private async executeList(opts: BugsListOptions) {
        const client = new WarGamesClient({ url: opts.host.replace('http', 'ws') });
        try {
            const bugs = await client.bugs.list();
            console.log(`\n${C.red}${C.bold}🐞 SIMULATION ANOMALY REPORT${C.reset}\n`);

            if (bugs.length === 0) {
                console.log(`${C.dim}No anomalies logged.${C.reset}`);
                return;
            }

            for (const r of bugs) {
                this.printBugSummary(r);
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`${C.red}Failed to list bugs: ${error.message}${C.reset}`);
        }
    }

    private async executeShow(id: string, opts: BugsShowOptions) {
        const client = new WarGamesClient({ url: opts.host.replace('http', 'ws') });
        try {
            const bug = await client.bugs.get(id);
            console.log(`\n${C.red}${C.bold}🐞 BUG DETAILS: ${bug.id}${C.reset}\n`);
            this.printBugSummary(bug);

            console.log(`${C.yellow}${C.bold}Status:${C.reset} ${bug.status}`);
            if (bug.relatedBugs && bug.relatedBugs.length > 0) {
                console.log(`${C.yellow}${C.bold}Related Bugs:${C.reset} ${bug.relatedBugs.join(', ')}`);
            }

            if (bug.comments && bug.comments.length > 0) {
                console.log(`\n${C.cyan}${C.bold}Comments:${C.reset}`);
                for (const c of bug.comments) {
                    const date = new Date(c.timestamp).toLocaleString();
                    console.log(`${C.dim}[${date}]${C.reset} ${C.white}${C.bold}${c.author}:${C.reset} ${c.text}`);
                }
            } else {
                console.log(`\n${C.dim}No comments.${C.reset}`);
            }
            console.log();
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`${C.red}Failed to get bug: ${error.message}${C.reset}`);
        }
    }

    private async executeUpdate(id: string, opts: BugsUpdateOptions) {
        const client = new WarGamesClient({ url: opts.host.replace('http', 'ws') });
        try {
            const updates: Record<string, string> = {};
            if (opts.status) updates.status = opts.status;
            if (opts.link) updates.addRelatedBug = opts.link;

            if (Object.keys(updates).length === 0) {
                console.log(`${C.yellow}No updates provided. Use --status or --link.${C.reset}`);
                return;
            }

            const bug = await client.bugs.update(id, updates);
            console.log(`${C.green}Successfully updated bug ${id}${C.reset}`);
            console.log(`Status: ${bug.status}, Related: ${bug.relatedBugs.join(', ')}`);
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`${C.red}Failed to update bug: ${error.message}${C.reset}`);
        }
    }

    private async executeComment(id: string, opts: BugsCommentOptions) {
        const client = new WarGamesClient({ url: opts.host.replace('http', 'ws') });
        try {
            await client.bugs.comment(id, {
                author: opts.author,
                text: opts.message
            });
            console.log(`${C.green}Successfully added comment to bug ${id}${C.reset}`);
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`${C.red}Failed to add comment: ${error.message}${C.reset}`);
        }
    }

    private printBugSummary(r: BugReport) {
        const date = new Date(r.timestamp).toLocaleString();
        const severityColor = this.getSeverityColor(r.severity);

        console.log(`${C.white}${C.bold}ID: ${r.id}${C.reset} | ${C.cyan}${date}${C.reset} | ${severityColor}${C.bold}${r.severity}${C.reset} | Status: ${r.status}`);
        console.log(`${C.yellow}${C.bold}Title: ${r.title}${C.reset}`);
        console.log(`${C.white}${r.description}${C.reset}`);
        if (r.worldState) console.log(`${C.dim}World State: ${r.worldState}${C.reset}`);
        if (r.suggestedFix) console.log(`${C.dim}Suggested Fix: ${r.suggestedFix}${C.reset}`);

        console.log(`${C.dim}Match: ${r.matchId} | Side: ${r.side}${C.reset}`);
        console.log(C.dim + "─".repeat(60) + C.reset + "\n");
    }

    private getSeverityColor(severity: string): string {
        switch (severity) {
            case 'Low': return C.green;
            case 'Medium': return C.yellow;
            case 'High': return C.red;
            case 'Critical': return C.magenta;
            default: return C.white;
        }
    }
}
