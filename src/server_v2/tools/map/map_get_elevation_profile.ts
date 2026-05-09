import { defineTool } from '../../core/tool_builder.js';
import { mapGetElevationProfileContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const map_get_elevation_profile = defineTool(mapGetElevationProfileContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const envSystem = handle.world.getSystem(EnvironmentSystem);
    if (!envSystem) throw new Error("EnvironmentSystem not found in world");

    const projection = envSystem.getProjection();

    // Convert start/end points to LLA
    const startLla = projection.project(input.from);
    const endLla = projection.project(input.to);

    // Sample the elevation profile
    const profile = await ctx.app.terrainService.getElevationProfile(
        startLla.lat, startLla.lon,
        endLla.lat, endLla.lon,
        input.samples
    );

    return {
        profile
    };
});
