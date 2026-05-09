import { Command } from 'commander';
import { ZodToCliMapper } from '../core/ZodToCliMapper.js';
import * as Contracts from '../../sdk_v2/contracts/index.js';
import { WarGamesClientV2 } from '../../sdk_v2/generated/WarGamesClientV2.js';
import { C } from '../core/Utils.js';

export function registerGeneratedCommands(program: Command, client: WarGamesClientV2) {
    let automation = program.commands.find(c => c.name() === 'automation');
    if (!automation) automation = program.command('automation').description('AUTOMATION domain tools');
    const automation_list_events = automation.command('list_events').description(`List all scripted events defined in the scenario.`).action(async (o) => {
        try { const res = await client.api.automation.list_events(ZodToCliMapper.parseOptions(o, Contracts.AutomationListEventsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(automation_list_events, Contracts.AutomationListEventsInputSchema);
    const automation_trigger_event = automation.command('trigger_event').description(`Force-trigger a scenario event, bypassing conditions.`).action(async (o) => {
        try { const res = await client.api.automation.trigger_event(ZodToCliMapper.parseOptions(o, Contracts.AutomationTriggerEventInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(automation_trigger_event, Contracts.AutomationTriggerEventInputSchema);
    const automation_get_results = automation.command('get_results').description(`Retrieve pass/fail results for scenario assertions.`).action(async (o) => {
        try { const res = await client.api.automation.get_results(ZodToCliMapper.parseOptions(o, Contracts.AutomationGetResultsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(automation_get_results, Contracts.AutomationGetResultsInputSchema);
    let bug = program.commands.find(c => c.name() === 'bug');
    if (!bug) bug = program.command('bug').description('BUG domain tools');
    const bug_list = bug.command('list').description(`Retrieve a list of all reported issues.`).action(async (o) => {
        try { const res = await client.api.bug.list(ZodToCliMapper.parseOptions(o, Contracts.BugListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(bug_list, Contracts.BugListInputSchema);
    const bug_create = bug.command('create').description(`Report a new issue found in the simulation.`).action(async (o) => {
        try { const res = await client.api.bug.create(ZodToCliMapper.parseOptions(o, Contracts.BugCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(bug_create, Contracts.BugCreateInputSchema);
    const bug_get = bug.command('get').description(`Retrieve detailed information for a specific issue.`).action(async (o) => {
        try { const res = await client.api.bug.get(ZodToCliMapper.parseOptions(o, Contracts.BugGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(bug_get, Contracts.BugGetInputSchema);
    const bug_update = bug.command('update').description(`Modify an existing bug report (e.g., change status or severity).`).action(async (o) => {
        try { const res = await client.api.bug.update(ZodToCliMapper.parseOptions(o, Contracts.BugUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(bug_update, Contracts.BugUpdateInputSchema);
    const bug_add_comment = bug.command('add_comment').description(`Add a new comment or update to an issue discussion.`).action(async (o) => {
        try { const res = await client.api.bug.add_comment(ZodToCliMapper.parseOptions(o, Contracts.BugAddCommentInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(bug_add_comment, Contracts.BugAddCommentInputSchema);
    let combat = program.commands.find(c => c.name() === 'combat');
    if (!combat) combat = program.command('combat').description('COMBAT domain tools');
    const combat_get = combat.command('get').description(`View current engagement targets, weapon status, and ammo counts.`).action(async (o) => {
        try { const res = await client.api.combat.get(ZodToCliMapper.parseOptions(o, Contracts.CombatGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_get, Contracts.CombatGetInputSchema);
    const combat_fire = combat.command('fire').description(`Fire a weapon at a specific target.`).action(async (o) => {
        try { const res = await client.api.combat.fire(ZodToCliMapper.parseOptions(o, Contracts.CombatFireInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_fire, Contracts.CombatFireInputSchema);
    const combat_fire_salvo = combat.command('fire_salvo').description(`Execute a multi-weapon salvo.`).action(async (o) => {
        try { const res = await client.api.combat.fire_salvo(ZodToCliMapper.parseOptions(o, Contracts.CombatFireSalvoInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_fire_salvo, Contracts.CombatFireSalvoInputSchema);
    const combat_list_mounts = combat.command('list_mounts').description(`Inspect turret/launcher configurations.`).action(async (o) => {
        try { const res = await client.api.combat.list_mounts(ZodToCliMapper.parseOptions(o, Contracts.CombatListMountsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_list_mounts, Contracts.CombatListMountsInputSchema);
    const combat_get_wra = combat.command('get_wra').description(`Retrieve Weapon Release Authority settings.`).action(async (o) => {
        try { const res = await client.api.combat.get_wra(ZodToCliMapper.parseOptions(o, Contracts.CombatGetWRAInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_get_wra, Contracts.CombatGetWRAInputSchema);
    const combat_update_wra = combat.command('update_wra').description(`Update automated engagement constraints.`).action(async (o) => {
        try { const res = await client.api.combat.update_wra(ZodToCliMapper.parseOptions(o, Contracts.CombatUpdateWRAInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_update_wra, Contracts.CombatUpdateWRAInputSchema);
    const combat_update_roe = combat.command('update_roe').description(`Override unit-specific Rules of Engagement.`).action(async (o) => {
        try { const res = await client.api.combat.update_roe(ZodToCliMapper.parseOptions(o, Contracts.CombatUpdateROEInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(combat_update_roe, Contracts.CombatUpdateROEInputSchema);
    let datalink = program.commands.find(c => c.name() === 'datalink');
    if (!datalink) datalink = program.command('datalink').description('DATALINK domain tools');
    const datalink_get = datalink.command('get').description(`View latency, queue depth, and current network membership.`).action(async (o) => {
        try { const res = await client.api.datalink.get(ZodToCliMapper.parseOptions(o, Contracts.DatalinkGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(datalink_get, Contracts.DatalinkGetInputSchema);
    const datalink_update_network = datalink.command('update_network').description(`Move an entity to a different tactical network.`).action(async (o) => {
        try { const res = await client.api.datalink.update_network(ZodToCliMapper.parseOptions(o, Contracts.DatalinkUpdateNetworkInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(datalink_update_network, Contracts.DatalinkUpdateNetworkInputSchema);
    const datalink_set_emissions = datalink.command('set_emissions').description(`Manage datalink emission levels for stealth operations.`).action(async (o) => {
        try { const res = await client.api.datalink.set_emissions(ZodToCliMapper.parseOptions(o, Contracts.DatalinkSetEmissionsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(datalink_set_emissions, Contracts.DatalinkSetEmissionsInputSchema);
    let db = program.commands.find(c => c.name() === 'db');
    if (!db) db = program.command('db').description('DB domain tools');
    const db_profile_list = db.command('profile_list').description(`List all available unit profiles.`).action(async (o) => {
        try { const res = await client.api.db.profile_list(ZodToCliMapper.parseOptions(o, Contracts.DBProfileListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_profile_list, Contracts.DBProfileListInputSchema);
    const db_profile_get = db.command('profile_get').description(`Retrieve the full specification for a unit type.`).action(async (o) => {
        try { const res = await client.api.db.profile_get(ZodToCliMapper.parseOptions(o, Contracts.DBProfileGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_profile_get, Contracts.DBProfileGetInputSchema);
    const db_profile_create = db.command('profile_create').description(`Add a new unit definition to the registry.`).action(async (o) => {
        try { const res = await client.api.db.profile_create(ZodToCliMapper.parseOptions(o, Contracts.DBProfileCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_profile_create, Contracts.DBProfileCreateInputSchema);
    const db_weapon_list = db.command('weapon_list').description(`List all modeled weapon systems.`).action(async (o) => {
        try { const res = await client.api.db.weapon_list(ZodToCliMapper.parseOptions(o, Contracts.DBWeaponListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_weapon_list, Contracts.DBWeaponListInputSchema);
    const db_weapon_get = db.command('weapon_get').description(`Fetch weapon performance envelopes and seeker specs.`).action(async (o) => {
        try { const res = await client.api.db.weapon_get(ZodToCliMapper.parseOptions(o, Contracts.DBWeaponGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_weapon_get, Contracts.DBWeaponGetInputSchema);
    const db_scenario_list = db.command('scenario_list').description(`List all stored scenario templates.`).action(async (o) => {
        try { const res = await client.api.db.scenario_list(ZodToCliMapper.parseOptions(o, Contracts.DBScenarioListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_scenario_list, Contracts.DBScenarioListInputSchema);
    const db_scenario_get = db.command('scenario_get').description(`Retrieve the full manifest for a specific scenario template.`).action(async (o) => {
        try { const res = await client.api.db.scenario_get(ZodToCliMapper.parseOptions(o, Contracts.DBScenarioGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_scenario_get, Contracts.DBScenarioGetInputSchema);
    const db_seed = db.command('seed').description(`Populate the SQLite registry with baseline simulation data.`).action(async (o) => {
        try { const res = await client.api.db.seed(ZodToCliMapper.parseOptions(o, Contracts.DBSeedInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(db_seed, Contracts.DBSeedInputSchema);
    let entity = program.commands.find(c => c.name() === 'entity');
    if (!entity) entity = program.command('entity').description('ENTITY domain tools');
    const entity_list = entity.command('list').description(`List all entities in the match with optional filtering.`).action(async (o) => {
        try { const res = await client.api.entity.list(ZodToCliMapper.parseOptions(o, Contracts.EntityListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(entity_list, Contracts.EntityListInputSchema);
    const entity_get = entity.command('get').description(`Retrieve the full component state of a single entity.`).action(async (o) => {
        try { const res = await client.api.entity.get(ZodToCliMapper.parseOptions(o, Contracts.EntityGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(entity_get, Contracts.EntityGetInputSchema);
    const entity_create = entity.command('create').description(`Spawn a new entity into the simulation.`).action(async (o) => {
        try { const res = await client.api.entity.create(ZodToCliMapper.parseOptions(o, Contracts.EntityCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(entity_create, Contracts.EntityCreateInputSchema);
    const entity_delete = entity.command('delete').description(`Remove an entity from the simulation.`).action(async (o) => {
        try { const res = await client.api.entity.delete(ZodToCliMapper.parseOptions(o, Contracts.EntityDeleteInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(entity_delete, Contracts.EntityDeleteInputSchema);
    const entity_get_status = entity.command('get_status').description(`Quick operational status check for an entity.`).action(async (o) => {
        try { const res = await client.api.entity.get_status(ZodToCliMapper.parseOptions(o, Contracts.EntityStatusInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(entity_get_status, Contracts.EntityStatusInputSchema);
    let env = program.commands.find(c => c.name() === 'env');
    if (!env) env = program.command('env').description('ENV domain tools');
    const env_get = env.command('get').description(`Retrieve global environmental data (weather, ocean, time).`).action(async (o) => {
        try { const res = await client.api.env.get(ZodToCliMapper.parseOptions(o, Contracts.EnvGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_get, Contracts.EnvGetInputSchema);
    const env_update = env.command('update').description(`Modify global environmental conditions.`).action(async (o) => {
        try { const res = await client.api.env.update(ZodToCliMapper.parseOptions(o, Contracts.EnvUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_update, Contracts.EnvUpdateInputSchema);
    const env_sample_terrain = env.command('sample_terrain').description(`Query terrain elevation and atmospheric data at a coordinate.`).action(async (o) => {
        try { const res = await client.api.env.sample_terrain(ZodToCliMapper.parseOptions(o, Contracts.EnvSampleTerrainInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_sample_terrain, Contracts.EnvSampleTerrainInputSchema);
    const env_sample_ocean = env.command('sample_ocean').description(`Retrieve localized Sound Speed Profile for sonar modeling.`).action(async (o) => {
        try { const res = await client.api.env.sample_ocean(ZodToCliMapper.parseOptions(o, Contracts.EnvSampleOceanInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_sample_ocean, Contracts.EnvSampleOceanInputSchema);
    const env_get_borders = env.command('get_borders').description(`Fetch geopolitical boundaries and restricted zones.`).action(async (o) => {
        try { const res = await client.api.env.get_borders(ZodToCliMapper.parseOptions(o, Contracts.EnvGetBordersInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_get_borders, Contracts.EnvGetBordersInputSchema);
    const env_set_time = env.command('set_time').description(`Set simulation time of day (affects visual/IR sensors).`).action(async (o) => {
        try { const res = await client.api.env.set_time(ZodToCliMapper.parseOptions(o, Contracts.EnvSetTimeInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_set_time, Contracts.EnvSetTimeInputSchema);
    const env_prefetch_terrain = env.command('prefetch_terrain').description(`Command workers to cache terrain tiles for a bounding box.`).action(async (o) => {
        try { const res = await client.api.env.prefetch_terrain(ZodToCliMapper.parseOptions(o, Contracts.EnvPrefetchTerrainInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_prefetch_terrain, Contracts.EnvPrefetchTerrainInputSchema);
    const env_get_cache_stats = env.command('get_cache_stats').description(`Monitor disk/RAM usage of processed terrain tiles.`).action(async (o) => {
        try { const res = await client.api.env.get_cache_stats(ZodToCliMapper.parseOptions(o, Contracts.EnvGetCacheStatsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(env_get_cache_stats, Contracts.EnvGetCacheStatsInputSchema);
    let ew = program.commands.find(c => c.name() === 'ew');
    if (!ew) ew = program.command('ew').description('EW domain tools');
    const ew_get_jammer = ew.command('get_jammer').description(`Fetch current jammer power, frequency, and beam settings.`).action(async (o) => {
        try { const res = await client.api.ew.get_jammer(ZodToCliMapper.parseOptions(o, Contracts.EWGetJammerInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ew_get_jammer, Contracts.EWGetJammerInputSchema);
    const ew_set_jammer_state = ew.command('set_jammer_state').description(`Toggle jammer active state, mode, or type.`).action(async (o) => {
        try { const res = await client.api.ew.set_jammer_state(ZodToCliMapper.parseOptions(o, Contracts.EWSetJammerStateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ew_set_jammer_state, Contracts.EWSetJammerStateInputSchema);
    const ew_assign_jammer_target = ew.command('assign_jammer_target').description(`Point a directional jammer at a specific target.`).action(async (o) => {
        try { const res = await client.api.ew.assign_jammer_target(ZodToCliMapper.parseOptions(o, Contracts.EWAssignJammerTargetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ew_assign_jammer_target, Contracts.EWAssignJammerTargetInputSchema);
    const ew_get_sigint = ew.command('get_sigint').description(`Retrieve SIGINT data (localized jammer/emitter detections).`).action(async (o) => {
        try { const res = await client.api.ew.get_sigint(ZodToCliMapper.parseOptions(o, Contracts.EWGetSIGINTInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ew_get_sigint, Contracts.EWGetSIGINTInputSchema);
    let group = program.commands.find(c => c.name() === 'group');
    if (!group) group = program.command('group').description('GROUP domain tools');
    const group_list = group.command('list').description(`List all tactical groups in the match.`).action(async (o) => {
        try { const res = await client.api.group.list(ZodToCliMapper.parseOptions(o, Contracts.GroupListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(group_list, Contracts.GroupListInputSchema);
    const group_get = group.command('get').description(`Get details of a specific tactical group.`).action(async (o) => {
        try { const res = await client.api.group.get(ZodToCliMapper.parseOptions(o, Contracts.GroupGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(group_get, Contracts.GroupGetInputSchema);
    const group_create = group.command('create').description(`Create a new tactical group.`).action(async (o) => {
        try { const res = await client.api.group.create(ZodToCliMapper.parseOptions(o, Contracts.GroupCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(group_create, Contracts.GroupCreateInputSchema);
    const group_set_leader = group.command('set_leader').description(`Reassign the group leader.`).action(async (o) => {
        try { const res = await client.api.group.set_leader(ZodToCliMapper.parseOptions(o, Contracts.GroupSetLeaderInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(group_set_leader, Contracts.GroupSetLeaderInputSchema);
    const group_set_parameters = group.command('set_parameters').description(`Adjust group formation and spacing.`).action(async (o) => {
        try { const res = await client.api.group.set_parameters(ZodToCliMapper.parseOptions(o, Contracts.GroupSetParametersInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(group_set_parameters, Contracts.GroupSetParametersInputSchema);
    let guidance = program.commands.find(c => c.name() === 'guidance');
    if (!guidance) guidance = program.command('guidance').description('GUIDANCE domain tools');
    const guidance_get = guidance.command('get').description(`Inspect lock-on status, seeker type, and current track.`).action(async (o) => {
        try { const res = await client.api.guidance.get(ZodToCliMapper.parseOptions(o, Contracts.GuidanceGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(guidance_get, Contracts.GuidanceGetInputSchema);
    const guidance_update = guidance.command('update').description(`Adjust seeker sensitivity or maneuverability.`).action(async (o) => {
        try { const res = await client.api.guidance.update(ZodToCliMapper.parseOptions(o, Contracts.GuidanceUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(guidance_update, Contracts.GuidanceUpdateInputSchema);
    const guidance_set_target = guidance.command('set_target').description(`Override the seeker\'s target for mid-course guidance.`).action(async (o) => {
        try { const res = await client.api.guidance.set_target(ZodToCliMapper.parseOptions(o, Contracts.GuidanceSetTargetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(guidance_set_target, Contracts.GuidanceSetTargetInputSchema);
    let history = program.commands.find(c => c.name() === 'history');
    if (!history) history = program.command('history').description('HISTORY domain tools');
    const history_list_telemetry = history.command('list_telemetry').description(`Fetch time-series position and state data for a unit.`).action(async (o) => {
        try { const res = await client.api.history.list_telemetry(ZodToCliMapper.parseOptions(o, Contracts.HistoryListTelemetryInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_list_telemetry, Contracts.HistoryListTelemetryInputSchema);
    const history_get_heatmap = history.command('get_heatmap').description(`Generate spatial density maps from telemetry data.`).action(async (o) => {
        try { const res = await client.api.history.get_heatmap(ZodToCliMapper.parseOptions(o, Contracts.HistoryGetHeatmapInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_get_heatmap, Contracts.HistoryGetHeatmapInputSchema);
    const history_list_events = history.command('list_events').description(`List all discrete simulation events for a batch.`).action(async (o) => {
        try { const res = await client.api.history.list_events(ZodToCliMapper.parseOptions(o, Contracts.HistoryListEventsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_list_events, Contracts.HistoryListEventsInputSchema);
    const history_get_losses = history.command('get_losses').description(`Calculate attrition rates and loss-exchange ratios.`).action(async (o) => {
        try { const res = await client.api.history.get_losses(ZodToCliMapper.parseOptions(o, Contracts.HistoryGetLossesInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_get_losses, Contracts.HistoryGetLossesInputSchema);
    const history_aggregate_metrics = history.command('aggregate_metrics').description(`Compute statistical KPIs across simulation runs.`).action(async (o) => {
        try { const res = await client.api.history.aggregate_metrics(ZodToCliMapper.parseOptions(o, Contracts.HistoryAggregateMetricsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_aggregate_metrics, Contracts.HistoryAggregateMetricsInputSchema);
    const history_get_entity_samples = history.command('get_entity_samples').description(`Fetch detailed state samples for an entity over its lifetime.`).action(async (o) => {
        try { const res = await client.api.history.get_entity_samples(ZodToCliMapper.parseOptions(o, Contracts.HistoryGetEntitySamplesInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(history_get_entity_samples, Contracts.HistoryGetEntitySamplesInputSchema);
    let kinematics = program.commands.find(c => c.name() === 'kinematics');
    if (!kinematics) kinematics = program.command('kinematics').description('KINEMATICS domain tools');
    const kinematics_get = kinematics.command('get').description(`Retrieve high-fidelity position, velocity, and orientation data.`).action(async (o) => {
        try { const res = await client.api.kinematics.get(ZodToCliMapper.parseOptions(o, Contracts.KinematicsGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(kinematics_get, Contracts.KinematicsGetInputSchema);
    const kinematics_update = kinematics.command('update').description(`Adjust velocity or heading vectors directly.`).action(async (o) => {
        try { const res = await client.api.kinematics.update(ZodToCliMapper.parseOptions(o, Contracts.KinematicsUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(kinematics_update, Contracts.KinematicsUpdateInputSchema);
    const kinematics_set_position = kinematics.command('set_position').description(`Teleport a unit to a new coordinate.`).action(async (o) => {
        try { const res = await client.api.kinematics.set_position(ZodToCliMapper.parseOptions(o, Contracts.KinematicsSetPositionInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(kinematics_set_position, Contracts.KinematicsSetPositionInputSchema);
    const kinematics_apply_force = kinematics.command('apply_force').description(`Apply an impulse force to a unit, bypassing propulsion.`).action(async (o) => {
        try { const res = await client.api.kinematics.apply_force(ZodToCliMapper.parseOptions(o, Contracts.KinematicsApplyForceInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(kinematics_apply_force, Contracts.KinematicsApplyForceInputSchema);
    let logistics = program.commands.find(c => c.name() === 'logistics');
    if (!logistics) logistics = program.command('logistics').description('LOGISTICS domain tools');
    const logistics_get = logistics.command('get').description(`Check fuel, ammo, and structural integrity.`).action(async (o) => {
        try { const res = await client.api.logistics.get(ZodToCliMapper.parseOptions(o, Contracts.LogisticsGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_get, Contracts.LogisticsGetInputSchema);
    const logistics_update_state = logistics.command('update_state').description(`Manually set fuel or health levels.`).action(async (o) => {
        try { const res = await client.api.logistics.update_state(ZodToCliMapper.parseOptions(o, Contracts.LogisticsUpdateStateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_update_state, Contracts.LogisticsUpdateStateInputSchema);
    const logistics_transfer = logistics.command('transfer').description(`Transfer fuel between two entities.`).action(async (o) => {
        try { const res = await client.api.logistics.transfer(ZodToCliMapper.parseOptions(o, Contracts.LogisticsTransferInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_transfer, Contracts.LogisticsTransferInputSchema);
    const logistics_apply_damage = logistics.command('apply_damage').description(`Apply damage to a unit.`).action(async (o) => {
        try { const res = await client.api.logistics.apply_damage(ZodToCliMapper.parseOptions(o, Contracts.LogisticsApplyDamageInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_apply_damage, Contracts.LogisticsApplyDamageInputSchema);
    const logistics_land = logistics.command('land').description(`Initiate a recovery sequence at a facility.`).action(async (o) => {
        try { const res = await client.api.logistics.land(ZodToCliMapper.parseOptions(o, Contracts.LogisticsLandInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_land, Contracts.LogisticsLandInputSchema);
    const logistics_launch = logistics.command('launch').description(`Launch a stored unit from its parent platform.`).action(async (o) => {
        try { const res = await client.api.logistics.launch(ZodToCliMapper.parseOptions(o, Contracts.LogisticsLaunchInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(logistics_launch, Contracts.LogisticsLaunchInputSchema);
    let map = program.commands.find(c => c.name() === 'map');
    if (!map) map = program.command('map').description('MAP domain tools');
    const map_list_regions = map.command('list_regions').description(`List all pre-defined geographic theaters.`).action(async (o) => {
        try { const res = await client.api.map.list_regions(ZodToCliMapper.parseOptions(o, Contracts.MapListRegionsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_list_regions, Contracts.MapListRegionsInputSchema);
    const map_get_overlay = map.command('get_overlay').description(`Fetch GeoJSON data for a map layer.`).action(async (o) => {
        try { const res = await client.api.map.get_overlay(ZodToCliMapper.parseOptions(o, Contracts.MapGetOverlayInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_get_overlay, Contracts.MapGetOverlayInputSchema);
    const map_get_los = map.command('get_los').description(`Calculate Line-of-Sight between two coordinates.`).action(async (o) => {
        try { const res = await client.api.map.get_los(ZodToCliMapper.parseOptions(o, Contracts.MapGetLOSInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_get_los, Contracts.MapGetLOSInputSchema);
    const map_calculate_distance = map.command('calculate_distance').description(`Compute geodesic distance and bearing between two points.`).action(async (o) => {
        try { const res = await client.api.map.calculate_distance(ZodToCliMapper.parseOptions(o, Contracts.MapCalculateDistanceInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_calculate_distance, Contracts.MapCalculateDistanceInputSchema);
    const map_list_zones = map.command('list_zones').description(`List active tactical zones (NFZ, WEZ, etc.).`).action(async (o) => {
        try { const res = await client.api.map.list_zones(ZodToCliMapper.parseOptions(o, Contracts.MapListZonesInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_list_zones, Contracts.MapListZonesInputSchema);
    const map_update_zone = map.command('update_zone').description(`Dynamically update a tactical zone.`).action(async (o) => {
        try { const res = await client.api.map.update_zone(ZodToCliMapper.parseOptions(o, Contracts.MapUpdateZoneInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_update_zone, Contracts.MapUpdateZoneInputSchema);
    const map_create_zone = map.command('create_zone').description(`Create a new tactical zone.`).action(async (o) => {
        try { const res = await client.api.map.create_zone(ZodToCliMapper.parseOptions(o, Contracts.MapCreateZoneInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_create_zone, Contracts.MapCreateZoneInputSchema);
    const map_get_elevation_profile = map.command('get_elevation_profile').description(`Returns a sample array of elevation points between two coordinates.`).action(async (o) => {
        try { const res = await client.api.map.get_elevation_profile(ZodToCliMapper.parseOptions(o, Contracts.MapGetElevationProfileInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_get_elevation_profile, Contracts.MapGetElevationProfileInputSchema);
    const map_convert = map.command('convert').description(`Utility to convert between Geodetic (LLA), ECEF, and Local Tangent Plane (ENU).`).action(async (o) => {
        try { const res = await client.api.map.convert(ZodToCliMapper.parseOptions(o, Contracts.MapConvertCoordinatesInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(map_convert, Contracts.MapConvertCoordinatesInputSchema);
    let match = program.commands.find(c => c.name() === 'match');
    if (!match) match = program.command('match').description('MATCH domain tools');
    const match_list = match.command('list').description(`Retrieve a paginated list of matches with optional filtering.`).action(async (o) => {
        try { const res = await client.api.match.list(ZodToCliMapper.parseOptions(o, Contracts.MatchListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_list, Contracts.MatchListInputSchema);
    const match_create = match.command('create').description(`Create a new simulation match from a scenario template.`).action(async (o) => {
        try { const res = await client.api.match.create(ZodToCliMapper.parseOptions(o, Contracts.MatchCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_create, Contracts.MatchCreateInputSchema);
    const match_get = match.command('get').description(`Retrieve the metadata and current status of a specific match.`).action(async (o) => {
        try { const res = await client.api.match.get(ZodToCliMapper.parseOptions(o, Contracts.MatchGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_get, Contracts.MatchGetInputSchema);
    const match_update = match.command('update').description(`Update match operational parameters.`).action(async (o) => {
        try { const res = await client.api.match.update(ZodToCliMapper.parseOptions(o, Contracts.MatchUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_update, Contracts.MatchUpdateInputSchema);
    const match_delete = match.command('delete').description(`Terminate and purge an active match.`).action(async (o) => {
        try { const res = await client.api.match.delete(ZodToCliMapper.parseOptions(o, Contracts.MatchDeleteInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_delete, Contracts.MatchDeleteInputSchema);
    const match_get_win_state = match.command('get_win_state').description(`Evaluate victory conditions for the current match state.`).action(async (o) => {
        try { const res = await client.api.match.get_win_state(ZodToCliMapper.parseOptions(o, Contracts.MatchWinStateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(match_get_win_state, Contracts.MatchWinStateInputSchema);
    let ministry = program.commands.find(c => c.name() === 'ministry');
    if (!ministry) ministry = program.command('ministry').description('MINISTRY domain tools');
    const ministry_get_evaluation = ministry.command('get_evaluation').description(`Retrieve the DesiredState generated by an AI Ministry.`).action(async (o) => {
        try { const res = await client.api.ministry.get_evaluation(ZodToCliMapper.parseOptions(o, Contracts.MinistryGetEvaluationInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ministry_get_evaluation, Contracts.MinistryGetEvaluationInputSchema);
    const ministry_update_doctrine = ministry.command('update_doctrine').description(`Inject doctrine parameters to change Ministry behavior.`).action(async (o) => {
        try { const res = await client.api.ministry.update_doctrine(ZodToCliMapper.parseOptions(o, Contracts.MinistryUpdateDoctrineInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(ministry_update_doctrine, Contracts.MinistryUpdateDoctrineInputSchema);
    let mission = program.commands.find(c => c.name() === 'mission');
    if (!mission) mission = program.command('mission').description('MISSION domain tools');
    const mission_list = mission.command('list').description(`List all active and queued missions for a unit.`).action(async (o) => {
        try { const res = await client.api.mission.list(ZodToCliMapper.parseOptions(o, Contracts.MissionListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(mission_list, Contracts.MissionListInputSchema);
    const mission_create = mission.command('create').description(`Assign a new mission to a unit.`).action(async (o) => {
        try { const res = await client.api.mission.create(ZodToCliMapper.parseOptions(o, Contracts.MissionCreateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(mission_create, Contracts.MissionCreateInputSchema);
    const mission_get_tasks = mission.command('get_tasks').description(`Inspect low-level tasks generated by the mission system.`).action(async (o) => {
        try { const res = await client.api.mission.get_tasks(ZodToCliMapper.parseOptions(o, Contracts.MissionGetTasksInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(mission_get_tasks, Contracts.MissionGetTasksInputSchema);
    let nav = program.commands.find(c => c.name() === 'nav');
    if (!nav) nav = program.command('nav').description('NAV domain tools');
    const nav_get = nav.command('get').description(`Check current destination, course, and autopilot mode.`).action(async (o) => {
        try { const res = await client.api.nav.get(ZodToCliMapper.parseOptions(o, Contracts.NavGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_get, Contracts.NavGetInputSchema);
    const nav_update = nav.command('update').description(`Adjust cruise speed, altitude, or heading.`).action(async (o) => {
        try { const res = await client.api.nav.update(ZodToCliMapper.parseOptions(o, Contracts.NavUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_update, Contracts.NavUpdateInputSchema);
    const nav_list_waypoints = nav.command('list_waypoints').description(`Retrieve the active flight plan or route.`).action(async (o) => {
        try { const res = await client.api.nav.list_waypoints(ZodToCliMapper.parseOptions(o, Contracts.NavListWaypointsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_list_waypoints, Contracts.NavListWaypointsInputSchema);
    const nav_add_waypoint = nav.command('add_waypoint').description(`Append a waypoint to the navigation path.`).action(async (o) => {
        try { const res = await client.api.nav.add_waypoint(ZodToCliMapper.parseOptions(o, Contracts.NavAddWaypointInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_add_waypoint, Contracts.NavAddWaypointInputSchema);
    const nav_clear_waypoints = nav.command('clear_waypoints').description(`Clear all waypoints and stop navigation.`).action(async (o) => {
        try { const res = await client.api.nav.clear_waypoints(ZodToCliMapper.parseOptions(o, Contracts.NavClearWaypointsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_clear_waypoints, Contracts.NavClearWaypointsInputSchema);
    const nav_join_formation = nav.command('join_formation').description(`Attach unit to a leader for collective movement.`).action(async (o) => {
        try { const res = await client.api.nav.join_formation(ZodToCliMapper.parseOptions(o, Contracts.NavJoinFormationInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_join_formation, Contracts.NavJoinFormationInputSchema);
    const nav_break_formation = nav.command('break_formation').description(`Detach unit from formation.`).action(async (o) => {
        try { const res = await client.api.nav.break_formation(ZodToCliMapper.parseOptions(o, Contracts.NavBreakFormationInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(nav_break_formation, Contracts.NavBreakFormationInputSchema);
    let orbital = program.commands.find(c => c.name() === 'orbital');
    if (!orbital) orbital = program.command('orbital').description('ORBITAL domain tools');
    const orbital_get_elements = orbital.command('get_elements').description(`Fetch the Keplerian orbital elements for a satellite.`).action(async (o) => {
        try { const res = await client.api.orbital.get_elements(ZodToCliMapper.parseOptions(o, Contracts.OrbitalGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(orbital_get_elements, Contracts.OrbitalGetInputSchema);
    const orbital_update_elements = orbital.command('update_elements').description(`Manually adjust a satellite\'s orbit (Station Keeping).`).action(async (o) => {
        try { const res = await client.api.orbital.update_elements(ZodToCliMapper.parseOptions(o, Contracts.OrbitalUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(orbital_update_elements, Contracts.OrbitalUpdateInputSchema);
    const orbital_predict_pass = orbital.command('predict_pass').description(`Predict when a satellite will have LOS over a specific region.`).action(async (o) => {
        try { const res = await client.api.orbital.predict_pass(ZodToCliMapper.parseOptions(o, Contracts.OrbitalPredictInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(orbital_predict_pass, Contracts.OrbitalPredictInputSchema);
    let propulsion = program.commands.find(c => c.name() === 'propulsion');
    if (!propulsion) propulsion = program.command('propulsion').description('PROPULSION domain tools');
    const propulsion_get = propulsion.command('get').description(`Fetch real-time throttle, thrust, and engine state.`).action(async (o) => {
        try { const res = await client.api.propulsion.get(ZodToCliMapper.parseOptions(o, Contracts.PropulsionGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(propulsion_get, Contracts.PropulsionGetInputSchema);
    const propulsion_update = propulsion.command('update').description(`Adjust throttle or toggle afterburners.`).action(async (o) => {
        try { const res = await client.api.propulsion.update(ZodToCliMapper.parseOptions(o, Contracts.PropulsionUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(propulsion_update, Contracts.PropulsionUpdateInputSchema);
    const propulsion_set_state = propulsion.command('set_state').description(`Command engine startup, shutdown, or emergency cutoff.`).action(async (o) => {
        try { const res = await client.api.propulsion.set_state(ZodToCliMapper.parseOptions(o, Contracts.PropulsionSetStateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(propulsion_set_state, Contracts.PropulsionSetStateInputSchema);
    let sensor = program.commands.find(c => c.name() === 'sensor');
    if (!sensor) sensor = program.command('sensor').description('SENSOR domain tools');
    const sensor_list = sensor.command('list').description(`List all onboard sensors and their settings.`).action(async (o) => {
        try { const res = await client.api.sensor.list(ZodToCliMapper.parseOptions(o, Contracts.SensorListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sensor_list, Contracts.SensorListInputSchema);
    const sensor_update = sensor.command('update').description(`Modify sensor properties like mode or power state.`).action(async (o) => {
        try { const res = await client.api.sensor.update(ZodToCliMapper.parseOptions(o, Contracts.SensorUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sensor_update, Contracts.SensorUpdateInputSchema);
    const sensor_set_emcon = sensor.command('set_emcon').description(`Set Emission Control level for the platform.`).action(async (o) => {
        try { const res = await client.api.sensor.set_emcon(ZodToCliMapper.parseOptions(o, Contracts.SensorSetEmconInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sensor_set_emcon, Contracts.SensorSetEmconInputSchema);
    let side = program.commands.find(c => c.name() === 'side');
    if (!side) side = program.command('side').description('SIDE domain tools');
    const side_get_roe = side.command('get_roe').description(`Retrieve the current ROE and EMCON for a side.`).action(async (o) => {
        try { const res = await client.api.side.get_roe(ZodToCliMapper.parseOptions(o, Contracts.SideGetROEInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(side_get_roe, Contracts.SideGetROEInputSchema);
    const side_update_roe = side.command('update_roe').description(`Update side-wide Rules of Engagement.`).action(async (o) => {
        try { const res = await client.api.side.update_roe(ZodToCliMapper.parseOptions(o, Contracts.SideUpdateROEInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(side_update_roe, Contracts.SideUpdateROEInputSchema);
    let signature = program.commands.find(c => c.name() === 'signature');
    if (!signature) signature = program.command('signature').description('SIGNATURE domain tools');
    const signature_get = signature.command('get').description(`Fetch RCS, IR, and acoustic signatures.`).action(async (o) => {
        try { const res = await client.api.signature.get(ZodToCliMapper.parseOptions(o, Contracts.SignatureGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(signature_get, Contracts.SignatureGetInputSchema);
    const signature_update = signature.command('update').description(`Apply signature modifiers (e.g., stealth configuration).`).action(async (o) => {
        try { const res = await client.api.signature.update(ZodToCliMapper.parseOptions(o, Contracts.SignatureUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(signature_update, Contracts.SignatureUpdateInputSchema);
    let cm = program.commands.find(c => c.name() === 'cm');
    if (!cm) cm = program.command('cm').description('CM domain tools');
    const cm_deploy = cm.command('deploy').description(`Deploy chaff, flares, or acoustic decoys.`).action(async (o) => {
        try { const res = await client.api.cm.deploy(ZodToCliMapper.parseOptions(o, Contracts.CMDeployInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(cm_deploy, Contracts.CMDeployInputSchema);
    const cm_get_inventory = cm.command('get_inventory').description(`Check remaining countermeasure expendables.`).action(async (o) => {
        try { const res = await client.api.cm.get_inventory(ZodToCliMapper.parseOptions(o, Contracts.CMGetInventoryInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(cm_get_inventory, Contracts.CMGetInventoryInputSchema);
    let sim = program.commands.find(c => c.name() === 'sim');
    if (!sim) sim = program.command('sim').description('SIM domain tools');
    const sim_get = sim.command('get').description(`Get the current simulation status including tick, speed, and pause state.`).action(async (o) => {
        try { const res = await client.api.sim.get(ZodToCliMapper.parseOptions(o, Contracts.SimGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sim_get, Contracts.SimGetInputSchema);
    const sim_step = sim.command('step').description(`Manually advance the simulation by one or more ticks.`).action(async (o) => {
        try { const res = await client.api.sim.step(ZodToCliMapper.parseOptions(o, Contracts.SimStepInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sim_step, Contracts.SimStepInputSchema);
    const sim_update = sim.command('update').description(`Adjust simulation speed or toggle pause state.`).action(async (o) => {
        try { const res = await client.api.sim.update(ZodToCliMapper.parseOptions(o, Contracts.SimUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(sim_update, Contracts.SimUpdateInputSchema);
    let track = program.commands.find(c => c.name() === 'track');
    if (!track) track = program.command('track').description('TRACK domain tools');
    const track_list = track.command('list').description(`Retrieve all tracks known to a specific side.`).action(async (o) => {
        try { const res = await client.api.track.list(ZodToCliMapper.parseOptions(o, Contracts.TrackListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(track_list, Contracts.TrackListInputSchema);
    const track_get = track.command('get').description(`Get detailed classification and position for a track.`).action(async (o) => {
        try { const res = await client.api.track.get(ZodToCliMapper.parseOptions(o, Contracts.TrackGetInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(track_get, Contracts.TrackGetInputSchema);
    const track_update = track.command('update').description(`Update track classification or identification.`).action(async (o) => {
        try { const res = await client.api.track.update(ZodToCliMapper.parseOptions(o, Contracts.TrackUpdateInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(track_update, Contracts.TrackUpdateInputSchema);
    const track_delete = track.command('delete').description(`Remove a track from the operational picture.`).action(async (o) => {
        try { const res = await client.api.track.delete(ZodToCliMapper.parseOptions(o, Contracts.TrackDeleteInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(track_delete, Contracts.TrackDeleteInputSchema);
    let worker = program.commands.find(c => c.name() === 'worker');
    if (!worker) worker = program.command('worker').description('WORKER domain tools');
    const worker_list = worker.command('list').description(`List all active worker pools and their high-level status.`).action(async (o) => {
        try { const res = await client.api.worker.list(ZodToCliMapper.parseOptions(o, Contracts.WorkerListInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(worker_list, Contracts.WorkerListInputSchema);
    const worker_get_stats = worker.command('get_stats').description(`Get detailed performance metrics for a specific worker pool.`).action(async (o) => {
        try { const res = await client.api.worker.get_stats(ZodToCliMapper.parseOptions(o, Contracts.WorkerGetStatsInputSchema)); console.log(JSON.stringify(res, null, 2)); } catch (err: any) { console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`); process.exit(1); }
    });
    ZodToCliMapper.mapSchemaToOptions(worker_get_stats, Contracts.WorkerGetStatsInputSchema);
}
