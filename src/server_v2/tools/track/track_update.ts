import { defineTool } from '../../core/tool_builder.js';
import { trackUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { TrackComponent } from '../../../engine/components/Track.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const track_update = defineTool(trackUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    let updatedTrack: any = null;

    for (const entity of handle.world.getEntities()) {
        const trackComp = entity.getComponent(TrackComponent);
        if (trackComp) {
            const track = trackComp.tracks.get(input.trackId);
            if (track) {
                if (input.classification) track.classification = input.classification;
                if (input.identification) track.identification = input.identification as any;
                if (input.confidence !== undefined) track.confidence = input.confidence;
                updatedTrack = track;
            }
        }
    }

    if (!updatedTrack) throw new Error(`Track ${input.trackId} not found`);

    return updatedTrack;
});
