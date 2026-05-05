import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';

/**
 * MountsWindowContent: Displays and controls the weapon mounts of the selected unit.
 */
export class MountsWindowContent extends Component {
    constructor() {
        super('div', 'mounts-window');
    }

    protected styles(): string {
        return `
            .mounts-window {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                color: #eee;
                font-family: 'Inter', sans-serif;
            }

            .mount-card {
                background: #2a2a2a;
                border-radius: 4px;
                padding: 10px;
                border-left: 3px solid #333;
            }

            .mount-card.ready { border-left-color: #00d1ff; }
            .mount-card.empty { border-left-color: #ff3b30; }

            .mount-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .mount-name {
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
            }

            .mount-rounds {
                font-family: monospace;
                font-size: 12px;
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 3px;
            }

            .mount-actions {
                display: flex;
                gap: 8px;
            }

            .fire-btn {
                flex: 1;
                background: #ff3b30;
                color: white;
                border: none;
                padding: 6px;
                border-radius: 3px;
                font-weight: bold;
                cursor: pointer;
                font-size: 11px;
                text-transform: uppercase;
                transition: opacity 0.2s;
            }

            .fire-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .fire-btn:hover:not(:disabled) {
                filter: brightness(1.2);
            }

            .no-selection {
                text-align: center;
                color: #888;
                padding: 20px;
                font-style: italic;
            }
        `;
    }

    private mountMap = new Map<number, HTMLElement>();

    protected render(): void {
        this.subscribe(UIStore.viewState, () => this.refresh());
        this.subscribe(UIStore.selectedEntityId, () => this.refresh());
    }

    private refresh() {
        const vs = UIStore.viewState.get();
        const selectedId = UIStore.selectedEntityId.get();
        const unit = vs?.units.find(u => u.id === selectedId);

        if (!unit || !unit.mounts || unit.mounts.length === 0) {
            this.element.innerHTML = `<div class="no-selection">${!unit ? 'No unit selected' : 'No weapon mounts found'}</div>`;
            this.mountMap.clear();
            return;
        }

        // Ensure we don't have the "no selection" message lingering if there are mounts
        if (this.element.querySelector('.no-selection')) {
            this.element.innerHTML = '';
        }

        const activeIndices = new Set<number>();

        unit.mounts.forEach((m, idx) => {
            activeIndices.add(idx);
            let card = this.mountMap.get(idx);
            
            if (!card) {
                card = this.el('div', 'mount-card', '', `mount-card-${idx}`);
                card.innerHTML = `
                    <div class="mount-header">
                        <span class="mount-name"></span>
                        <span class="mount-rounds"></span>
                    </div>
                    <div class="mount-actions">
                        <button class="fire-btn"></button>
                    </div>
                `;
                this.element.appendChild(card);
                this.mountMap.set(idx, card);

                const fireBtn = card.querySelector('.fire-btn') as HTMLButtonElement;
                fireBtn.onclick = () => {
                    console.log(`Firing mount ${idx} from ${unit.id}`);
                    UIStore.client.combat.fireWeapon(unit.id, idx, 'TARGET_ID_HERE'); 
                };
            }

            // Update Text Values
            card.className = `mount-card ${m.roundsRemaining > 0 ? 'ready' : 'empty'}`;
            card.querySelector('.mount-name')!.textContent = m.type;
            card.querySelector('.mount-rounds')!.textContent = `${m.roundsRemaining} RNDS`;
            
            const fireBtn = card.querySelector('.fire-btn') as HTMLButtonElement;
            fireBtn.textContent = 'Manual Fire';
            fireBtn.disabled = m.roundsRemaining <= 0;
            fireBtn.setAttribute('data-testid', `mount-fire-btn-${idx}`);
        });

        // Cleanup
        for (const [idx, card] of this.mountMap.entries()) {
            if (!activeIndices.has(idx)) {
                card.remove();
                this.mountMap.delete(idx);
            }
        }
    }
}
