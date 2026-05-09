import { defineTool } from '../../core/tool_builder.js';
import { navGetContract } from '../../../sdk_v2/contracts/index.js';
import { NavigationComponent, FormationComponent } from '../../../engine/components/Navigation.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_get = defineTool(navGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const nav = entity.getComponent(NavigationComponent);
    const form = entity.getComponent(FormationComponent);

    return {
        entityId: entity.id,
        desiredSpeedKts: nav?.desiredSpeedKts || 0,
        desiredAltitudeM: nav?.desiredAltitudeM || 0,
        desiredHeading: nav?.desiredHeadingDeg || 0,
        autopilotMode: nav?.navState || 'None',
        waypoints: (nav?.waypoints || []).map((wp, i) => ({
            id: `wp-${i}`,
            position: wp.position,
            speedKts: wp.speedKts
        })),
        formationLeaderId: form?.leaderId,
        formationOffset: form?.stationOffset
    };
});
