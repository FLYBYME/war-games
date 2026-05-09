import { defineTool } from '../../core/tool_builder.js';
import { envUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const env_update = defineTool(envUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const envSystem = handle.world.getSystem(EnvironmentSystem);
    if (!envSystem) throw new Error("EnvironmentSystem not found in world");

    // Update global weather parameters
    if (input.windSpeedKts !== undefined) envSystem.globalWeather.windSpeedKts = input.windSpeedKts;
    if (input.windDirDeg !== undefined) envSystem.globalWeather.windDirDeg = input.windDirDeg;
    if (input.seaState !== undefined) envSystem.globalWeather.seaState = input.seaState;
    if (input.visibilityNM !== undefined) envSystem.globalWeather.visibilityNM = input.visibilityNM;
    if (input.precipitationRateMMhr !== undefined) envSystem.globalWeather.precipitationRateMMhr = input.precipitationRateMMhr;
    if (input.cloudCover !== undefined) envSystem.globalWeather.cloudCover = input.cloudCover;
    if (input.temperatureC !== undefined) envSystem.globalWeather.temperatureC = input.temperatureC;

    return {
        weather: {
            ...envSystem.globalWeather
        },
        oceanography: {
            waterTemperatureC: 15,
            salinityPPT: 35,
            soundSpeedMPS: 1500,
            layerDepthM: 100,
            seaState: envSystem.globalWeather.seaState
        },
        simulationTimeHours: (handle.world.currentTick % (24 * 3600)) / 3600,
        sunElevationDeg: 45
    };
});
