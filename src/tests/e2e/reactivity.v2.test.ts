import { test, expect } from '@playwright/test';
import { waitForSDK } from './test-utils';

test.describe('V2 UI Reactivity & Map Layers', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should toggle map layers and update UIStore state', async ({ page }) => {
        // Open Map Layers tool
        await page.click('text=TOOLS');
        await page.click('text=Map Layers');

        const window = page.locator('.window-frame', { hasText: 'TACTICAL LAYERS' });
        await expect(window).toBeVisible();

        // 1. Get the 'Grid' layer toggle
        const gridToggle = window.locator('[data-testid="layer-toggle-grid"]');
        const checkbox = gridToggle.locator('.layer-checkbox');

        // Check initial state (default for grid is false in UIStore.ts)
        await expect(checkbox).not.toHaveClass(/checked/);

        // 2. Click to toggle ON
        await gridToggle.click();
        await expect(checkbox).toHaveClass(/checked/);

        // 3. Verify UIStore state via page.evaluate
        const isGridOn = await page.evaluate(() => {
            return (window as any).UIStore.getLayerSignal('grid').get();
        });
        expect(isGridOn).toBe(true);

        // 4. Click to toggle OFF
        await gridToggle.click();
        await expect(checkbox).not.toHaveClass(/checked/);
    });

    test('should persist layer state when switching views', async ({ page }) => {
        await page.click('text=TOOLS');
        await page.click('text=Map Layers');
        
        const gridToggle = page.locator('[data-testid="layer-toggle-grid"]');
        await gridToggle.click(); // Turn grid ON

        // Switch to Tactical View
        await page.click('text=VIEW');
        await page.click('text=Tactical Map');

        // Verify still ON
        const isGridOn = await page.evaluate(() => {
            return (window as any).UIStore.getLayerSignal('grid').get();
        });
        expect(isGridOn).toBe(true);
    });
});
