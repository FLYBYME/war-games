import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Automation Results ──────────────────────────────────────────────────────

export const AssertionResultSchema = z.object({
    id: z.string().describe("Assertion ID"),
    description: z.string().describe("Assertion goal"),
    passed: z.boolean().describe("Whether goal was achieved"),
    failReason: z.string().optional().describe("Why assertion failed")
}).describe("Pass/Fail result of a scenario assertion");

// ─── automation_list_events ──────────────────────────────────────────────────

export const AutomationListEventsInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const AutomationListEventsOutputSchema = z.object({
    events: z.array(z.object({
        id: z.string().describe("Scenario event ID"),
        description: z.string().describe("Event summary"),
        status: z.enum(['Pending', 'Triggered', 'Cancelled']).describe("Event execution state")
    })).describe("Scripted scenario events")
});

export const automationListEventsContract = defineContract({
    domain: 'automation',
    action: 'list_events',
    description: 'List all scripted events defined in the scenario.',
    inputSchema: AutomationListEventsInputSchema,
    outputSchema: AutomationListEventsOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/automation/events' }
});

// ─── automation_trigger_event ────────────────────────────────────────────────

export const AutomationTriggerEventInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    eventId: z.string().describe("ID of the event to force-trigger")
});

export const AutomationTriggerEventOutputSchema = z.object({ 
    success: z.boolean().describe("Whether the event was triggered")
});

export const automationTriggerEventContract = defineContract({
    domain: 'automation',
    action: 'trigger_event',
    description: 'Force-trigger a scenario event, bypassing conditions.',
    inputSchema: AutomationTriggerEventInputSchema,
    outputSchema: AutomationTriggerEventOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/automation/events/:eventId/trigger' }
});

// ─── automation_get_results ──────────────────────────────────────────────────

export const AutomationGetResultsInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const AutomationGetResultsOutputSchema = z.object({
    assertions: z.array(AssertionResultSchema).describe("Assertion outcomes")
});

export const automationGetResultsContract = defineContract({
    domain: 'automation',
    action: 'get_results',
    description: 'Retrieve pass/fail results for scenario assertions.',
    inputSchema: AutomationGetResultsInputSchema,
    outputSchema: AutomationGetResultsOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/automation/assertions' }
});
