import { defineTool } from '../../core/tool_builder.js';
import { navAddWaypointContract } from '../../../sdk_v2/contracts/index.js';
import { AddWaypointCommand } from '../../../engine/core/Command.js';
import { NavigationComponent } from '../../../engine/components/Navigation.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_add_waypoint = defineTool(navAddWaypointContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new AddWaypointCommand(
        input.entityId,
        input.position,
        input.speedKts
    ));

    const nav = entity.getComponent(NavigationComponent);

    // Return waypoints (+ the one we just added for immediate UI feedback, 
    // though the command processor will add it properly on next tick)
    const waypoints = (nav?.waypoints || []).map((wp, i) => ({
        id: `wp-${i}`,
        position: wp.position,
        speedKts: wp.speedKts
    }));

    waypoints.push({
        id: `wp-${waypoints.length}`,
        position: input.position,
        speedKts: input.speedKts
    });

    return { waypoints };
});

