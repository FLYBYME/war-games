import { defineTool } from '../../core/tool_builder.js';
import { envSetTimeContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const env_set_time = defineTool(envSetTimeContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Map hours (0-24) to a start tick or offset
    // For now, we'll just return the input value as the "current" state

    // Simple sun elevation model: peaks at 90 deg at noon (12:00), 0 deg at sunrise/sunset (6:00, 18:00)
    const normalizedHour = (input.hours + 6) % 24; // Shift so 12:00 is peak
    const sunElevationDeg = Math.max(0, 90 * Math.sin((input.hours - 6) * Math.PI / 12));

    return {
        hours: input.hours,
        sunElevationDeg
    };
});

