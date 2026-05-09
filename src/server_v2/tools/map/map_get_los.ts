import { defineTool } from '../../core/tool_builder.js';
import { mapGetLOSContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const map_get_los = defineTool(mapGetLOSContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const envSystem = handle.world.getSystem(EnvironmentSystem);
    if (!envSystem) throw new Error("EnvironmentSystem not found in world");

    const projection = envSystem.getProjection();

    // Convert start/end points to LLA
    const startLla = projection.project(input.from);
    const endLla = projection.project(input.to);

    // Number of samples based on distance (roughly every 500m)
    const dx = input.to.x - input.from.x;
    const dy = input.to.y - input.from.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    const samples = Math.max(10, Math.ceil(distance / 500));

    // Sample the elevation profile
    const profile = await ctx.app.terrainService.getElevationProfile(
        startLla.lat, startLla.lon,
        endLla.lat, endLla.lon,
        samples
    );

    let hasLos = true;
    let obstructionPoint = undefined;

    // Check for masking
    // Start and end heights are from.z and to.z
    for (let i = 0; i < profile.length; i++) {
        const t = i / (profile.length - 1);
        const lineAlt = input.from.z + (input.to.z - input.from.z) * t;
        const terrainAlt = profile[i];

        if (terrainAlt > lineAlt) {
            hasLos = false;
            obstructionPoint = {
                x: input.from.x + dx * t,
                y: input.from.y + dy * t,
                z: terrainAlt
            };
            break;
        }
    }

    const bearingDeg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;

    return {
        hasLOS: hasLos,
        bearingDeg,
        distanceM: distance,
        terrainMaskPoints: obstructionPoint ? [obstructionPoint] : []
    };
});

