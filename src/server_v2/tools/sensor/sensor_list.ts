import { defineTool } from '../../core/tool_builder.js';
import { sensorListContract } from '../../../sdk_v2/contracts/index.js';
import { SensorComponent } from '../../../engine/components/Sensors.js';
import { DoctrineComponent } from '../../../engine/components/Doctrine.js';
import { EMCONState } from '../../../engine/core/Types.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const sensor_list = defineTool(sensorListContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    if (!isMatchHandle(match)) {
        throw new Error(`Match handle is not a concrete MatchHandle`);
    }

    const entity = match.world.getEntity(input.entityId);
    
    if (!entity) {
        throw new Error(`Entity not found: ${input.entityId}`);
    }

    const sensorComponents = entity.getComponents(SensorComponent);
    const doctrine = entity.getComponent(DoctrineComponent);

    return {
        sensors: sensorComponents.map((s, index) => ({
            index,
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
        })),
        emconState: doctrine?.emcon || EMCONState.Alpha
    };
});
