import { defineTool } from '../../core/tool_builder.js';
import { mapCalculateDistanceContract } from '../../../sdk_v2/contracts/index.js';
import { Geodesy } from '../../../engine/math/Geodesy.js';
import { Physics } from '../../../engine/PhysicsConstants.js';

export const map_calculate_distance = defineTool(mapCalculateDistanceContract, async (input, ctx) => {
    const distanceM = Geodesy.haversineDistance(input.from, input.to);

    // Initial bearing calculation
    const lat1 = input.from.lat * Physics.DEG_TO_RAD;
    const lat2 = input.to.lat * Physics.DEG_TO_RAD;
    const dLon = (input.to.lon - input.from.lon) * Physics.DEG_TO_RAD;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearingDeg = Math.atan2(y, x) * Physics.RAD_TO_DEG;
    bearingDeg = (bearingDeg + 360) % 360;

    return {
        distanceM,
        distanceNM: distanceM / 1852,
        bearingDeg,
        reverseBearingDeg: (bearingDeg + 180) % 360
    };
});
