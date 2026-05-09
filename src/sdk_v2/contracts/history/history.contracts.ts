import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { KinematicSnapshotSchema } from '../domain/primitives.schema.js';

// ─── history_list_telemetry ──────────────────────────────────────────────────

export const HistoryListTelemetryInputSchema = z.object({
    batchId: z.string().describe("Batch/run identifier"),
    entityId: z.string().describe("Entity ID to query"),
    startTick: z.number().optional().describe("Start tick for range query"),
    endTick: z.number().optional().describe("End tick for range query")
});

export const HistoryListTelemetryOutputSchema = z.object({
    snapshots: z.array(KinematicSnapshotSchema).describe("Telemetry time series"),
    totalCount: z.number().describe("Total snapshot count")
});

export const historyListTelemetryContract = defineContract({
    domain: 'history',
    action: 'list_telemetry',
    description: 'Fetch time-series position and state data for a unit.',
    inputSchema: HistoryListTelemetryInputSchema,
    outputSchema: HistoryListTelemetryOutputSchema,
    rest: { method: 'GET', path: '/history/:batchId/telemetry/:entityId' }
});

// ─── history_get_heatmap ─────────────────────────────────────────────────────

export const HistoryGetHeatmapInputSchema = z.object({
    batchId: z.string().describe("Batch/run identifier"),
    entityType: z.string().optional().describe("Filter by entity type"),
    gridSizeM: z.number().optional().default(100).describe("Grid cell size in meters")
});

export const HistoryGetHeatmapOutputSchema = z.object({
    cells: z.array(z.object({
        gridX: z.number().describe("Grid cell X"),
        gridY: z.number().describe("Grid cell Y"),
        density: z.number().describe("Observation density")
    })).describe("Heatmap grid cells")
});

export const historyGetHeatmapContract = defineContract({
    domain: 'history',
    action: 'get_heatmap',
    description: 'Generate spatial density maps from telemetry data.',
    inputSchema: HistoryGetHeatmapInputSchema,
    outputSchema: HistoryGetHeatmapOutputSchema,
    rest: { method: 'GET', path: '/history/:batchId/heatmap' }
});

// ─── history_list_events ─────────────────────────────────────────────────────

export const HistoryListEventsInputSchema = z.object({
    batchId: z.string().describe("Batch/run identifier"),
    eventType: z.string().optional().describe("Filter by event type"),
    startTick: z.number().optional().describe("Start tick"),
    endTick: z.number().optional().describe("End tick")
});

export const HistoryListEventsOutputSchema = z.object({
    events: z.array(z.object({
        tick: z.number().describe("Event tick"),
        type: z.string().describe("Event type"),
        entityId: z.string().optional().describe("Primary entity"),
        targetId: z.string().optional().describe("Secondary entity"),
        data: z.record(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Event data")
    })).describe("Discrete simulation events"),
    totalCount: z.number().describe("Total events")
});

export const historyListEventsContract = defineContract({
    domain: 'history',
    action: 'list_events',
    description: 'List all discrete simulation events for a batch.',
    inputSchema: HistoryListEventsInputSchema,
    outputSchema: HistoryListEventsOutputSchema,
    rest: { method: 'GET', path: '/history/:batchId/events' }
});

// ─── history_get_losses ──────────────────────────────────────────────────────

export const HistoryGetLossesInputSchema = z.object({
    batchId: z.string().describe("Batch/run identifier")
});

export const HistoryGetLossesOutputSchema = z.object({
    blueLosses: z.number().describe("Blue side losses"),
    redLosses: z.number().describe("Red side losses"),
    lossExchangeRatio: z.number().describe("Loss exchange ratio (Blue/Red)"),
    munitionsExpended: z.number().describe("Total munitions expended"),
    breakdown: z.array(z.object({
        entityId: z.string().describe("Destroyed entity ID"),
        side: z.string().describe("Side"),
        destroyedAtTick: z.number().describe("Tick of destruction"),
        cause: z.string().describe("Cause of loss")
    })).describe("Loss breakdown")
});

export const historyGetLossesContract = defineContract({
    domain: 'history',
    action: 'get_losses',
    description: 'Calculate attrition rates and loss-exchange ratios.',
    inputSchema: HistoryGetLossesInputSchema,
    outputSchema: HistoryGetLossesOutputSchema,
    rest: { method: 'GET', path: '/history/:batchId/losses' }
});

// ─── history_aggregate_metrics ───────────────────────────────────────────────

export const HistoryAggregateMetricsInputSchema = z.object({
    batchId: z.string().describe("Batch/run identifier"),
    metric: z.enum(['pk', 'survivability', 'engagement_range', 'time_to_kill']).describe("Metric type")
});

export const HistoryAggregateMetricsOutputSchema = z.object({
    metric: z.string().describe("Metric name"),
    mean: z.number().describe("Mean value"),
    median: z.number().describe("Median value"),
    stdDev: z.number().describe("Standard deviation"),
    min: z.number().describe("Minimum value"),
    max: z.number().describe("Maximum value"),
    sampleSize: z.number().describe("Number of observations")
});

export const historyAggregateMetricsContract = defineContract({
    domain: 'history',
    action: 'aggregate_metrics',
    description: 'Compute statistical KPIs across simulation runs.',
    inputSchema: HistoryAggregateMetricsInputSchema,
    outputSchema: HistoryAggregateMetricsOutputSchema,
    rest: { method: 'GET', path: '/history/:batchId/metrics' }
});
