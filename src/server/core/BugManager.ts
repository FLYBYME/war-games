import * as fs from 'fs';
import * as path from 'path';
import { BugReport, CreateBugReport, UpdateBugReport, AddBugComment, BugComment } from '../../sdk/schemas/bugs.js';
import { Logger } from '../../sdk/Logger.js';

export class BugManager {
    private bugs: Map<string, BugReport> = new Map();
    private readonly filePath: string;
    private readonly logger: Logger;

    constructor(logger: Logger, filePath: string = 'bug_reports.jsonl') {
        this.logger = logger;
        this.filePath = path.resolve(process.cwd(), filePath);
    }

    public async init(): Promise<void> {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.logger.info(`Bug report file not found at ${this.filePath}, creating new.`);
                fs.writeFileSync(this.filePath, '');
                return;
            }

            const content = await fs.promises.readFile(this.filePath, 'utf-8');
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line) as Partial<BugReport>;
                    
                    // Normalize legacy bugs to the new schema
                    const bug: BugReport = {
                        id: parsed.id || `BUG-LEGACY-${Date.now()}`,
                        timestamp: parsed.timestamp || Date.now(),
                        matchId: parsed.matchId || 'unknown',
                        side: parsed.side || 'Neutral',
                        title: parsed.title || 'Untitled',
                        description: parsed.description || 'No description',
                        worldState: parsed.worldState,
                        severity: parsed.severity || 'Medium',
                        suggestedFix: parsed.suggestedFix,
                        status: parsed.status || 'Open',
                        comments: parsed.comments || [],
                        relatedBugs: parsed.relatedBugs || []
                    };
                    
                    this.bugs.set(bug.id, bug);
                } catch (e: unknown) {
                    const error = e as Error;
                    this.logger.warn(`Failed to parse bug report line: ${error.message}`);
                }
            }
            
            this.logger.info(`Loaded ${this.bugs.size} bugs from ${this.filePath}`);
            
            // Re-save to normalize the file if legacy bugs were loaded
            await this.save();
        } catch (err: unknown) {
            const error = err as Error;
            this.logger.error(`Error initializing BugManager: ${error.message}`);
        }
    }

    public listBugs(): BugReport[] {
        return Array.from(this.bugs.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    public getBug(id: string): BugReport | undefined {
        return this.bugs.get(id);
    }

    public async createBug(data: CreateBugReport): Promise<BugReport> {
        const id = `BUG-${Date.now()}`;
        const bug: BugReport = {
            id,
            timestamp: Date.now(),
            matchId: data.matchId || 'unknown',
            side: data.side || 'Neutral',
            title: data.title,
            description: data.description,
            worldState: data.worldState,
            severity: data.severity,
            suggestedFix: data.suggestedFix,
            status: 'Open',
            comments: [],
            relatedBugs: []
        };

        this.bugs.set(id, bug);
        await this.save();
        return bug;
    }

    public async updateBug(id: string, updates: UpdateBugReport): Promise<BugReport | undefined> {
        const bug = this.bugs.get(id);
        if (!bug) return undefined;

        if (updates.status) {
            bug.status = updates.status;
        }

        if (updates.addRelatedBug && !bug.relatedBugs.includes(updates.addRelatedBug)) {
            bug.relatedBugs.push(updates.addRelatedBug);
        }

        if (updates.removeRelatedBug) {
            bug.relatedBugs = bug.relatedBugs.filter(rId => rId !== updates.removeRelatedBug);
        }

        await this.save();
        return bug;
    }

    public async addComment(id: string, commentData: AddBugComment): Promise<BugComment | undefined> {
        const bug = this.bugs.get(id);
        if (!bug) return undefined;

        const comment: BugComment = {
            id: `COM-${Date.now()}`,
            author: commentData.author,
            text: commentData.text,
            timestamp: Date.now()
        };

        bug.comments.push(comment);
        await this.save();
        return comment;
    }

    private async save(): Promise<void> {
        const lines = Array.from(this.bugs.values()).map(b => JSON.stringify(b)).join('\n');
        await fs.promises.writeFile(this.filePath, lines + '\n', 'utf-8');
    }
}
