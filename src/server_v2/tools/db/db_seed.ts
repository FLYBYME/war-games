import { defineTool } from '../../core/tool_builder.js';
import { dbSeedContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import {
    profiles as profilesTable,
    weapons as weaponsTable,
    scenarios as scenariosTable,
    matches as matchesTable,
    bugs as bugsTable,
    bugComments as bugCommentsTable,
    mapRegions as mapRegionsTable
} from '../../db/schema.js';
import { profiles, weaponProfiles, scenarios } from '../../data/tactical_seed.js';

const SEEDED_REGIONS = [
    {
        id: 'scs',
        name: 'South China Sea',
        description: 'Primary maritime theater for littoral and blue-water operations.',
        minLat: 10, maxLat: 25, minLon: 110, maxLon: 125
    },
    {
        id: 'ee',
        name: 'Eastern Europe',
        description: 'Continental theater for high-latitude terrain and missile defense studies.',
        minLat: 45, maxLat: 55, minLon: 25, maxLon: 40
    },
    {
        id: 'pg',
        name: 'Persian Gulf',
        description: 'Strategic choke-point and maritime interdiction theater.',
        minLat: 23, maxLat: 31, minLon: 47, maxLon: 57
    }
];

export const db_seed = defineTool(dbSeedContract, async (input, _ctx) => {
    if (input.clearExisting) {
        // Delete in order to satisfy FK constraints
        db.delete(bugCommentsTable).run();
        db.delete(bugsTable).run();
        db.delete(matchesTable).run();
        db.delete(profilesTable).run();
        db.delete(weaponsTable).run();
        db.delete(scenariosTable).run();
        db.delete(mapRegionsTable).run();
    }

    const now = new Date();

    // 1. Seed Profiles
    let profilesCount = 0;
    for (const [id, profile] of Object.entries(profiles)) {
        db.insert(profilesTable).values({
            id,
            name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            description: `Seeded ${profile.type} profile`,
            data: profile,
            createdAt: now,
            updatedAt: now
        }).onConflictDoUpdate({
            target: profilesTable.id,
            set: { data: profile, updatedAt: now }
        }).run();
        profilesCount++;
    }

    // 2. Seed Weapons
    let weaponsCount = 0;
    for (const weapon of weaponProfiles) {
        db.insert(weaponsTable).values({
            id: weapon.id,
            name: weapon.name,
            description: `Seeded ${weapon.type} weapon`,
            data: weapon,
            createdAt: now,
            updatedAt: now
        }).onConflictDoUpdate({
            target: weaponsTable.id,
            set: { data: weapon, updatedAt: now }
        }).run();
        weaponsCount++;
    }

    // 3. Seed Scenarios
    let scenariosCount = 0;
    for (const scenario of scenarios) {
        db.insert(scenariosTable).values({
            id: scenario.id ?? scenario.name,
            name: scenario.name,
            description: scenario.description,
            manifest: scenario,
            createdAt: now,
            updatedAt: now
        }).onConflictDoUpdate({
            target: scenariosTable.id,
            set: { manifest: scenario, updatedAt: now }
        }).run();
        scenariosCount++;
    }

    // 4. Seed Regions
    let regionsCount = 0;
    for (const region of SEEDED_REGIONS) {
        db.insert(mapRegionsTable).values({
            ...region,
            createdAt: now,
            updatedAt: now
        }).onConflictDoUpdate({
            target: mapRegionsTable.id,
            set: { ...region, updatedAt: now }
        }).run();
        regionsCount++;
    }

    return {
        profilesCount,
        weaponsCount,
        scenariosCount,
        regionsCount
    };
});
