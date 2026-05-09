import { defineTool } from '../../core/tool_builder.js';
import { signatureUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { RCSComponent } from '../../../engine/components/Signatures.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const signature_update = defineTool(signatureUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    let rcs = entity.getComponent(RCSComponent);
    if (!rcs) {
        rcs = new RCSComponent();
        entity.addComponent(rcs);
    }

    if (input.baseRCS !== undefined) rcs.baseRCS = input.baseRCS;
    if (input.frontalMultiplier !== undefined) rcs.frontalMultiplier = input.frontalMultiplier;

    return {
        entityId: entity.id,
        baseRCS: rcs.baseRCS,
        effectiveRCS: rcs.baseRCS,
        frontalMultiplier: rcs.frontalMultiplier,
        sideMultiplier: rcs.sideMultiplier,
        rearMultiplier: rcs.rearMultiplier,
        bandMultipliers: Array.from(rcs.bandMultipliers.entries()).map(([band, multiplier]) => ({
            band: band as any,
            multiplier
        })),
        acousticSL: input.acousticSL
    };
});
