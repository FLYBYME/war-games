import { test, expect } from '@playwright/test';
import { waitForSDK } from './test-utils';

test.describe('V2 UI Persistence', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should persist active view (route) after reload', async ({ page }) => {
        // 1. Navigate to 'profiles'
        await page.click('text=TOOLS');
        await page.click('text=Profile Editor');
        
        // Verify we are in profiles
        await expect(page.locator('text=PROFILES VIEW (V2)')).toBeVisible();

        // 2. Reload page
        await page.reload();
        await waitForSDK(page);

        // 3. Verify we are still in profiles
        await expect(page.locator('text=PROFILES VIEW (V2)')).toBeVisible();
    });

    test('should persist window position after drag and reload', async ({ page }) => {
        // 1. Open Match Manager
        await page.click('text=TOOLS');
        await page.click('text=Match Manager');
        
        const window = page.locator('.window-frame', { hasText: 'MATCH MANAGEMENT' });
        await expect(window).toBeVisible();

        // 2. Drag window to a new position
        const header = window.locator('.window-header');
        const initialBox = await window.boundingBox();
        const headerBox = await header.boundingBox();
        expect(initialBox).not.toBeNull();
        expect(headerBox).not.toBeNull();
        
        // Move mouse to center of header and drag
        await page.mouse.move(headerBox!.x + headerBox!.width / 2, headerBox!.y + headerBox!.height / 2);
        await page.mouse.down();
        await page.mouse.move(headerBox!.x + headerBox!.width / 2 + 200, headerBox!.y + headerBox!.height / 2 + 100, { steps: 10 });
        await page.mouse.up();

        const movedBox = await window.boundingBox();
        expect(movedBox!.x).toBeGreaterThan(initialBox!.x);

        // 3. Reload
        await page.reload();
        await waitForSDK(page);

        // 4. Verify window is still open and at the new position
        const restoredWindow = page.locator('.window-frame', { hasText: 'MATCH MANAGEMENT' });
        await expect(restoredWindow).toBeVisible();
        
        const restoredBox = await restoredWindow.boundingBox();
        // Allow for small rounding differences
        expect(Math.abs(restoredBox!.x - movedBox!.x)).toBeLessThan(5);
        expect(Math.abs(restoredBox!.y - movedBox!.y)).toBeLessThan(5);
    });

    test('should persist layer visibility after reload', async ({ page }) => {
        // 1. Open Map Layers
        await page.click('text=TOOLS');
        await page.click('text=Map Layers');
        
        const gridToggle = page.locator('[data-testid="layer-toggle-grid"]');
        const checkbox = gridToggle.locator('.layer-checkbox');
        
        // Toggle Grid ON
        await gridToggle.click();
        await expect(checkbox).toHaveClass(/checked/);

        // 2. Reload
        await page.reload();
        await waitForSDK(page);

        // 3. Verify Grid is still ON (re-open the tool to check)
        await page.click('text=TOOLS');
        await page.click('text=Map Layers');
        await expect(page.locator('[data-testid="layer-toggle-grid"] .layer-checkbox')).toHaveClass(/checked/);
    });
});
