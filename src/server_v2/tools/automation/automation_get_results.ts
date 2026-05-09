import { defineTool } from '../../core/tool_builder.js';
import { automationGetResultsContract } from '../../../sdk_v2/contracts/index.js';
import { ScenarioAutomationSystem } from '../../../engine/systems/ScenarioAutomationSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const automation_get_results = defineTool(automationGetResultsContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const autoSystem = handle.world.getSystem(ScenarioAutomationSystem);
    if (!autoSystem) throw new Error("ScenarioAutomationSystem not found in world");

    return {
        assertions: autoSystem.getResults().map(r => ({
            id: r.type, // Map type to ID for now
            description: r.message,
            passed: r.success,
            failReason: r.success ? undefined : r.message
        }))
    };
});
