import { defineTool } from '../../core/tool_builder.js';
import { mapConvertCoordinatesContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { Geodesy } from '../../../engine/math/Geodesy.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const map_convert = defineTool(mapConvertCoordinatesContract, async (input, ctx) => {
    // If no matchId provided, we can't use a projection (ENU depends on origin)
    // For now, we'll try to get the projection from a default match or throw
    // Wait, the contract doesn't have matchId?
    // Let's check the contract again.
    
    // Ah, MapConvertCoordinatesInputSchema does NOT have matchId.
    // So it's a global utility. 
    // ENU conversion will require the 'origin' parameter in the input.

    let result: any = {};

    if (input.from === 'LLA' && input.to === 'ECEF') {
        result.position = Geodesy.llaToEcef(input.position);
    } else if (input.from === 'ECEF' && input.to === 'LLA') {
        result.position = Geodesy.ecefToLla(input.position);
    } else if (input.from === 'LLA' && input.to === 'ENU') {
        if (!input.origin) throw new Error("Origin LLA required for ENU conversion");
        const ecef = Geodesy.llaToEcef(input.position);
        result.position = Geodesy.ecefToEnu(ecef, input.origin);
    } else if (input.from === 'ENU' && input.to === 'LLA') {
        if (!input.origin) throw new Error("Origin LLA required for ENU conversion");
        const ecef = Geodesy.enuToEcef(input.position, input.origin);
        result.position = Geodesy.ecefToLla(ecef);
    } else {
        throw new Error(`Conversion from ${input.from} to ${input.to} not supported`);
    }

    return result;
});
