import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side } from '../../sdk/index.js';
import { C } from '../core/Utils.js';

interface InspectOptions {
    side: string;
    samples: string;
}

/**
 * InspectMatchCommand: Detailed diagnostic view of a live match.
 */
export class InspectMatchCommand extends BaseCommand {
    public name = 'inspect-match';
    public description = 'Displays detailed telemetry and state for an active match.';

    register(program: CommanderCommand): void {
        program.command(this.name)
            .description(this.description)
            .argument('<matchId>', 'The match ID to inspect')
            .option('-s, --side <side>', 'Side picture to view (Blue, Red, Neutral)', 'Neutral')
            .option('-t, --samples <n>', 'Number of telemetry history points to fetch', '50')
            .action((matchId: string, options: InspectOptions) => {
                void this.execute({ matchId, ...options }, program.opts() as { url: string });
            });
    }

    protected async execute(options: InspectOptions & { matchId: string }, globalOpts: { url: string }): Promise<void> {
        const { matchId } = options;
        const client = new WarGamesClient({ url: globalOpts.url });

        console.log(`\n${C.magenta}${C.bold}🔍 MATCH INSPECTOR${C.reset}`);

        try {
            await client.connect();
            console.log(`${C.green}Connected.${C.reset} Joining match ${C.cyan}${matchId}${C.reset} as ${C.yellow}${options.side}${C.reset}...`);

            client.joinMatch(options.side as Side, matchId);

            let telemetry: Record<string, unknown[]> | null = null;
            const samples = parseInt(options.samples);
            if (samples > 0) {
                console.log(`${C.dim}Fetching telemetry history...${C.reset}`);
                try {
                    telemetry = await client.scenario.getTelemetry(matchId);
                } catch (err) {
                    console.error(`${C.red}Failed to fetch telemetry history.${C.reset}`);
                }
            }

            const state = await client.getLatestViewState();
            if (!state) {
                console.error(`${C.red}Failed to retrieve match state.${C.reset}`);
                return;
            }

            console.log(`\n${C.bold}--- Simulation Meta ---${C.reset}`);
            console.log(`Tick:       ${C.cyan}${state.tick}${C.reset}`);
            console.log(`Status:     ${state.isPaused ? C.yellow + 'Paused' : C.green + 'Running'}${C.reset}`);
            console.log(`Origin:     ${state.origin.lat.toFixed(4)}, ${state.origin.lon.toFixed(4)}`);
            
            console.log(`\n${C.bold}--- Force Disposition (${state.units.length} units) ---${C.reset}`);
            state.units.forEach(u => {
                const pos = `(${u.pos.x.toFixed(0)}, ${u.pos.y.toFixed(0)})`;
                console.log(`${C.dim}[${u.side}]${C.reset} ${C.white}${u.id.padEnd(20)}${C.reset} ${u.profileId?.padEnd(12)} HP:${u.hp.toString().padStart(3)}% Fuel:${Math.round(u.fuelPct * 100).toString().padStart(3)}% Pos:${pos}`);
            });

            console.log(`\n${C.bold}--- Tactical Tracks (${state.tracks.length} tracks) ---${C.reset}`);
            state.tracks.forEach(t => {
                console.log(`${C.dim}[${t.identification}]${C.reset} ${C.yellow}${t.id.padEnd(12)}${C.reset} ${t.classification.padEnd(15)} LastSeen:${t.lastSeen.toString().padStart(5)} CEP:${t.cep.toFixed(0)}m`);
            });

            if (telemetry) {
                console.log(`\n${C.bold}--- Telemetry Availability ---${C.reset}`);
                Object.keys(telemetry).forEach(key => {
                    console.log(`- ${key.padEnd(15)}: ${telemetry![key].length} samples`);
                });
            }

        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}Error during inspection:${C.reset} ${error.message}`);
        } finally {
            client.disconnect();
            process.exit(0);
        }
    }
}
