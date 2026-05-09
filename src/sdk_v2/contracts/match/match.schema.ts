import { z } from 'zod';

/**
 * MatchStatus: The operational state of a simulation match.
 */
export const MatchStatusSchema = z.enum([
    "initializing",
    "running",
    "paused",
    "finished"
]).describe("The operational state of a simulation match (initializing, running, paused, or finished)");

export type MatchStatus = z.infer<typeof MatchStatusSchema>;

/**
 * MatchWinType: The outcome classification of a match.
 */
export const MatchWinTypeSchema = z.enum([
    "red_victory",
    "blue_victory",
    "draw",
    "undetermined"
]).describe("The outcome classification of a match (red_victory, blue_victory, draw, or undetermined)");

export type MatchWinType = z.infer<typeof MatchWinTypeSchema>;

/**
 * Score: The quantitative performance metrics for both sides.
 */
export const ScoreSchema = z.object({
    blue: z.number().describe("Total points or performance metric for the Blue side"),
    red: z.number().describe("Total points or performance metric for the Red side"),
    munitionsExpended: z.number().describe("Total count of munitions expended during the match")
}).describe("The quantitative performance metrics for both sides");

export type Score = z.infer<typeof ScoreSchema>;

/**
 * Match: The primary data record representing a single simulation execution.
 */
export const MatchSchema = z.object({
    id: z.string().describe("The unique identifier for the match"),
    name: z.string().describe("The human-readable name of the match"),
    description: z.string().describe("A brief description of the match objectives or context"),
    status: MatchStatusSchema,
    winType: MatchWinTypeSchema,
    scenarioId: z.string().describe("The ID of the scenario template used for this match"),
    createdAt: z.date().describe("The timestamp when the match record was created"),
    updatedAt: z.date().describe("The timestamp when the match record was last updated"),
    currentTurn: z.number().describe("The current simulation turn or tick index"),
    maxTurns: z.number().describe("The maximum number of turns before the match automatically ends"),
    winReason: z.string().describe("A detailed explanation of the win condition or termination cause"),
    score: ScoreSchema
}).describe("The primary data record representing a single simulation execution");

export type Match = z.infer<typeof MatchSchema>;
