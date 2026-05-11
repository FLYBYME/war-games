import { MatchHandle } from '../src/server_v2/services/MatchService.js';
import { Side } from '../src/engine/core/Types.js';
import { SpawnEntityCommand } from '../src/engine/core/Command.js';

async function runProfile(entityCount: number, ticks: number) {
    console.log(`Starting real server memory profile with ${entityCount} entities for ${ticks} ticks`);
    
    // Create a real MatchHandle which initializes ParquetService and all server-side systems
    const handle = new MatchHandle('test-leak-match', 'Leak Test', 'scen-1');
    const world = handle.world;
    
    // Register a dummy aircraft profile
    world.profileRegistry.register('test-profile', {
        type: 'Aircraft',
        health: { maxHp: 100 },
        kinematics: { maxSpeedKts: 300, massKg: 1000 },
    });

    for (let i = 0; i < entityCount; i++) {
        const id = `entity-${i}`;
        handle.world.profileRegistry.register(`inline-${id}`, {
            type: 'Aircraft',
            health: { maxHp: 100 },
            kinematics: { maxSpeedKts: 300, massKg: 1000 },
        });

        // Use spawn manually since EntityManager is not directly exposed on MatchHandle 
        // but we can queue the SpawnEntityCommand which the server supports
        // Actually, World.ts has a system for SpawnEntityCommand
        world.queueExternalCommand(new SpawnEntityCommand(
            id,
            `inline-${id}`,
            Side.Blue,
            { x: Math.random() * 1000, y: Math.random() * 1000, z: 1000 },
            0,
            200
        ));
    }

    // Force garbage collection if we run node with --expose-gc
    if (global.gc) {
        global.gc();
    }

    const startMemory = process.memoryUsage();
    console.log(`Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    for (let i = 0; i <= ticks; i++) {
        await world.tick(0.1);
        if (i % 1000 === 0 && i > 0) {
            if (global.gc) global.gc();
            const currentMem = process.memoryUsage();
            console.log(`Tick ${i} memory: ${(currentMem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
        }
    }

    if (global.gc) global.gc();
    const endMemory = process.memoryUsage();
    console.log(`Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory growth: ${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

    // Clean up
    if (handle.telemetryWriter) await handle.telemetryWriter.close();
    if (handle.eventWriter) await handle.eventWriter.close();
}

const argEntities = parseInt(process.argv[2] || '100', 10);
const argTicks = parseInt(process.argv[3] || '5000', 10);

runProfile(argEntities, argTicks).catch(console.error);
