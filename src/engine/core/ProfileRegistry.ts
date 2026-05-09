import { EntityProfileSchema } from './Types.js';
import type { EntityProfile, SensorProfile, MountProfile } from './Types.js';

export type { MountProfile, SensorProfile };

export class ProfileRegistry {
    private profiles = new Map<string, EntityProfile>();

    public register(id: string, profile: EntityProfile): void {
        const validated = EntityProfileSchema.parse(profile);
        this.profiles.set(id, validated);
    }

    public get(id: string): EntityProfile | undefined {
        return this.profiles.get(id);
    }

    public list(): EntityProfile[] {
        return Array.from(this.profiles.values());
    }

    public getInternalMap(): Map<string, EntityProfile> {
        return this.profiles;
    }
}
