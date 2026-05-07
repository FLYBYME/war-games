import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { logger } from '../../framework/Logger';
import { MapRegion } from '../../../sdk/schemas';

/**
 * MapDataManager: Enhanced UI for managing terrain data.
 */
export class MapDataManager extends Component {
    private refreshInterval: ReturnType<typeof setInterval> | undefined;

    constructor() {
        super('div', 'map-data-manager', 'map-data-manager');
    }

    protected styles(): string {
        return `
            .map-data-manager {
                padding: 16px;
                color: var(--text-main, #e2e8f0);
                font-family: var(--font-ui, sans-serif);
                display: flex;
                flex-direction: column;
                gap: 20px;
                height: 100%;
                background: var(--bg-panel, #0c1220);
                overflow-y: auto;
            }

            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .stat-card {
                background: var(--bg-surface, #111827);
                padding: 12px;
                border: 1px solid var(--border-color, #1e293b);
                border-radius: var(--radius-md, 6px);
                position: relative;
                overflow: hidden;
            }

            .stat-card::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--accent-primary, #3b82f6);
                opacity: 0.5;
            }

            .stat-label {
                color: var(--text-muted, #64748b);
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 4px;
            }

            .stat-value {
                font-size: 20px;
                color: var(--text-bright, #f8fafc);
                font-weight: 600;
                font-family: var(--font-mono, monospace);
            }

            .stat-unit {
                font-size: 10px;
                color: var(--text-muted, #64748b);
                margin-left: 4px;
            }

            .section-title {
                font-size: 11px;
                color: var(--text-dim, #475569);
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .section-title::after {
                content: '';
                flex: 1;
                height: 1px;
                background: var(--border-color, #1e293b);
            }

            .actions {
                display: flex;
                gap: 8px;
            }

            .btn {
                flex: 1;
                padding: 8px 12px;
                background: var(--bg-surface, #111827);
                border: 1px solid var(--border-color, #1e293b);
                color: var(--text-main, #e2e8f0);
                cursor: pointer;
                border-radius: var(--radius-sm, 4px);
                font-size: 11px;
                font-weight: 500;
                transition: all var(--transition-fast, 120ms);
                text-transform: uppercase;
            }

            .btn:hover {
                background: var(--bg-hover, #1a2438);
                border-color: var(--accent-primary, #3b82f6);
            }

            .btn-danger {
                color: var(--accent-danger, #ef4444);
            }

            .btn-danger:hover {
                background: rgba(239, 68, 68, 0.1);
                border-color: var(--accent-danger, #ef4444);
            }

            .regions-list, .jobs-list {
                background: var(--bg-base, #060a12);
                border: 1px solid var(--border-color, #1e293b);
                border-radius: var(--radius-md, 6px);
                padding: 4px;
                max-height: 200px;
                overflow-y: auto;
            }

            .region-item, .job-item {
                padding: 8px 12px;
                border-bottom: 1px solid var(--border-color, #1e293b);
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
            }

            .region-item:last-child, .job-item:last-child {
                border-bottom: none;
            }

            .region-name {
                color: var(--accent-info, #06b6d4);
                font-weight: 500;
            }

            .region-bounds {
                color: var(--text-muted, #64748b);
                font-size: 10px;
                font-family: var(--font-mono, monospace);
            }

            .job-id {
                color: var(--accent-warning, #f59e0b);
                font-family: var(--font-mono, monospace);
            }

            .empty-state {
                color: var(--text-dim, #475569);
                text-align: center;
                padding: 20px;
                font-style: italic;
            }
        `;
    }

    protected render(): void {
        this.element.innerHTML = `
            <div>
                <div class="section-title">System Health</div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Engine Cache</div>
                        <div class="stat-value"><span id="stat-engine">-</span><span class="stat-unit">tiles</span></div>
                        <div class="stat-label" style="margin-top:4px"><span id="stat-engine-size">-</span> MB</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">UI Cache</div>
                        <div class="stat-value"><span id="stat-ui">-</span><span class="stat-unit">tiles</span></div>
                        <div class="stat-label" style="margin-top:4px"><span id="stat-ui-size">-</span> MB</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Memory Index</div>
                        <div class="stat-value"><span id="stat-ram">-</span><span class="stat-unit">active</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Regions</div>
                        <div class="stat-value" id="stat-regions">-</div>
                    </div>
                </div>
            </div>

            <div class="actions">
                <button class="btn" id="btn-refresh">Force Refresh</button>
                <button class="btn btn-danger" id="btn-clear">Purge Cache</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <div class="section-title">Active Regions</div>
                    <div class="regions-list" id="regions-list">
                        <div class="empty-state">Loading regions...</div>
                    </div>
                </div>

                <div>
                    <div class="section-title">Worker Pipeline</div>
                    <div class="jobs-list" id="jobs-list">
                        <div class="empty-state">No active jobs</div>
                    </div>
                </div>
            </div>
        `;

        this.listen(this.element.querySelector('#btn-refresh')!, 'click', () => this.fetchStats());
        this.listen(this.element.querySelector('#btn-clear')!, 'click', () => this.clearCache());
    }

    protected onMount() {
        this.fetchStats();
        this.refreshInterval = setInterval(() => this.fetchStats(), 3000);
    }

    protected onUnmount() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    private async fetchStats() {
        try {
            const [stats, manifest] = await Promise.all([
                UIStore.client.terrain.fetchStats(),
                UIStore.client.terrain.fetchManifest()
            ]);
            
            // Update Stats
            if (this.element.querySelector('#stat-regions')) this.element.querySelector('#stat-regions')!.textContent = stats.regions.toString();
            if (this.element.querySelector('#stat-engine')) this.element.querySelector('#stat-engine')!.textContent = stats.cachedEngineTiles.toString();
            if (this.element.querySelector('#stat-ui')) this.element.querySelector('#stat-ui')!.textContent = stats.cachedUITiles.toString();
            if (this.element.querySelector('#stat-ram')) this.element.querySelector('#stat-ram')!.textContent = stats.memoryCacheSize.toString();
            
            if (this.element.querySelector('#stat-engine-size')) this.element.querySelector('#stat-engine-size')!.textContent = stats.engineSizeMb?.toFixed(1) || '0.0';
            if (this.element.querySelector('#stat-ui-size')) this.element.querySelector('#stat-ui-size')!.textContent = stats.uiSizeMb?.toFixed(1) || '0.0';

            // Update Jobs
            const jobsList = this.element.querySelector('#jobs-list')!;
            if (stats.pendingJobs.length === 0) {
                jobsList.innerHTML = '<div class="empty-state">No active jobs</div>';
            } else {
                jobsList.innerHTML = stats.pendingJobs.map(job => `
                    <div class="job-item">
                        <span>Generating Tile</span>
                        <span class="job-id">${job}</span>
                    </div>
                `).join('');
            }

            // Update Regions
            const regionsList = this.element.querySelector('#regions-list')!;
            const regions = manifest.regions as MapRegion[];
            if (regions.length === 0) {
                regionsList.innerHTML = '<div class="empty-state">No regions found</div>';
            } else {
                regionsList.innerHTML = regions.map(r => `
                    <div class="region-item">
                        <div>
                            <div class="region-name">${r.name}</div>
                            <div class="region-bounds">${r.bounds.minLat}N ${r.bounds.minLon}E to ${r.bounds.maxLat}N ${r.bounds.maxLon}E</div>
                        </div>
                        <button class="btn btn-jump" style="flex: 0 0 60px" data-lat="${(r.bounds.minLat + r.bounds.maxLat) / 2}" data-lon="${(r.bounds.minLon + r.bounds.maxLon) / 2}">JUMP</button>
                    </div>
                `).join('');

                regionsList.querySelectorAll('.btn-jump').forEach(btn => {
                    this.listen(btn as HTMLElement, 'click', () => {
                        const lat = parseFloat(btn.getAttribute('data-lat')!);
                        const lon = parseFloat(btn.getAttribute('data-lon')!);
                        UIStore.cameraTarget.set({ lat, lon });
                    });
                });
            }

        } catch (err) {
            logger.error('MapDataManager: Failed to fetch data', { err });
        }
    }

    private async clearCache() {
        if (!confirm('Are you sure you want to clear the entire terrain cache? This will delete all generated tiles from disk.')) return;

        try {
            await UIStore.client.terrain.clearCache();
            this.fetchStats();
            logger.info('MapDataManager: Cache cleared');
        } catch (err) {
            logger.error('MapDataManager: Failed to clear cache', { err });
        }
    }
}
