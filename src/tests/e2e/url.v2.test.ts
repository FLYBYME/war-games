import { test, expect } from '@playwright/test';
import { waitForSDK, MockWindow } from './test-utils';

test.describe('V2 URL Synchronization', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should sync matchId to URL when joining a match', async ({ page }) => {
        // 1. Open Match Manager
        await page.click('text=TOOLS');
        await page.click('text=Match Manager');
        
        // 2. Load a scenario (which joins automatically)
        const loadBtn = page.locator('.load-scenario-btn').first();
        await loadBtn.click();

        // 3. Verify URL hash contains the match ID
        await expect.poll(async () => {
            const hash = await page.evaluate(() => window.location.hash);
            return hash;
        }, { timeout: 10000 }).toContain('/session-'); // Assuming auto-generated ID starts with session-
    });

    test('should restore view and match from URL on direct navigation', async ({ page }) => {
        // Create a match first to get an ID
        await page.click('text=TOOLS');
        await page.click('text=Match Manager');
        await page.locator('.load-scenario-btn').first().click();
        
        const hash = await page.evaluate(() => window.location.hash);
        expect(hash).toContain('tactical/');

        // 1. Direct navigation to the hash
        await page.goto('/' + hash);
        await waitForSDK(page);

        // 2. Verify UIStore state
        const state = await page.evaluate(() => ({
            view: (window as unknown as MockWindow).UIStore.activeView.get(),
            matchId: (window as unknown as MockWindow).UIStore.currentMatchId.get()
        }));

        expect(state.view).toBe('tactical');
        expect(hash).toContain(state.matchId);
    });
});
