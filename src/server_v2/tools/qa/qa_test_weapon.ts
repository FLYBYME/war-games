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
import { VectorMath } from '../../../engine/math/VectorMath.js';
import { history_get_entity_samples } from '../history/history_get_entity_samples.js';

export const qa_test_weapon = defineTool(qaTestWeaponContract, async (input, ctx) => {
    // 1. Create sandbox match
    ctx.app.log.info(`[QA] Creating match...`);
    const match = await ctx.app.matchService.createMatch(
        'basic-movement',
        `Test Range: ${input.weaponProfileId}`
    );

    const matchId = match.id;
    const world = match.world;
    const shooterId = 'range-shooter';
    const targetId = 'range-target';

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
                capacity: input.rounds + 10,
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
        side: 'Blue',
        position: shooterPos,
        heading: 0,
        speedKts: 0
    }, ctx);

    await entity_create.call({
        matchId,
        id: targetId,
        profileId: input.targetProfileId,
        side: 'Red',
        position: targetPos,
        heading: 0,
        speedKts: 0
    }, ctx);

    // 4. Setup Monitoring
    const impacts: Vector3[] = [];
    const firedMunitions = new Set<string>();
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
            if (!firstMunitionId) firstMunitionId = data.munitionId;
            
            // Only add detection for the projectile if it has its own seeker (Missiles)
            // For now, we assume all munitions benefit from a shared track if available, 
            // but we'll add it for missiles to be safe.
            const weaponProfile = world.weaponProfiles.get(data.weaponProfileId);
            if (weaponProfile?.type === 'Missile') {
                void sensor_add_detection.call({
                    matchId,
                    entityId: data.munitionId,
                    targetId
                }, ctx).catch(err => ctx.app.log.error(`[QA] Failed to add detection: ${err.message}`));
            }
        } else {
             ctx.app.log.debug(`[QA] WeaponFired event from shooter (no munitionId yet)`);
        }
    });

    world.events.on('Detonation', (event: any) => {
        if (firedMunitions.has(event.entityId)) {
            ctx.app.log.info(`[QA] EVENT: Detonation of ${event.entityId} at ${JSON.stringify(event.data.position)}`);
            if (event.data.position) impacts.push(event.data.position);
            outcome = 'Impact';
        }
    });

    world.events.on('Impact', async (event: any) => {
        // For munitions, we usually get a Detonation. For direct fire (Guns), we might get Impact.
        // We filter by checking if the entityId (the victim) is our target OR if the source was a munition.
        // In this engine, projectiles themselves emit Detonation, while Impact is emitted by the victim.
        // If we want to record the position of a direct-hit, we might need more data.
        if (event.data.position && (event.data.targetId === 'TERRAIN' || event.entityId === targetId)) {
            // If we can't tie it back to a specific munition, we check if any active munitions are near this position
            const pos = event.data.position;
            const activeMunitions = Array.from(world.getEntities()).filter(e => firedMunitions.has(e.id));
            const isFromMunition = activeMunitions.some(m => {
                const mPos = m.getComponent(TransformComponent)?.position;
                return mPos && VectorMath.distance(mPos, pos) < 50;
            });

            if (isFromMunition) {
                ctx.app.log.info(`[QA] EVENT: Impact of munition at ${JSON.stringify(pos)}`);
                impacts.push(pos);
                outcome = 'Impact';
            }
        }
    });

    // 5. Execution Loop
    ctx.app.log.info(`[QA] Starting execution loop...`);

    // Warmup: let entities stabilize
    await sim_step.call({ matchId, ticks: 10 }, ctx);

    // Fire the weapon
    try {
        ctx.app.log.info(`[QA] Attempting FireWeapon...`);
        await combat_fire.call({
            matchId,
            entityId: shooterId,
            mountIndex: 0,
            targetId
        }, ctx);
        ctx.app.log.info(`[QA] FireWeapon succeeded.`);
    } catch (err: any) {
        ctx.app.log.error(`[QA] FireWeapon failed: ${err.message}`);
        await sim_step.call({ matchId, ticks: 1 }, ctx);
        try {
            await combat_fire.call({
                matchId,
                entityId: shooterId,
                mountIndex: 0,
                targetId
            }, ctx);
            ctx.app.log.info(`[QA] FireWeapon succeeded on retry.`);
        } catch (retryErr: any) {
            ctx.app.log.error(`[QA] FireWeapon failed on retry: ${retryErr.message}`);
            outcome = `Fire Failed: ${retryErr.message}`;
        }
    }

    // Step simulation until resolved
    let ticks = 0;
    const maxTicks = 5000;
    while (ticks < maxTicks) {
        await sim_step.call({ matchId, ticks: 1 }, ctx);
        ticks++;

        if (ticks % 100 === 0) {
            ctx.app.log.info(`[QA] Sim Progress: ${ticks} ticks, outcome: ${outcome}, impacts: ${impacts.length}, active munitions: ${Array.from(world.getEntities()).filter(e => firedMunitions.has(e.id)).length}`);
        }

        if (outcome === 'Impact') break;

        const activeMunitions = Array.from(world.getEntities()).filter(e => firedMunitions.has(e.id));
        if (firedMunitions.size > 0 && activeMunitions.length === 0) {
            if (impacts.length === 0) outcome = 'Miss';
            ctx.app.log.info(`[QA] All munitions resolved. Outcome: ${outcome}`);
            break;
        }
    }
    ctx.app.log.info(`[QA] Simulation ended after ${ticks} ticks.`);

    if (ticks >= maxTicks && outcome === 'Running') outcome = 'Timeout';

    // 6. Calculate Metrics
    ctx.app.log.info(`[QA] Calculating metrics...`);
    let biasM = 0;
    let cep50M = 0;

    if (impacts.length > 0) {
        const mip = impacts.reduce((acc, pos) => ({
            x: acc.x + pos.x / impacts.length,
            y: acc.y + pos.y / impacts.length,
            z: acc.z + pos.z / impacts.length
        }), { x: 0, y: 0, z: 0 });

        const bias = {
            x: mip.x - targetPos.x,
            y: mip.y - targetPos.y,
            z: mip.z - targetPos.z
        };
        biasM = Math.sqrt(bias.x ** 2 + bias.y ** 2 + bias.z ** 2);

        const distances = impacts.map(pos => {
            return Math.sqrt((pos.x - mip.x) ** 2 + (pos.y - mip.y) ** 2 + (pos.z - mip.z) ** 2);
        });
        distances.sort((a, b) => a - b);
        cep50M = distances[Math.floor(distances.length * 0.5)] || 0;
    }

    let flightSamples: any[] = [];
    if (firstMunitionId) {
        const historyResponse = await history_get_entity_samples.call({
            batchId: matchId, // Fixed: use batchId
            entityId: firstMunitionId,
            sampleCount: 500
        }, ctx);
        flightSamples = historyResponse.samples || [];
        ctx.app.log.info(`[QA] Flight Data retrieved for ${firstMunitionId}: ${flightSamples.length} samples.`);
    }


    // 7. AI Agent Analysis
    ctx.app.log.info(`[QA] Invoking AI Agent...`);
    const agents = await ctx.app.agentService.listAgents();
    const agent = agents.find(a => a.name === 'Qa Analyst');
    
    if (!agent) {
        ctx.app.log.warn(`[QA] 'Qa Analyst' agent not found. Run 'npm run cli -- agent seed' to populate.`);
        throw new Error("QA Analyst agent not found. Please seed the agents first.");
    }

    const thread = await ctx.app.agentService.createThread({
        agentId: agent.id,
        matchId: matchId,
        name: `Analysis of ${input.weaponProfileId} Test`
    });

    const prompt = `
[WEAPON TEST RESULTS]
Weapon: ${input.weaponProfileId}
Outcome: ${outcome}
Range: ${input.rangeM}m
Impacts: ${JSON.stringify(impacts)}
Bias: ${biasM.toFixed(2)}m
CEP(50): ${cep50M.toFixed(2)}m
Ticks: ${ticks}
Flight Samples: ${flightSamples.length}

[TELEMETRY SUMMARY]
${flightSamples.slice(0, 5).map(f => `Tick ${f.tick}: ${JSON.stringify(f.position)}`).join('\n')}
...
${flightSamples.slice(-5).map(f => `Tick ${f.tick}: ${JSON.stringify(f.position)}`).join('\n')}

Please analyze these results for any logic errors or performance anomalies. 
Check if the weapon reached the target, if the accuracy is within expected parameters for this type of system, and if the simulation resolved correctly.
`;

    let agentAnalysis = "";
    for await (const event of ctx.app.agentService.runAgentStream(thread.id, prompt)) {
        if (event.type === 'content') {
            agentAnalysis += event.text;
        }
    }

    return {
        matchId,
        outcome,
        metrics: {
            impacts,
            biasM,
            cep50M,
            munitionsFired: firedMunitions.size
        },
        agentAnalysis
    };
});


