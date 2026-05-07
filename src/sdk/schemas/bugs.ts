import * as Z from 'zod';

export const BugStatusSchema = Z.enum(['Open', 'InProgress', 'Resolved', 'Closed']);
export type BugStatus = Z.infer<typeof BugStatusSchema>;

export const BugSeveritySchema = Z.enum(['Low', 'Medium', 'High', 'Critical']);
export type BugSeverity = Z.infer<typeof BugSeveritySchema>;

export const BugCommentSchema = Z.object({
    id: Z.string(),
    author: Z.string(),
    text: Z.string(),
    timestamp: Z.number()
});
export type BugComment = Z.infer<typeof BugCommentSchema>;

export const BugReportSchema = Z.object({
    id: Z.string(),
    timestamp: Z.number(),
    matchId: Z.string(),
    side: Z.string(),
    title: Z.string(),
    description: Z.string(),
    worldState: Z.string().optional(),
    severity: BugSeveritySchema,
    suggestedFix: Z.string().optional(),
    status: BugStatusSchema,
    comments: Z.array(BugCommentSchema),
    relatedBugs: Z.array(Z.string())
});
export type BugReport = Z.infer<typeof BugReportSchema>;

export const CreateBugReportSchema = Z.object({
    matchId: Z.string().optional(),
    side: Z.string().optional(),
    title: Z.string(),
    description: Z.string(),
    worldState: Z.string().optional(),
    severity: BugSeveritySchema,
    suggestedFix: Z.string().optional()
});
export type CreateBugReport = Z.infer<typeof CreateBugReportSchema>;

export const UpdateBugReportSchema = Z.object({
    status: BugStatusSchema.optional(),
    addRelatedBug: Z.string().optional(),
    removeRelatedBug: Z.string().optional()
});
export type UpdateBugReport = Z.infer<typeof UpdateBugReportSchema>;

export const AddBugCommentSchema = Z.object({
    author: Z.string(),
    text: Z.string()
});
export type AddBugComment = Z.infer<typeof AddBugCommentSchema>;
