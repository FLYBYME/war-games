import { EntityId } from './Types.js';
import { Command } from './Command.js';

export interface TraceLog {
    tick: number;
    entityId: EntityId;
    commandType: string;
    details: Record<string, string | number | boolean | null | object>;
}

/**
 * Tracer: The flight recorder for Engine V3.
 * Captures every intent and resolution for perfect debuggability.
 */
export class Tracer {
    private readonly logs: TraceLog[] = [];
    private maxCapacity: number = 10000;
    public isEnabled: boolean = true;

    public get size(): number { return this.logs.length; }

    public setCapacity(capacity: number): void {
        this.maxCapacity = capacity;
        this.prune();
    }

    public record(tick: number, cmd: Command): void {
        if (!this.isEnabled) return;

        // If we are at capacity, we would just prune anyway. 
        // For high-performance simulations, we should avoid the clone overhead entirely.
        if (this.logs.length >= this.maxCapacity) {
            this.prune();
        }

        // Only clone if we have space. 
        // Use a simpler spread for performance if the command doesn't have deep nested objects.
        // Commands in this engine are generally flat payloads.
        const commandDetails: Record<string, string | number | boolean | null | object> = {};
        const cmdRecord = Object.getOwnPropertyNames(cmd);
        for (const key of cmdRecord) {
            const descriptor = Object.getOwnPropertyDescriptor(cmd, key);
            if (descriptor && 'value' in descriptor) {
                const val = descriptor.value;
                if (val === null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || typeof val === 'object') {
                    commandDetails[key] = val;
                }
            }
        }
        this.logs.push({
            tick,
            entityId: cmd.entityId,
            commandType: cmd.constructor.name,
            details: commandDetails
        });
    }

    private prune(): void {
        if (this.logs.length > this.maxCapacity) {
            this.logs.splice(0, this.logs.length - this.maxCapacity);
        }
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
