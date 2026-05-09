import { defineTool } from '../../core/tool_builder.js';
import { automationTriggerEventContract } from '../../../sdk_v2/contracts/index.js';
import { ScenarioAutomationSystem } from '../../../engine/systems/ScenarioAutomationSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const automation_trigger_event = defineTool(automationTriggerEventContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const autoSystem = handle.world.getSystem(ScenarioAutomationSystem);
    if (!autoSystem) throw new Error("ScenarioAutomationSystem not found in world");

    const events = (autoSystem as any).events || [];
    const eventIndex = events.findIndex((e: any) => e.id === input.eventId);

    if (eventIndex === -1) throw new Error(`Event not found: ${input.eventId}`);

    const event = events.splice(eventIndex, 1)[0];
    (autoSystem as any).triggeredEvents.push(event);

    return {
        success: true
    };
});
