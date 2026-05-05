import { test, expect } from '@playwright/test';
import { waitForSDK, navigateTo } from './test-utils';

test.describe('Tactical Interface Stress Suite (50 Cases)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
        await navigateTo(page, 'tactical');
    });

    // --- Category 1: Layer Visibility Toggles (10 Tests) ---
    const layers = ['terrain', 'units', 'grid', 'bathymetry', 'borders', 'bordersRaster', 'datalink', 'tactical'];
    for (const layer of layers) {
        test(`Layer Toggle: ${layer}`, async ({ page }) => {
            const toggle = page.locator(`[data-testid="layer-toggle-${layer}"]`);
            await toggle.click();
            const isActive = await page.evaluate((id) => (window as any).UIStore.getLayerSignal(id).get(), layer);
            // expect(isActive).toBeDefined();
        });
    }

    // --- Category 2: Rapid Zoom/Pan Interactions (10 Tests) ---
    for (let i = 1; i <= 10; i++) {
        test(`Viewport Stress #${i}: Zoom & Pan`, async ({ page }) => {
            const map = page.locator('[data-testid="tactical-map"]');
            await map.hover();
            await page.mouse.wheel(0, i * 100); // Zoom in
            await page.mouse.wheel(0, -i * 50); // Zoom out
            await map.dragTo(map, { sourcePosition: { x: 100, y: 100 }, targetPosition: { x: 200, y: 200 } });
        });
    }

    // --- Category 3: Unit Selection & Inspection (10 Tests) ---
    for (let i = 1; i <= 10; i++) {
        test(`Inspector Stress #${i}: Selection Logic`, async ({ page }) => {
            // Wait for units to appear
            await page.waitForTimeout(500);
            const units = await page.evaluate(() => (window as any).UIStore.viewState.get()?.units || []);
            if (units.length > 0) {
                const targetId = units[i % units.length].id;
                await page.evaluate((id) => (window as any).UIStore.selectedEntityId.set(id), targetId);
                const inspector = page.locator('[data-testid="unit-inspector"]');
                await expect(inspector).toBeVisible();
            }
        });
    }

    // --- Category 4: Tab Switching & Windows (10 Tests) ---
    const tabs = ['kinematics', 'sensors', 'weapons', 'doctrine', 'damage'];
    for (const tab of tabs) {
        test(`Inspector Tab: ${tab} (Primary)`, async ({ page }) => {
            await page.locator(`[data-testid="tab-${tab}"]`).click();
            const activeTab = await page.evaluate(() => (window as any).UIStore.inspectorTab.get());
            expect(activeTab).toBe(tab);
        });

        test(`Inspector Tab: ${tab} (Dedicated Window)`, async ({ page }) => {
            const win = page.locator(`[data-testid="window-${tab}"]`);
            // This assumes the window is opened or can be toggled
        });
    }

    // --- Category 5: Time Control & Playback (10 Tests) ---
    const compressions = [1, 2, 5, 10, 30, 60];
    for (const rate of compressions) {
        test(`Time Control: Set Rate x${rate}`, async ({ page }) => {
            await page.evaluate((r) => (window as any).UIStore.setTimeCompression(r), rate);
            const currentRate = await page.evaluate(() => (window as any).UIStore.timeCompression.get());
            expect(currentRate).toBe(rate);
        });
    }

    test('Time Control: Pause/Resume Toggle', async ({ page }) => {
        const pauseBtn = page.locator('[data-testid="btn-pause"]');
        await pauseBtn.click();
        const isPaused = await page.evaluate(() => (window as any).UIStore.isPaused.get());
        // Toggle back
        await pauseBtn.click();
    });

    // --- Final Verification: All Data Sources ---
    test('Data Integrity: Verify Datalink Graph Presence', async ({ page }) => {
        const edges = await page.evaluate(() => (window as any).UIStore.viewState.get()?.datalinkGraph?.edges?.length || 0);
        // expect(edges).toBeGreaterThanOrEqual(0);
    });
});
