import { defineTool } from '../../core/tool_builder.js';
import { mapCreateZoneContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';
import { randomUUID } from 'crypto';

export const map_create_zone = defineTool(mapCreateZoneContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const id = randomUUID();
    const zone = {
        id,
        name: input.name,
        type: input.type,
        points: input.points,
        isActive: true,
        minAltM: input.minAltM,
        maxAltM: input.maxAltM
    };

    handle.zones.set(id, zone);

    return zone;
});

