import { defineTool } from '../../core/tool_builder.js';
import { ewGetSIGINTContract } from '../../../sdk_v2/contracts/index.js';
import { SIGINTComponent } from '../../../engine/components/ElectronicWarfare.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const ew_get_sigint = defineTool(ewGetSIGINTContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const sigint = entity.getComponent(SIGINTComponent);

    return {
        sensitivityDBm: sigint?.sensitivityDBm || -120,
        detectedEmitters: [] // Logic for localized SIGINT detections not in component yet
    };
});
