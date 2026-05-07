import { EntityId } from './Types.js';
import { Command } from './Command.js';

export interface TraceLog {
    tick: number;
    entityId: EntityId;
    commandType: string;
    details: unknown;
}

/**
 * Tracer: The flight recorder for Engine V3.
 * Captures every intent and resolution for perfect debuggability.
 */
export class Tracer {
    private readonly logs: TraceLog[] = [];

    public record(tick: number, cmd: Command): void {
        this.logs.push({
            tick,
            entityId: cmd.entityId,
            commandType: cmd.constructor.name,
            details: JSON.parse(JSON.stringify(cmd)) as unknown // Deep copy to avoid mutation issues
        });
    }

    public getLogsForEntity(id: EntityId): TraceLog[] {
        return this.logs.filter(l => l.entityId === id);
    }

    public getLogsForTick(tick: number): TraceLog[] {
        return this.logs.filter(l => l.tick === tick);
    }

    public clear(): void {
        this.logs.length = 0;
    }
}
