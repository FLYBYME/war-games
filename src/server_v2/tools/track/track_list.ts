import { defineTool } from '../../core/tool_builder.js';
import { trackListContract } from '../../../sdk_v2/contracts/index.js';
import { TrackComponent } from '../../../engine/components/Track.js';
import { Track } from '../../../engine/core/Types.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const track_list = defineTool(trackListContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    if (!isMatchHandle(match)) {
        throw new Error(`Match handle is not a concrete MatchHandle`);
    }

    const sideTracks = new Map<string, Track>();
    
    for (const entity of match.world.getEntities()) {
        // If side is provided, filter by entity side
        if (input.side && entity.side !== input.side) continue;
        
        const trackComp = entity.getComponent(TrackComponent);
        if (trackComp) {
            for (const track of trackComp.tracks.values()) {
                if (input.status && track.status !== input.status) continue;
                
                const existing = sideTracks.get(track.id);
                if (!existing || track.confidence > existing.confidence) {
                    sideTracks.set(track.id, track);
                }
            }
        }
    }
    
    const tracks = Array.from(sideTracks.values());
    
    return {
        tracks,
        totalCount: tracks.length
    };
});
