import { test, expect } from '@playwright/test';
import { waitForSDK } from './test-utils';

test.describe('Map Data Pipeline & Match Loading', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should switch UI context and center map when JOIN is clicked', async ({ page }) => {
        // Open Match Manager
        await page.click('text=TOOLS');
        await page.click('text=Match Manager');

        const window = page.locator('.window-frame', { hasText: 'MATCH MANAGEMENT' });
        
        // 1. Create a new match from a scenario
        await window.locator('.load-scenario-btn').first().click(); // This is 'LOAD & JOIN'

        // 2. Verify currentMatchId has changed from 'default'
        await expect.poll(async () => {
            return await page.evaluate(() => (window as unknown as { [key: string]: unknown }).UIStore.currentMatchId.get());
        }, { timeout: 10000 }).not.toBe('default');

        // 3. Verify MapCoords reflect a non-zero location
        // We need to move the mouse to trigger the coordinate update
        const map = page.locator('.tactical-map');
        await map.hover({ position: { x: 100, y: 100 } });
        
        await expect.poll(async () => {
            const text = await page.locator('.map-coords').textContent();
            return text;
        }, { timeout: 10000 }).not.toContain('0.0000°, 0.0000°');
    });

    test('should maintain layer visibility through MapDataPipeline refetch', async ({ page }) => {
        // Toggle Grid ON
        await page.click('text=TOOLS');
        await page.click('text=Map Layers');
        const gridToggle = page.locator('[data-testid="layer-toggle-grid"]');
        await gridToggle.click();

        // Join another match (triggers pipeline refetch)
        await page.click('text=Match Manager');
        await page.locator('.join-match-btn').first().click();

        // Verify Grid is still ON in UIStore
        const isGridOn = await page.evaluate(() => (window as unknown as { [key: string]: unknown }).UIStore.getLayerSignal('grid').get());
        expect(isGridOn).toBe(true);
    });
});
