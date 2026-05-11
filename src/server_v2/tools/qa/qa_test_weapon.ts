import { defineTool } from '../../core/tool_builder.js';
import { qaTestWeaponContract } from '../../../sdk_v2/contracts/qa/qa.contracts.js';
import { Vector3, Side, EntityProfile, SensorType } from '../../../engine/core/Types.js';
import { randomUUID } from 'crypto';

// Import System Tools
import { entity_create } from '../entity/entity_create.js';
import { combat_fire } from '../combat/combat_fire.js';
import { sim_step } from '../sim/sim_step.js';
import { sensor_add_detection } from '../sensor/sensor_add_detection.js';
import { TransformComponent } from '../../../engine/components/Physics.js';
import { GuidanceComponent } from '../../../engine/components/Guidance.js';
import { VectorMath } from '../../../engine/math/VectorMath.js';
import { history_get_entity_samples } from '../history/history_get_entity_samples.js';
import { sim_update } from '../sim/sim_update.js';

export const qa_test_weapon = defineTool(qaTestWeaponContract, async (input, ctx) => {
    ctx.app.log.info(`[QA] Starting weapon test with input: ${JSON.stringify(input)}`);
    // 1. Create sandbox match
    ctx.app.log.info(`[QA] Creating match...`);
    const match = await ctx.app.matchService.createMatch(
        'basic-movement',
        `Test Range: ${input.weaponProfileId}`
    );

    const matchId = match.id;
    match.isPaused = true; // Stop the background runner from ticking this match
    const world = match.world;
    const shooterId = 'range-shooter';
    const targetId = 'range-target';
    const enableAnalysis = input.enableAnalysis;

    // 1.5 Validate weapon profile exists
    const weaponProfile = world.weaponProfiles.get(input.weaponProfileId);
    if (!weaponProfile) {
        throw new Error(`Weapon profile '${input.weaponProfileId}' not found in registry. Available: ${Array.from(world.weaponProfiles.getInternalMap().keys()).join(', ')}`);
    }



    // 2. Setup dynamic shooter profile
    ctx.app.log.info(`[QA] Registering dynamic profile...`);
    const shooterProfileId = `test-bed-${input.weaponProfileId}-${randomUUID().substring(0, 8)}`;
    const shooterProfile: EntityProfile = {
        platformClass: 'Weapon Test Bed',
        type: 'Ship',
        health: { maxHp: 1000 },
        kinematics: { massKg: 5000000, maxSpeedKts: 30, cruiseSpeedKts: 20 },
        sensors: [
            { name: 'Range-Radar', type: SensorType.Radar, maxRangeM: 100000 }
        ],
        combat: {
            mounts: [{
                name: 'Test-Mount-0',
                arcs: [-180, 180],
                slewRate: 180,
                reloadTicks: 10,
                magazineIndices: [0],
                alignmentThresholdDeg: 0.1
            }],
            magazines: [{
                name: 'Test-Mag',
                capacity: input.rounds,
                weaponProfileId: input.weaponProfileId
            }]
        }
    };
    world.profileRegistry.register(shooterProfileId, shooterProfile);

    // 3. Setup entities (Moved away from 0,0,0 to avoid collision with scenario entities)
    const shooterPos = { x: 2000, y: 2000, z: 0 };
    const targetPos = { x: shooterPos.x + input.rangeM, y: shooterPos.y, z: input.altitudeM };

    ctx.app.log.info(`[QA] Spawning entities at ${JSON.stringify(shooterPos)}...`);
    await entity_create.call({
        matchId,
        id: shooterId,
        profileId: shooterProfileId,
        side: Side.Blue,
        position: shooterPos,
        heading: 0,
        speedKts: 0
    }, ctx);

    const targetMatch = await entity_create.call({
        matchId,
        profileId: input.targetProfileId,
        id: targetId,
        side: Side.Red,
        position: targetPos,
        mission: undefined // Keep stationary for weapon test
    }, ctx);

    // 4. Setup Monitoring
    const targetImpacts: Vector3[] = [];
    const terrainImpacts: Vector3[] = [];
    const firedMunitions = new Set<string>();
    const munitionStats = new Map<string, { maxAlt: number, status: string, impactPos?: Vector3, impactType?: 'Target' | 'Terrain' }>();
    let firstMunitionId: string | undefined;
    let outcome = 'Running';

    // Add a persistent detection for the shooter to see the target
    await sensor_add_detection.call({
        matchId,
        entityId: shooterId,
        targetId
    }, ctx).catch(err => ctx.app.log.error(`[QA] Failed to add initial detection: ${err.message}`));

    world.events.on('WeaponFired', (event: any) => {
        const data = event.data;
        if (data.munitionId) {
            ctx.app.log.info(`[QA] EVENT: WeaponFired - munitionId: ${data.munitionId}`);
            firedMunitions.add(data.munitionId);
            munitionStats.set(data.munitionId, { maxAlt: 0, status: 'InFlight' });
            if (!firstMunitionId) firstMunitionId = data.munitionId;

            // Only add detection for the projectile if it has its own seeker (Missiles)
            const weaponProfile = world.weaponProfiles.get(data.weaponProfileId);
            if (weaponProfile?.type === 'Missile') {
                void sensor_add_detection.call({
                    matchId,
                    entityId: data.munitionId,
                    targetId
                }, ctx).catch(err => ctx.app.log.error(`[QA] Failed to add detection: ${err.message}`));
            }
        }
    });

    world.events.on('Detonation', (event: any) => {
        if (firedMunitions.has(event.entityId)) {
            ctx.app.log.info(`[QA] EVENT: Detonation of ${event.entityId} at ${JSON.stringify(event.data.position)}`);
            const stats = munitionStats.get(event.entityId);
            if (stats) {
                stats.status = 'Detonated';
                stats.impactPos = event.data.position;
                stats.impactType = 'Target';
            }
            if (event.data.position) targetImpacts.push(event.data.position);
        }
    });

    world.events.on('Impact', async (event: any) => {
        if (event.data.position && (event.data.targetId === 'TERRAIN' || event.entityId === targetId)) {
            const pos = event.data.position;
            const activeMunitions = Array.from(world.getEntities()).filter(e => firedMunitions.has(e.id));
            const sourceMunition = activeMunitions.find(m => {
                const mPos = m.getComponent(TransformComponent)?.position;
                return mPos && VectorMath.distance(mPos, pos) < 50;
            });

            if (sourceMunition) {
                const isTarget = event.entityId === targetId;
                ctx.app.log.info(`[QA] EVENT: ${isTarget ? 'Target' : 'Terrain'} Impact of ${sourceMunition.id} at ${JSON.stringify(pos)}`);
                const stats = munitionStats.get(sourceMunition.id);
                if (stats) {
                    stats.status = isTarget ? 'Impacted' : 'Ground-Hit';
                    stats.impactPos = pos;
                    stats.impactType = isTarget ? 'Target' : 'Terrain';
                }

                if (isTarget) targetImpacts.push(pos);
                else terrainImpacts.push(pos);
            }
        }
    });

    // 5. Execution Loop
    ctx.app.log.info(`[QA] Starting execution loop...`);

    let ticks = 0;
    const maxTicks = 15000;
    let hasFiredAll = false;

    while (ticks < maxTicks) {
        // Attempt to fire if we haven't successfully released yet
        if (firedMunitions.size < input.rounds) {
            try {
                await combat_fire.call({
                    matchId,
                    entityId: shooterId,
                    mountIndex: 0,
                    targetId
                }, ctx);
            } catch (err: any) {
                // Ignore alignment errors during loop
            }
        } else {
            hasFiredAll = true;
        }

        await sim_step.call({ matchId, ticks: 1 }, ctx);
        ticks++;

        // Detailed terminal phase logging and peak tracking
        const activeEntities = Array.from(world.getEntities());
        const activeMunitions = activeEntities.filter(e => firedMunitions.has(e.id));

        for (const m of activeMunitions) {
            const transform = m.getComponent(TransformComponent);
            if (!transform) continue;

            const stats = munitionStats.get(m.id);
            if (stats) {
                stats.maxAlt = Math.max(stats.maxAlt, transform.position.z);
            }

            const target = world.getEntity(targetId);
            const targetPos = target?.getComponent(TransformComponent)?.position;
            const distToTarget = targetPos ? VectorMath.distance(transform.position, targetPos) : -1;

            if (distToTarget < 2000 && ticks % 100 === 0) {
                const guidance = m.getComponent(GuidanceComponent);
                ctx.app.log.info(`[QA] Terminal Phase: ${m.id} dist=${Math.round(distToTarget)}m alt=${Math.round(transform.position.z)}m lock=${guidance?.hasLock}`);
            }
        }

        if (ticks % 100 === 0) {
            ctx.app.log.info(`[QA] Sim Progress: ${ticks} ticks, target impacts: ${targetImpacts.length}, ground impacts: ${terrainImpacts.length}, active munitions: ${activeMunitions.length}/${firedMunitions.size}`);
        }

        // Only exit when ALL munitions are fired AND all have resolved
        if (hasFiredAll && activeMunitions.length === 0) {
            outcome = targetImpacts.length > 0 ? 'Impact' : 'Miss';
            ctx.app.log.info(`[QA] All munitions resolved. Outcome: ${outcome}`);
            break;
        }
    }
    ctx.app.log.info(`[QA] Simulation ended after ${ticks} ticks.`);

    if (ticks >= maxTicks && firedMunitions.size < input.rounds) outcome = 'Timeout';

    // 6. Calculate Metrics
    ctx.app.log.info(`[QA] Calculating metrics...`);

    const currentMatch = ctx.app.matchService.getMatch(matchId);
    const targetEntity = currentMatch.world.getEntity(targetId);
    const finalTargetPos = targetEntity?.getComponent(TransformComponent)?.position || targetPos;

    await currentMatch.flush();
    let biasM = 0;
    let cep50M = 0;

    if (targetImpacts.length > 0) {
        const mip = targetImpacts.reduce((acc, pos) => ({
            x: acc.x + pos.x / targetImpacts.length,
            y: acc.y + pos.y / targetImpacts.length,
            z: acc.z + pos.z / targetImpacts.length
        }), { x: 0, y: 0, z: 0 });

        const bias = {
            x: mip.x - finalTargetPos.x,
            y: mip.y - finalTargetPos.y,
            z: mip.z - finalTargetPos.z
        };
        biasM = Math.sqrt(bias.x ** 2 + bias.y ** 2 + bias.z ** 2);

        const distances = targetImpacts.map(pos => {
            return Math.sqrt((pos.x - mip.x) ** 2 + (pos.y - mip.y) ** 2 + (pos.z - mip.z) ** 2);
        });
        distances.sort((a, b) => a - b);
        cep50M = distances[Math.floor(distances.length * 0.5)] || 0;
    }

    // Comprehensive Metric Calculation across ALL munitions from DB
    const munitionHistory = new Map<string, { samples: any[], maxAlt: number, minAlt: number, avgAlt: number, finalAlt: number }>();

    for (const munitionId of firedMunitions) {
        const historyResponse = await history_get_entity_samples.call({
            batchId: matchId,
            entityId: munitionId,
            sampleCount: 200 // Reasonable for summary
        }, ctx);

        const samples = historyResponse.samples || [];
        if (samples.length > 0) {
            const altitudes = samples.map((f: any) => f.position.z);
            munitionHistory.set(munitionId, {
                samples,
                maxAlt: Math.max(...altitudes),
                minAlt: Math.min(...altitudes),
                avgAlt: altitudes.reduce((a: number, b: number) => a + b, 0) / altitudes.length,
                finalAlt: samples[samples.length - 1].position.z
            });
        }
    }

    const allHistoricalStats = Array.from(munitionHistory.values());
    const globalMaxAlt = allHistoricalStats.length > 0 ? Math.max(...allHistoricalStats.map(s => s.maxAlt)) : 0;
    const globalMinAlt = allHistoricalStats.length > 0 ? Math.min(...allHistoricalStats.map(s => s.minAlt)) : 0;
    const globalAvgMaxAlt = allHistoricalStats.length > 0 ? allHistoricalStats.reduce((acc, s) => acc + s.maxAlt, 0) / allHistoricalStats.length : 0;

    // Detect Flight Anomalies (e.g., any round deviating > 15% from avg max alt)
    const anomalies: string[] = [];
    munitionHistory.forEach((stats, id) => {
        const deviation = Math.abs(stats.maxAlt - globalAvgMaxAlt) / (globalAvgMaxAlt || 1);
        if (deviation > 0.15) {
            anomalies.push(`${id} peak altitude (${stats.maxAlt.toFixed(1)}m) deviated by ${(deviation * 100).toFixed(1)}%`);
        }
    });

    const firstMunitionData = firstMunitionId ? munitionHistory.get(firstMunitionId) : undefined;
    const firstMunitionSamples = firstMunitionData?.samples || [];

    const prompt = `
[WEAPON TEST RESULTS]
Match ID: ${matchId}
Weapon: ${input.weaponProfileId}
Target ID: ${targetId}
Outcome: ${outcome} (Target Impacts: ${targetImpacts.length}, Ground Hits: ${terrainImpacts.length})
Rounds Fired: ${firedMunitions.size} / ${input.rounds}

[AGGREGATE PERFORMANCE (Target Hits Only)]
Bias (Mean Impact Point): ${biasM.toFixed(2)}m
CEP(50): ${cep50M.toFixed(2)}m

[FLIGHT ENVELOPE (Across All Rounds)]
Global Peak Altitude: ${globalMaxAlt.toFixed(2)}m
Average Peak Altitude: ${globalAvgMaxAlt.toFixed(2)}m
Global Min Altitude: ${globalMinAlt.toFixed(2)}m

[MUNITION REGISTRY & FLIGHT STATS]
${Array.from(munitionHistory.entries()).map(([id, s]) => {
        const simStats = munitionStats.get(id);
        return `- ${id}: status=${simStats?.status}, type=${simStats?.impactType || 'N/A'}, peakAlt=${s.maxAlt.toFixed(1)}m, impactAlt=${s.finalAlt.toFixed(1)}m`;
    }).join('\n')}

${anomalies.length > 0 ? `[FLIGHT ANOMALIES DETECTED]\n${anomalies.map(a => `! ${a}`).join('\n')}` : '[NO SIGNIFICANT FLIGHT ANOMALIES]'}

[REPRESENTATIVE TRAJECTORY (Munition: ${firstMunitionId})]
Samples: ${firstMunitionSamples.length}
${firstMunitionSamples.slice(0, 3).map((f: any) => `Tick ${f.tick}: ${JSON.stringify(f.position)}`).join('\n')}
...
${firstMunitionSamples.slice(-3).map((f: any) => `Tick ${f.tick}: ${JSON.stringify(f.position)}`).join('\n')}

Please analyze these results for any logic errors or performance anomalies. 
Check if the munitions reached the target, if accuracy and flight profiles are consistent across all ${firedMunitions.size} rounds, and if the simulation resolved correctly.

You must use the bug report tool to report any issues but search for a similar bug first.
`;

    console.log(`[QA] Prompt: ${prompt}`);

    // 7. AI Agent Analysis
    let agentAnalysis = "";
    if (enableAnalysis) {
        ctx.app.log.info(`[QA] Invoking AI Agent...`);
        const agents = await ctx.app.agentService.listAgents();
        const agent = agents.find(a => a.name === 'Qa Analyst');

        if (!agent) {
            ctx.app.log.warn(`[QA] 'Qa Analyst' agent not found. Run 'npm run cli -- agent seed' to populate.`);
            ctx.app.matchService.deleteMatch(matchId);
            throw new Error("QA Analyst agent not found. Please seed the agents first.");
        }

        const thread = await ctx.app.agentService.createThread({
            agentId: agent.id,
            matchId: matchId,
            name: `Analysis of ${input.weaponProfileId} Test`
        });


        const agentStream = ctx.app.agentService.runAgentStream(thread.id, prompt);


        for await (const event of agentStream) {
            switch (event.type) {
                case 'thinking':
                    process.stdout.write(`\x1b[90m${event.text}\x1b[0m`);
                    break;
                case 'content':
                    process.stdout.write(event.text || '');
                    agentAnalysis += event.text;
                    break;
                case 'tool_call':
                    console.log(`\n\x1b[33m[TOOL CALL]\x1b[0m ${event.name}(${JSON.stringify(event.args)})`);
                    break;
                case 'tool_result':
                    console.log(`\x1b[32m[TOOL RESULT]\x1b[0m ${event.name} returned data: \n ${JSON.stringify(event.result)}`);
                    break;
                case 'done':
                    console.log(`\n\x1b[36m[AGENT DONE]\x1b[0m Message ID: ${event.messageId}`);
                    break;
                case 'error':
                    console.error(`\n\x1b[31m[AGENT ERROR]\x1b[0m ${JSON.stringify(event, null, 2)}`);
                    break;
            }
        }
    }

    // Clean up
    await match.flush();
    ctx.app.matchService.deleteMatch(matchId);

    return {
        matchId,
        outcome,
        metrics: {
            impacts: targetImpacts,
            biasM,
            cep50M,
            munitionsFired: firedMunitions.size
        },
        agentAnalysis: agentAnalysis
    };
});


