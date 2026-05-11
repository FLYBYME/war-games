import { defineTool } from '../../core/tool_builder.js';
import { automationListEventsContract } from '../../../sdk_v2/contracts/index.js';
import { ScenarioAutomationSystem } from '../../../engine/systems/ScenarioAutomationSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const automation_list_events = defineTool(automationListEventsContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const autoSystem = handle.world.getSystem(ScenarioAutomationSystem);
    if (!autoSystem) throw new Error("ScenarioAutomationSystem not found in world");

    // Use public methods to access events
    const events = autoSystem.getPendingEvents();
    const triggered = autoSystem.getTriggeredEvents();

    const result = [
        ...events.map(e => ({
            id: e.id || `evt-${e.tick}`,
            description: e.description || `Event at tick ${e.tick}`,
            status: 'Pending' as const
        })),
        ...triggered.map(e => ({
            id: e.id || `evt-${e.tick}`,
            description: e.description || `Event at tick ${e.tick}`,
            status: 'Triggered' as const
        }))
    ];

    return {
        events: result
    };
});
