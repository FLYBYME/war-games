import { Loadout } from '../components/Logistics.js';

export class LoadoutRegistry {
    private loadouts = new Map<string, Loadout>();

    public register(loadout: Loadout): void {
        this.loadouts.set(loadout.id, loadout);
    }

    public get(id: string): Loadout | undefined {
        return this.loadouts.get(id);
    }

    /**
     * getForPlatform: Returns all loadouts compatible with a specific platform type/id.
     * (Simplified for now)
     */
    public getForPlatform(_platformId: string): Loadout[] {
        return Array.from(this.loadouts.values());
    }
}
