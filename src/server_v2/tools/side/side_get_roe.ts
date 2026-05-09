import { defineTool } from '../../core/tool_builder.js';
import { sideGetROEContract } from '../../../sdk_v2/contracts/index.js';
import { DoctrineComponent } from '../../../engine/components/Doctrine.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const side_get_roe = defineTool(sideGetROEContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Faction-wide state isn't centralized yet in the engine, so we'll 
    // use the first entity on this side as a proxy for side-wide doctrine.
    const entities = Array.from(handle.world.getEntities());
    const factionProxy = entities.find(e => e.side === input.side);

    if (!factionProxy) {
        // Return default if no entities are active on this side yet
        return {
            side: input.side as any,
            roe: 'Tight',
            emcon: 'Alpha'
        };
    }

    const doctrine = factionProxy.getComponent(DoctrineComponent);

    return {
        side: input.side as any,
        roe: doctrine?.roe || 'Tight',
        emcon: doctrine?.emcon || 'Alpha'
    };
});
