import { defineTool } from '../../core/tool_builder.js';
import { trackDeleteContract } from '../../../sdk_v2/contracts/index.js';
import { TrackComponent } from '../../../engine/components/Track.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const track_delete = defineTool(trackDeleteContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    let found = false;

    for (const entity of handle.world.getEntities()) {
        const trackComp = entity.getComponent(TrackComponent);
        if (trackComp) {
            if (trackComp.tracks.has(input.trackId)) {
                trackComp.tracks.delete(input.trackId);
                found = true;
            }
        }
    }

    return { success: found };
});
