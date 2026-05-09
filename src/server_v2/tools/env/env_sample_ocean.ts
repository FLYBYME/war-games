import { defineTool } from '../../core/tool_builder.js';
import { envSampleOceanContract } from '../../../sdk_v2/contracts/index.js';

export const env_sample_ocean = defineTool(envSampleOceanContract, async (input, ctx) => {
    const depth = input.depthM;
    const S = 35; // Default salinity
    let T = 15;

    // SSP Model from EnvironmentSystem
    if (depth <= 100) {
        T = 15; 
    } else if (depth <= 1000) {
        T = 15 - (depth - 100) * (11 / 900); 
    } else {
        T = 4;
    }

    // Mackenzie Equation
    const soundSpeedMPS = 1448.96 + (4.591 * T) - (0.05304 * T * T) + (1.34 * (S - 35)) + (0.0163 * depth);

    return {
        temperatureC: T,
        salinityPPT: S,
        soundSpeedMPS,
        layerDepthM: 100, // Surface duct depth
        isAboveLayer: depth <= 100
    };
});

