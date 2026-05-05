import { test, expect } from '@playwright/test';
import { waitForSDK, navigateTo } from './test-utils';

test.describe('V2 UI Sanity', () => {
    
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');
    });

    test('should load the application and connect to the server', async ({ page }) => {
        // 1. Verify page title or initial content
        await expect(page).toHaveTitle(/WAR·GAMES/i);
        
        // 2. Wait for SDK connection
        await waitForSDK(page);
        
        // 3. Verify initial view is MENU
        const menuPlaceholder = page.getByText('MENU VIEW (V2)');
        await expect(menuPlaceholder).toBeVisible();
    });

    test('should navigate to tactical view', async ({ page }) => {
        await waitForSDK(page);
        
        // Use the helper to switch views via the store
        await navigateTo(page, 'tactical');
        
        // Verify the tactical view is rendered
        // Based on App.ts, it should render TacticalView which likely has different content
        // For now, let's look for evidence of TacticalView
        const tacticalView = page.locator('.tactical-view');
        await expect(tacticalView).toBeVisible();
    });

    test('should reflect server pause state in the UI', async ({ page }) => {
        await waitForSDK(page);
        
        // Check if the UIStore shows the server's pause state
        const isPaused = await page.evaluate(() => (window as any).UIStore.isPaused.get());
        expect(typeof isPaused).toBe('boolean');
    });
});
