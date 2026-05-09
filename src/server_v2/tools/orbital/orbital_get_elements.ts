import { defineTool } from '../../core/tool_builder.js';
import { orbitalGetContract } from '../../../sdk_v2/contracts/index.js';
import { OrbitalComponent } from '../../../engine/components/Orbital.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const orbital_get_elements = defineTool(orbitalGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const orb = entity.getComponent(OrbitalComponent);
    if (!orb) throw new Error(`Entity ${input.entityId} has no OrbitalComponent`);

    return {
        entityId: entity.id,
        semiMajorAxisKm: orb.semiMajorAxisM / 1000,
        eccentricity: orb.eccentricity,
        inclinationDeg: orb.inclinationDeg,
        raanDeg: orb.rightAscensionAscNodeDeg,
        argumentOfPerigeeDeg: 0,
        meanAnomalyDeg: orb.meanAnomalyAtEpochDeg,
        epochTick: orb.epochTick
    };
});
