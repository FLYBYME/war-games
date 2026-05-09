import { defineTool } from '../../core/tool_builder.js';
import { ewGetJammerContract } from '../../../sdk_v2/contracts/index.js';
import { JammerComponent } from '../../../engine/components/ElectronicWarfare.js';
import { EMBand } from '../../../engine/core/Types.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const ew_get_jammer = defineTool(ewGetJammerContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const jammer = entity.getComponent(JammerComponent);
    if (!jammer) throw new Error(`Entity ${input.entityId} has no JammerComponent`);

    // Frequency to Band mapping
    let band = EMBand.X;
    const ghz = jammer.frequencyHz / 1e9;
    if (ghz < 2) band = EMBand.L;
    else if (ghz < 4) band = EMBand.S;
    else if (ghz < 8) band = EMBand.C;
    else if (ghz < 12) band = EMBand.X;
    else band = EMBand.Ku;

    return {
        isActive: jammer.isActive,
        mode: jammer.mode as any,
        jammerType: jammer.jammerType as any,
        powerKw: jammer.powerWatts / 1000,
        bandwidthMhz: jammer.bandwidthHz / 1e6,
        band,
        targetId: jammer.targetId
    };
});
