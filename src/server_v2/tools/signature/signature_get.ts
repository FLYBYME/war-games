import { defineTool } from '../../core/tool_builder.js';
import { signatureGetContract } from '../../../sdk_v2/contracts/index.js';
import { RCSComponent } from '../../../engine/components/Signatures.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const signature_get = defineTool(signatureGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const rcs = entity.getComponent(RCSComponent);

    return {
        entityId: entity.id,
        baseRCS: rcs?.baseRCS || 5.0,
        effectiveRCS: rcs?.baseRCS || 5.0, // Simplification: assume effective = base for now
        frontalMultiplier: rcs?.frontalMultiplier || 1.0,
        sideMultiplier: rcs?.sideMultiplier || 1.0,
        rearMultiplier: rcs?.rearMultiplier || 1.0,
        bandMultipliers: rcs ? Array.from(rcs.bandMultipliers.entries()).map(([band, multiplier]) => ({
            band: band as any,
            multiplier
        })) : [],
        acousticSL: 0 // Placeholder for acoustic source level
    };
});
