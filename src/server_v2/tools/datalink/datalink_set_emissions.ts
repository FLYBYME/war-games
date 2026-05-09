import { defineTool } from '../../core/tool_builder.js';
import { datalinkSetEmissionsContract } from '../../../sdk_v2/contracts/index.js';
import { DatalinkComponent } from '../../../engine/components/Datalink.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const datalink_set_emissions = defineTool(datalinkSetEmissionsContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const datalink = entity.getComponent(DatalinkComponent);
    if (!datalink) throw new Error(`Entity ${input.entityId} has no DatalinkComponent`);

    if (input.isActive !== undefined) datalink.isActive = input.isActive;
    if (input.canTransmit !== undefined) datalink.canTransmit = input.canTransmit;
    if (input.canReceive !== undefined) datalink.canReceive = input.canReceive;

    return {
        entityId: entity.id,
        networkId: datalink.networkId,
        isActive: datalink.isActive,
        canTransmit: datalink.canTransmit,
        canReceive: datalink.canReceive,
        latencyMs: datalink.latencyTicks * 100,
        queueDepth: datalink.incomingQueue.length
    };
});
