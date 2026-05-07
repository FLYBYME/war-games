import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { sdkClient } from '../../framework/Client';
import { ViewUnitPayload, ViewTrackPayload } from '../../../sdk/schemas';

/**
 * WeaponAllocationMatrix: Multi-shooter/Multi-target weapon assignment UI.
 * Optimizes coordinated strikes across multiple platforms.
 */
export class WeaponAllocationMatrix extends Component {
    private shooters: ViewUnitPayload[] = [];
    private targets: ViewTrackPayload[] = [];

    constructor() {
        super('div', 'weapon-matrix', 'weapon-matrix');
    }

    protected styles(): string {
        return `
            .weapon-matrix { padding: 15px; background: #111; color: #ddd; overflow-x: auto; }
            .matrix-table { border-collapse: collapse; width: 100%; font-size: 11px; }
            .matrix-table th, .matrix-table td { border: 1px solid #333; padding: 6px; text-align: center; }
            .shooter-cell { text-align: left !important; font-weight: bold; }
            .target-cell { background: #222; }
            .btn-fire { background: #442222; border: 1px solid #663333; color: #ffaaaa; cursor: pointer; padding: 2px 4px; border-radius: 2px; }
            .btn-fire:hover { background: #662222; }
        `;
    }

    protected render(): void {
        this.subscribe(UIStore.viewState, (vs) => {
            if (!vs) return;
            this.shooters = vs.units.filter(u => u.mounts.length > 0);
            this.targets = vs.tracks.filter(t => t.identification === 'HOSTILE');
            this.refresh();
        });
    }

    private refresh() {
        if (this.shooters.length === 0 || this.targets.length === 0) {
            this.element.innerHTML = '<div style="color: #444; text-align: center; padding: 20px;">No hostile tracks identified</div>';
            return;
        }

        let html = '<table class="matrix-table"><tr><th class="shooter-cell">SHOOTER \\ TARGET</th>';
        this.targets.forEach(t => {
            html += `<th class="target-cell">${t.id}</th>`;
        });
        html += '</tr>';

        this.shooters.forEach(s => {
            html += `<tr><td class="shooter-cell">${s.id}</td>`;
            this.targets.forEach(t => {
                html += `<td><button class="btn-fire" data-shooter="${s.id}" data-target="${t.id}">FIRE</button></td>`;
            });
            html += '</tr>';
        });
        html += '</table>';

        this.element.innerHTML = html;

        this.element.querySelectorAll('.btn-fire').forEach(btn => {
            this.listen(btn as HTMLElement, 'click', () => {
                const sId = btn.getAttribute('data-shooter')!;
                const tId = btn.getAttribute('data-target')!;
                void this.fireCoordinated(sId, tId);
            });
        });
    }

    private async fireCoordinated(shooterId: string, targetId: string) {
        const shooter = this.shooters.find(u => u.id === shooterId);
        if (!shooter) return;

        // Find first ready mount
        const readyMountIdx = shooter.mounts.findIndex(m => m.roundsRemaining > 0);
        if (readyMountIdx === -1) {
            console.warn('No mounts ready on', shooterId);
            return;
        }

        try {
            await sdkClient.dispatch({ type: 'FireWeapon', entityId: shooterId, mountIndex: readyMountIdx, targetId: targetId });
            console.log(`Commanded ${shooterId} to engage ${targetId}`);
        } catch (e) {
            console.error('Fire coordinated failed', e);
        }
    }
}
