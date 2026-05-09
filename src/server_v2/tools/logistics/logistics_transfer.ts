import { defineTool } from '../../core/tool_builder.js';
import { logisticsTransferContract } from '../../../sdk_v2/contracts/index.js';
import { TransferResourcesCommand } from '../../../engine/core/Command.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const logistics_transfer = defineTool(logisticsTransferContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new TransferResourcesCommand(
        input.fromId,
        input.toId,
        input.fuelKg,
        new Map() // No ammo updates in this tool yet
    ));

    const from = handle.world.getEntity(input.fromId);
    const to = handle.world.getEntity(input.toId);
    const fromFuel = from?.getComponent(FuelComponent);
    const toFuel = to?.getComponent(FuelComponent);

    return {
        success: true,
        fromFuelKg: (fromFuel?.currentKg || 0) - input.fuelKg,
        toFuelKg: (toFuel?.currentKg || 0) + input.fuelKg
    };
});
