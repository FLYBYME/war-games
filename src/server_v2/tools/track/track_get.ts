import { defineTool } from '../../core/tool_builder.js';
import { trackGetContract } from '../../../sdk_v2/contracts/index.js';
import { TrackComponent } from '../../../engine/components/Track.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const track_get = defineTool(trackGetContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    if (!isMatchHandle(match)) {
        throw new Error(`Match handle is not a concrete MatchHandle`);
    }

    // Search across all entities to find the track
    for (const entity of match.world.getEntities()) {
        const trackComp = entity.getComponent(TrackComponent);
        if (trackComp) {
            const track = trackComp.tracks.get(input.trackId);
            if (track) {
                return track;
            }
        }
    }
    
    throw new Error(`Track not found: ${input.trackId}`);
});
