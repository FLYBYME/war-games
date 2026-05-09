import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema } from '../domain/primitives.schema.js';
import { TrackSchema, TrackStatusSchema, IdentificationStatusSchema } from '../domain/tactical.schema.js';

// ─── track_list ──────────────────────────────────────────────────────────────

export const TrackListInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    side: z.string().optional().describe("Filter tracks by side"),
    status: TrackStatusSchema.optional().describe("Filter by track status")
});

export const TrackListOutputSchema = z.object({
    tracks: z.array(TrackSchema).describe("Known tracks"),
    totalCount: z.number().describe("Total track count")
});

export const trackListContract = defineContract({
    domain: 'track',
    action: 'list',
    description: 'Retrieve all tracks known to a specific side.',
    inputSchema: TrackListInputSchema,
    outputSchema: TrackListOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/tracks' }
});

// ─── track_get ───────────────────────────────────────────────────────────────

export const TrackGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    trackId: z.string().describe("The track ID")
});

export const trackGetContract = defineContract({
    domain: 'track',
    action: 'get',
    description: 'Get detailed classification and position for a track.',
    inputSchema: TrackGetInputSchema,
    outputSchema: TrackSchema,
    rest: { method: 'GET', path: '/matches/:matchId/tracks/:trackId' }
});

// ─── track_update ────────────────────────────────────────────────────────────

export const TrackUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    trackId: z.string().describe("The track ID"),
    classification: z.string().optional().describe("Updated classification"),
    identification: IdentificationStatusSchema.optional().describe("Updated IFF"),
    confidence: z.number().min(0).max(1).optional().describe("Updated confidence")
});

export const trackUpdateContract = defineContract({
    domain: 'track',
    action: 'update',
    description: 'Update track classification or identification.',
    inputSchema: TrackUpdateInputSchema,
    outputSchema: TrackSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/tracks/:trackId' }
});

// ─── track_delete ────────────────────────────────────────────────────────────

export const TrackDeleteInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    trackId: z.string().describe("The track ID to remove")
});

export const TrackDeleteOutputSchema = z.object({
    success: z.boolean().describe("Whether the track was removed")
});

export const trackDeleteContract = defineContract({
    domain: 'track',
    action: 'delete',
    description: 'Remove a track from the operational picture.',
    inputSchema: TrackDeleteInputSchema,
    outputSchema: TrackDeleteOutputSchema,
    rest: { method: 'DELETE', path: '/matches/:matchId/tracks/:trackId' }
});
