import { defineTool } from '../../core/tool_builder.js';
import { mapUpdateZoneContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';
import { TacticalZone } from '../../../sdk_v2/contracts/map/map.contracts.js';

export const map_update_zone = defineTool(mapUpdateZoneContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const zone = handle.zones.get(input.zoneId) as TacticalZone;
    if (!zone) throw new Error(`Zone not found: ${input.zoneId}`);

    if (input.name) zone.name = input.name;
    if (input.points) zone.points = input.points;
    if (input.minAltM !== undefined) zone.minAltM = input.minAltM;
    if (input.maxAltM !== undefined) zone.maxAltM = input.maxAltM;

    return zone;
});

