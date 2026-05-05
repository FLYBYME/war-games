import * as demoData from '../../data/index.js';
import { ScenarioManifest } from '../schemas/index.js';
import { ServiceConfig, IStorageProvider, ILogger } from './types.js';

export interface ScenarioSummary {
    filename: string;
    name: string;
    description: string;
    entityCount: number;
}

/**
 * ScenarioService: Manages scenario files and provides
 * CRUD operations for the server API layer or local SDK.
 */
export class ScenarioService {
    private readonly inMemoryScenarios = new Map<string, ScenarioManifest>();
    private readonly logger: ILogger;

    constructor(config: ServiceConfig) {
        this.logger = config.logger;
    }

    public async init() {
        // No filesystem initialization needed
    }

    /** List all scenario files with summary info */
    async list(): Promise<ScenarioSummary[]> {
        const summaries: ScenarioSummary[] = [];

        // 1. Add Built-in Scenarios (Type-Safe)
        for (const manifest of demoData.scenarios) {
            summaries.push({
                filename: `built-in:${manifest.name}.json`,
                name: `[Built-in] ${manifest.name}`,
                description: manifest.description || '',
                entityCount: manifest.entities?.length || 0
            });
        }

        // 2. Add In-Memory Scenarios
        for (const [filename, manifest] of this.inMemoryScenarios) {
            summaries.push({
                filename,
                name: manifest.name || filename.replace('.json', ''),
                description: manifest.description || '',
                entityCount: manifest.entities?.length || 0
            });
        }

        return summaries;
    }

    /** Load a single scenario by filename */
    async load(filename: string): Promise<ScenarioManifest | null> {
        if (filename.startsWith('built-in:')) {
            const name = filename.replace('built-in:', '').replace('.json', '');
            const scenario = demoData.scenarios.find(s => s.name === name);
            return scenario || null;
        }

        return this.inMemoryScenarios.get(filename) || null;
    }

    /** Save a scenario to memory */
    async save(filename: string, manifest: ScenarioManifest): Promise<boolean> {
        try {
            // Sanitize filename
            const safe = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
            const name = safe.endsWith('.json') ? safe : `${safe}.json`;
            this.inMemoryScenarios.set(name, manifest);
            this.logger.info(`Scenario saved to memory: ${name}`);
            return true;
        } catch (err) {
            this.logger.error(`Failed to save scenario: ${filename}`, { error: err });
            return false;
        }
    }

    /** Delete a scenario from memory */
    async delete(filename: string): Promise<boolean> {
        const deleted = this.inMemoryScenarios.delete(filename);
        if (deleted) {
            this.logger.info(`Scenario deleted from memory: ${filename}`);
        }
        return deleted;
    }
}
