import { IComponent, ROE, EMCONState, WRARule } from '../core/Types.js';

export class DoctrineComponent implements IComponent {
    readonly type = 'DoctrineComponent';
    public roe: ROE = ROE.TIGHT;
    public emcon: EMCONState = EMCONState.Alpha;
    public wraRules: WRARule[] = [];

    constructor(init?: Partial<DoctrineComponent>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}
