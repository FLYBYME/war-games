import { defineTool } from '../../core/tool_builder.js';
import { mapGetOverlayContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_overlay = defineTool(mapGetOverlayContract, async (input, ctx) => {
    // Placeholder GeoJSON
    return {
        id: input.overlayId,
        name: `Overlay ${input.overlayId}`,
        geojson: {
            type: 'FeatureCollection' as const,
            features: []
        }
    };
});

