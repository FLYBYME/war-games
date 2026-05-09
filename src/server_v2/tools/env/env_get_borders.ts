import { defineTool } from '../../core/tool_builder.js';
import { envGetBordersContract } from '../../../sdk_v2/contracts/index.js';

export const env_get_borders = defineTool(envGetBordersContract, async (input, ctx) => {
    return {
        borders: {
            type: 'FeatureCollection' as const,
            features: []
        },
        bathymetry: {
            type: 'FeatureCollection' as const,
            features: []
        }
    };
});

