import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

export class ServerMetricsCommand extends BaseCommand {
    public readonly name = 'metrics';
    public readonly description = 'Display server system metrics (uptime, memory, etc.)';
    public readonly category = 'Infrastructure';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .action((options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(globalOpts.url);
            });
    }

    protected async execute(url: string): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            const httpUrl = url.replace(/^ws/, 'http');
            const res = await fetch(`${httpUrl}/api/system/metrics`);
            
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}: ${res.statusText}`);
            }

            const metrics = await res.json() as any;

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
            console.log();

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
        } finally {
            client.disconnect();
        }
    }

    private formatUptime(seconds: number): string {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}h ${m}m ${s}s`;
    }

    private formatMem(mb: number): string {
        const color = mb > 500 ? C.red : (mb > 200 ? C.yellow : C.green);
        return `${color}${mb} MB${C.reset}`;
    }
}
