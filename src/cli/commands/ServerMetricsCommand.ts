import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

interface ServerMetrics {
    uptime: number;
    sessions: number;
    simulation: {
        totalMatches: number;
        totalEntities: number;
        profilesCount: number;
        weaponProfilesCount: number;
    };
    memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    totalTracerLogs?: number;
    totalOctreeNodes?: number;
}

export class ServerMetricsCommand extends BaseCommand {
    public readonly name = 'metrics';
    public readonly description = 'Display server system metrics (uptime, memory, etc.)';
    public readonly category = 'Infrastructure';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-w, --watch', 'Watch metrics')
            .action((options: { watch: boolean }, command: CommanderCommand) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(globalOpts.url as string, options.watch);
            });
    }

    protected async execute(url: string, watch?: boolean): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            const metrics = await client.apiFetch<ServerMetrics>('/api/system/metrics');

            this.printMetrics(metrics);

            if (watch) {
                console.log(`${C.dim}Watching metrics... (Press Ctrl+C to stop)${C.reset}`);
                setInterval(async () => {
                    const newMetrics = await client.apiFetch<ServerMetrics>('/api/system/metrics');
                    this.printMetrics(newMetrics);
                }, 1000);
            }
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${error.message}`);
        } finally {
            client.disconnect();
        }
    }

    private async printMetrics(metrics: ServerMetrics): Promise<void> {
        console.log(`\n${C.blue}${C.bold}--- Server System Metrics ---${C.reset}`);
        console.log(`Uptime:     ${C.yellow}${this.formatUptime(metrics.uptime)}${C.reset}`);
        console.log(`Sessions:   ${C.green}${metrics.sessions}${C.reset}`);

        console.log(`\n${C.bold}Simulation:${C.reset}`);
        console.log(` Matches:   ${metrics.simulation.totalMatches}`);
        console.log(` Entities:  ${metrics.simulation.totalEntities}`);
        console.log(` Profiles:  ${metrics.simulation.profilesCount} platforms, ${metrics.simulation.weaponProfilesCount} weapons`);

        console.log(`\n${C.bold}Memory Usage:${C.reset}`);
        console.log(` RSS:        ${this.formatMem(metrics.memory.rss)}`);
        console.log(` Heap Used:  ${this.formatMem(metrics.memory.heapUsed)}`);
        console.log(` Heap Total: ${this.formatMem(metrics.memory.heapTotal)}`);
        console.log(` External:   ${this.formatMem(metrics.memory.external)}`);

        if (metrics.totalTracerLogs !== undefined) {
            console.log(`\n${C.bold}Diagnostics:${C.reset}`);
            console.log(` Tracer Logs: ${C.cyan}${metrics.totalTracerLogs.toLocaleString()}${C.reset}`);
            if (metrics.totalOctreeNodes !== undefined) {
                console.log(` Octree Nodes: ${C.cyan}${metrics.totalOctreeNodes.toLocaleString()}${C.reset}`);
            }
        }
        console.log();
    }

    private formatUptime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    }

    private formatMem(mb: number): string {
        const color = mb > 500 ? C.red : (mb > 200 ? C.yellow : C.green);
        return `${color}${mb} MB${C.reset}`;
    }
}
