import { defineTool } from '../../core/tool_builder.js';
import { navListWaypointsContract } from '../../../sdk_v2/contracts/index.js';
import { NavigationComponent } from '../../../engine/components/Navigation.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_list_waypoints = defineTool(navListWaypointsContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const nav = entity.getComponent(NavigationComponent);

    return {
        waypoints: (nav?.waypoints || []).map((wp, i) => ({
            id: `wp-${i}`,
            position: wp.position,
            speedKts: wp.speedKts
        }))
    };
});

