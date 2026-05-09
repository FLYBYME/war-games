import { defineTool } from '../../core/tool_builder.js';
import { sensorUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { SensorComponent } from '../../../engine/components/Sensors.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const sensor_update = defineTool(sensorUpdateContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    if (!isMatchHandle(match)) {
        throw new Error(`Match handle is not a concrete MatchHandle`);
    }

    const entity = match.world.getEntity(input.entityId);
    
    if (!entity) {
        throw new Error(`Entity not found: ${input.entityId}`);
    }

    const sensorComponents = entity.getComponents(SensorComponent);
    if (input.index < 0 || input.index >= sensorComponents.length) {
        throw new Error(`Sensor index ${input.index} out of bounds (0-${sensorComponents.length - 1})`);
    }

    const s = sensorComponents[input.index];
    if (!s) {
        throw new Error(`Sensor at index ${input.index} is null`);
    }

    if (input.isActive !== undefined) s.isActive = input.isActive;
    if (input.mode !== undefined) s.mode = input.mode;

    return {
        index: input.index,
        name: s.name,
        type: s.sensorType,
        band: s.band,
        mode: s.mode,
        isActive: s.isActive,
        maxRangeM: s.maxRangeM,
        currentAzimuth: s.currentAzimuth,
        halfArcDeg: s.beamWidthDeg / 2,
        txPowerKw: s.txPowerKw,
        detectionCount: 0
    };
});
