import { IComponent } from '../core/Types.js';

/**
 * AeroComponent: Aerodynamic properties for flight-capable entities.
 */
export class AeroComponent implements IComponent {
    readonly type = 'AeroComponent';

    public wingspanM: number = 10;
    public wingAreaS: number = 25;
    public dragCoeffCd: number = 0.02;
    public liftCoeffCl: number = 0.5;
    public maxG: number = 9.0;
    public inducedDragFactor: number = 0.05;
    public machNumber: number = 0;

    constructor(init?: Partial<AeroComponent>) {
        if (init) Object.assign(this, init);
    }
}
