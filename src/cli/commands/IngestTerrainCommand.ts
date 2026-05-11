import { Command } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WorkerService } from '../../server_v2/services/WorkerService.js';
import { TerrainService } from '../../server_v2/services/TerrainService.js';
import { C } from '../core/Utils.js';

export class IngestTerrainCommand extends BaseCommand {
    public readonly name = 'terrain:ingest';
    public readonly description = 'Pre-process AWS terrain data into LOD-aware .wgt files';
    public readonly category = 'Terrain';

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .requiredOption('--lat-min <number>', 'Minimum latitude', parseFloat)
            .requiredOption('--lat-max <number>', 'Maximum latitude', parseFloat)
            .requiredOption('--lon-min <number>', 'Minimum longitude', parseFloat)
            .requiredOption('--lon-max <number>', 'Maximum longitude', parseFloat)
            .option('--res <numbers>', 'Resolutions to generate (comma separated)', (val) => val.split(',').map(Number), [1201, 256])
            .option('--out <path>', 'Output directory', './data/terrain_storage')
            .action(async (options) => {
                process.env.TERRAIN_DISK_CACHE = options.out;
                await this.runIngestion(options);
            });
    }

    private async runIngestion(options: any): Promise<void> {
        console.log(`\n${C.blue}${C.bold}TERRAIN INGESTION${C.reset}`);
        console.log(`${C.dim}Bounds: [${options.latMin}, ${options.latMax}] / [${options.lonMin}, ${options.lonMax}]${C.reset}`);
        console.log(`${C.dim}Resolutions: ${options.res.join(', ')}${C.reset}`);
        console.log(`${C.dim}Output: ${options.out}${C.reset}\n`);

        const workerService = new WorkerService();
        const terrainService = new TerrainService(workerService);

        const lats = [];
        for (let lat = Math.floor(options.latMin); lat <= Math.floor(options.latMax); lat++) lats.push(lat);
        
        const lons = [];
        for (let lon = Math.floor(options.lonMin); lon <= Math.floor(options.lonMax); lon++) lons.push(lon);

        const totalTiles = lats.length * lons.length * options.res.length;
        let completed = 0;

        for (const res of options.res) {
            for (const lat of lats) {
                for (const lon of lons) {
                    try {
                        process.stdout.write(`  Processing ${lat}, ${lon} @ res ${res}... `);
                        await terrainService.getTile(lat, lon, res);
                        completed++;
                        process.stdout.write(`${C.green}✔${C.reset} (${completed}/${totalTiles})\n`);
                    } catch (err: any) {
                        process.stdout.write(`${C.red}✖${C.reset} (${err.message})\n`);
                    }
                }
            }
        }

        console.log(`\n${C.green}${C.bold}Ingestion complete!${C.reset} Total tiles: ${completed}\n`);
        process.exit(0);
    }

    protected async execute(): Promise<void> {
        // Handled by action
    }
}
