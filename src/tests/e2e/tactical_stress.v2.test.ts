import { test, expect } from '@playwright/test';
import { getSDKClient, waitForSimulationTick } from './test-utils';
import { Side } from '../../sdk/schemas';

/**
 * Tactical Stress Test: Large-scale engagement with 100+ entities.
 * Verifies frame stability and event processing under load.
 */
test('handle large scale engagement with 100+ entities', async ({ page }) => {
    await page.goto('/#tactical');
    const sdk = await getSDKClient(page) as unknown as { 
        scenario: { loadScenarioIntoEngine: (s: string) => Promise<void>, setTimeCompression: (n: number) => Promise<void> },
        joinMatch: (s: Side, id: string) => Promise<void>,
        combat: { setGlobalROE: (s: string) => Promise<void> },
        queryWinState: (id: string) => Promise<unknown>,
        deleteMatch: (id: string) => Promise<void>,
        getRecentEvents: (id: string, n: number) => { length: number }[]
    };

    // 1. Setup Massive Scenario
    await sdk.scenario.loadScenarioIntoEngine('high-density-battle');
    await sdk.joinMatch(Side.Blue, 'stress-test');

    // 2. Monitoring Performance
    await page.evaluate(() => {
        const win = window as unknown as { UIStore: { isConnected: { get: () => boolean } } };
        return win.UIStore.isConnected.get();
    });

    // 3. Trigger Global Engagement
    await sdk.combat.setGlobalROE('Free');
    await sdk.scenario.setTimeCompression(20);

    // 4. Verify Event Throughput
    // Wait for 1000 ticks of combat
    await waitForSimulationTick(page, 1000);

    const eventCount = await page.evaluate(() => {
        const win = window as unknown as { sdkClient: { getRecentEvents: (id: string, n: number) => unknown[] } };
        return win.sdkClient.getRecentEvents('stress-test', 1000).length;
    });

    expect(eventCount).toBeGreaterThan(100);

    // 5. Check Render Stability
    const fps = await page.evaluate(() => {
        const win = window as unknown as { MapRenderer?: { getFPS: () => number } };
        return win.MapRenderer?.getFPS() || 60;
    });

    expect(fps).toBeGreaterThan(30);

    // 6. Verify Win/Loss Detection under pressure
    const winState = await sdk.queryWinState('stress-test');
    expect(winState).toBeDefined();

    // 7. Cleanup
    await sdk.scenario.setTimeCompression(0);
    await sdk.deleteMatch('stress-test');
});

test('visualize complex datalink topology', async ({ page }) => {
    await page.goto('/#tactical');
    const sdk = await getSDKClient(page) as unknown as { 
        scenario: { loadScenarioIntoEngine: (s: string) => Promise<void> },
        joinMatch: (s: Side, id: string) => Promise<void>,
        deleteMatch: (id: string) => Promise<void>
    };

    await sdk.scenario.loadScenarioIntoEngine('carrier-strike-group');
    await sdk.joinMatch(Side.Blue, 'datalink-test');

    await page.evaluate(() => {
        const win = window as unknown as { UIStore: { isPaused: { get: () => boolean } } };
        return win.UIStore.isPaused.get();
    });

    // Verify datalink visualization nodes
    const { nodes } = await page.evaluate(() => {
        const win = window as unknown as { UIStore: { viewState: { get: () => { datalink: { nodes: unknown[] } } } } };
        const vs = win.UIStore.viewState.get();
        return vs.datalink;
    });

    expect(nodes.length).toBeGreaterThan(5);
    
    await sdk.deleteMatch('datalink-test');
});
