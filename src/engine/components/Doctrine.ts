import { z } from 'zod';
import { IComponent, IdentificationStatus } from '../core/Types.js';

export enum ROE {
    FREE = 'Free',     // Fire at any hostile
    TIGHT = 'Tight',   // Fire only at identified hostiles
    HOLD = 'Hold'      // Fire only in self-defense
}

/**
 * EMCONState: Legacy compatibility for EMCON states.
 */
export enum EMCONState {
    Silent = 'Alpha',   // Total silence (Passive only)
    Restricted = 'Bravo',
    Active = 'Charlie'
}

export const WRARuleSchema = z.object({
    targetType: z.string(),
    weaponType: z.string(),
    quantity: z.number().default(1),
    minRangeM: z.number().optional(),
    maxRangePct: z.number().default(1.0),
});

export type WRARule = z.infer<typeof WRARuleSchema>;

export class DoctrineComponent implements IComponent {
    readonly type = 'DoctrineComponent';
    public roe: ROE = ROE.TIGHT;
    public emcon: EMCONState = EMCONState.Active;
    public wraRules: WRARule[] = [];

    constructor(init?: Partial<DoctrineComponent>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}
