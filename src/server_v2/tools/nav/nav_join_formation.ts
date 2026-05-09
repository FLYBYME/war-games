import { defineTool } from '../../core/tool_builder.js';
import { navJoinFormationContract } from '../../../sdk_v2/contracts/index.js';
import { JoinFormationCommand } from '../../../engine/core/Command.js';
import { NavigationComponent, FormationComponent } from '../../../engine/components/Navigation.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_join_formation = defineTool(navJoinFormationContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new JoinFormationCommand(
        input.entityId,
        input.leaderId,
        input.offset
    ));

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
        formationLeaderId: input.leaderId,
        formationOffset: input.offset
    };
});

