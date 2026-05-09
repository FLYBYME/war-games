import { Command } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { db, initDb } from '../../server_v2/db/db.js';
import { profiles as profileTable, weapons as weaponTable, scenarios as scenarioTable } from '../../server_v2/db/schema.js';
import { profiles as sourceProfiles } from '../../../dump/data/profiles.js';
import { weaponProfiles as sourceWeapons } from '../../../dump/data/weapons.js';
import { scenarios as sourceScenarios } from '../../../dump/data/scenarios.js';
import { C } from '../core/Utils.js';

export class SeedCommand extends BaseCommand {
    public readonly name = 'db';
    public readonly description = 'Database management commands';
    public readonly category = 'Infrastructure';

    public register(program: Command): void {
        const dbGroup = program.command(this.name).description(this.description);

        dbGroup
            .command('seed')
            .description('Seed the database with profiles, weapons, and scenarios')
            .action(async () => {
                await this.executeSeed();
            });
            
        dbGroup
            .command('init')
            .description('Initialize the database schema')
            .action(async () => {
                await initDb();
                console.log(`${C.green}✔ Database initialized.${C.reset}`);
            });
    }

    protected async execute(): Promise<void> {
        // Handled by subcommands
    }

    private async executeSeed(): Promise<void> {
        console.log(`\n${C.cyan}${C.bold}⛊ Seeding Database${C.reset} from ${C.yellow}dump/data${C.reset}...\n`);
        
        try {
            await initDb();

            // Seed Profiles
            console.log(`${C.blue}▶ Seeding ${C.bold}${Object.keys(sourceProfiles).length}${C.reset} unit profiles...`);
            let profileCount = 0;
            for (const [id, profile] of Object.entries(sourceProfiles)) {
                db.insert(profileTable).values({
                    id,
                    name: id.toUpperCase().replace(/-/g, ' '),
                    description: `Base profile for ${id}`,
                    data: profile,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).onConflictDoUpdate({
                    target: profileTable.id,
                    set: {
                        data: profile,
                        updatedAt: new Date()
                    }
                }).run();
                profileCount++;
            }
            console.log(`  ${C.green}✔${C.reset} ${profileCount} profiles processed.`);

            // Seed Weapons
            console.log(`\n${C.blue}▶ Seeding ${C.bold}${sourceWeapons.length}${C.reset} weapon profiles...`);
            let weaponCount = 0;
            for (const weapon of sourceWeapons) {
                db.insert(weaponTable).values({
                    id: weapon.id,
                    name: weapon.name,
                    description: `Weapon profile for ${weapon.name}`,
                    data: weapon,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).onConflictDoUpdate({
                    target: weaponTable.id,
                    set: {
                        name: weapon.name,
                        data: weapon,
                        updatedAt: new Date()
                    }
                }).run();
                weaponCount++;
            }
            console.log(`  ${C.green}✔${C.reset} ${weaponCount} weapons processed.`);

            // Seed Scenarios
            console.log(`\n${C.blue}▶ Seeding ${C.bold}${sourceScenarios.length}${C.reset} scenarios...`);
            let scenarioCount = 0;
            for (const scenario of sourceScenarios) {
                if (!scenario.id) {
                    console.warn(`  ${C.yellow}⚠ Skipping scenario without ID: ${scenario.name}${C.reset}`);
                    continue;
                }
                db.insert(scenarioTable).values({
                    id: scenario.id,
                    name: scenario.name,
                    description: scenario.description,
                    manifest: scenario,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).onConflictDoUpdate({
                    target: scenarioTable.id,
                    set: {
                        name: scenario.name,
                        description: scenario.description,
                        manifest: scenario,
                        updatedAt: new Date()
                    }
                }).run();
                scenarioCount++;
            }
            console.log(`  ${C.green}✔${C.reset} ${scenarioCount} scenarios processed.`);

            console.log(`\n${C.green}${C.bold}✔ Database seeding complete!${C.reset}\n`);
        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}✖ Seeding failed:${C.reset} ${error.message}`);
        }
    }
}
