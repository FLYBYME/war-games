import { test, expect } from '@playwright/test';
import { waitForSDK } from './test-utils';

test.describe('V2 UI Management', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should open and list matches in Match Manager', async ({ page }) => {
        // Open TOOLS menu
        await page.click('text=TOOLS');
        // Click Match Manager
        await page.click('text=Match Manager');

        // Verify window is open
        const window = page.locator('.window-frame', { hasText: 'MATCH MANAGEMENT' });
        await expect(window).toBeVisible();

        // Verify default match is listed
        const defaultMatch = window.locator('text=default');
        await expect(defaultMatch).toBeVisible();
    });

    test('should open and list sessions in Session Manager', async ({ page }) => {
        await page.click('text=TOOLS');
        await page.click('text=Session Manager');

        const window = page.locator('.window-frame', { hasText: 'SESSION MONITOR' });
        await expect(window).toBeVisible();

        // Wait for at least one data row to appear
        const sessionRow = window.locator('.session-row').nth(1);
        await expect(sessionRow).toBeVisible({ timeout: 10000 });
        
        const rows = window.locator('.session-row');
        const count = await rows.count();
        expect(count).toBeGreaterThan(1); // 1 header + at least 1 data row
    });

    test('should perform full match lifecycle: load, verify, delete', async ({ page }) => {
        await page.click('text=TOOLS');
        await page.click('text=Match Manager');

        const window = page.locator('.window-frame', { hasText: 'MATCH MANAGEMENT' });
        
        // 1. Load a built-in scenario
        await expect(window.locator('.load-scenario-btn').first()).toBeVisible();
        await window.locator('.load-scenario-btn').first().click();

        // 2. Verify new match appears in match list
        // Wait for a new match row (one that isn't 'default')
        const newMatchRow = window.locator('.match-id').filter({ hasNotText: 'default' });
        await expect(newMatchRow).toBeVisible({ timeout: 10000 });

        // 3. Delete the match
        const deleteBtn = window.locator('.btn-delete').first();
        
        // Handle the confirm dialog
        page.once('dialog', dialog => dialog.accept());
        await deleteBtn.click();

        // 4. Verify match disappears
        await expect(newMatchRow).not.toBeVisible({ timeout: 10000 });
    });
});
