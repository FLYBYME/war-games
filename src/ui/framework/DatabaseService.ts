import { logger } from './Logger.js';
import { EntityProfile } from '../shared/types.js';

export class DatabaseService {
    private static profiles = new Map<string, EntityProfile>();
    private static hashMap = new Map<string, string>(); // hash -> id

    public static async init() {
        try {
            const response = await fetch('/api/database/profiles');
            const data = await response.json();
            
            for (const [id, profile] of data.units) {
                this.profiles.set(id, profile);
                const hash = this.hashId(id);
                this.hashMap.set(`HASH-${hash.toString(16)}`, id);
                logger.info(`Loaded Profile: ${id}`);
            }
            logger.info(`Database initialized with ${this.profiles.size} profiles.`);
        } catch (err) {
            logger.error('Failed to initialize database', { error: err });
        }
    }

    public static getProfile(idOrHash: string): EntityProfile | undefined {
        const id = this.hashMap.get(idOrHash) || idOrHash;
        return this.profiles.get(id);
    }

    private static hashId(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }
}
