import { describe, it, expect, vi, beforeAll } from 'vitest';
import { db_seed } from '../../../../server_v2/tools/db/db_seed.js';
import { createMockMatchService, createMockContext } from '../../utils/mock_factory.js';
import { db, initDb } from '../../../../server_v2/db/db.js';
import { profiles, weapons, scenarios } from '../../../../server_v2/db/schema.js';

describe('Database Seeding Tool Unit Tests', () => {
    
    beforeAll(async () => {
        await initDb();
    });

    it('should seed the database with baseline data', async () => {
        const ctx = createMockContext(createMockMatchService());

        // Run seed with clearExisting: true
        const result = await db_seed.call({ clearExisting: true }, ctx);

        expect(result.profilesCount).toBeGreaterThan(0);
        expect(result.weaponsCount).toBeGreaterThan(0);
        expect(result.scenariosCount).toBeGreaterThan(0);

        // Verify data in DB
        const pCount = db.select().from(profiles).all().length;
        const wCount = db.select().from(weapons).all().length;
        const sCount = db.select().from(scenarios).all().length;

        expect(pCount).toBe(result.profilesCount);
        expect(wCount).toBe(result.weaponsCount);
        expect(sCount).toBe(result.scenariosCount);
    });
});
