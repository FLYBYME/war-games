import { defineTool } from '../../core/tool_builder.js';
import { envGetContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const env_get = defineTool(envGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const envSystem = handle.world.getSystem(EnvironmentSystem);
    if (!envSystem) throw new Error("EnvironmentSystem not found in world");

    return {
        weather: {
            ...envSystem.globalWeather
        },
        oceanography: {
            waterTemperatureC: 15, // Default values as system doesn't store global oceanography yet
            salinityPPT: 35,
            soundSpeedMPS: 1500,
            layerDepthM: 100,
            seaState: envSystem.globalWeather.seaState
        },
        simulationTimeHours: (handle.world.currentTick % (24 * 3600)) / 3600, // Very simple clock mapping
        sunElevationDeg: 45 // Placeholder
    };
});
