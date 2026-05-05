import { Page } from '@playwright/test';

/**
 * Common utilities for WarGames UI V2 tests.
 * Provides type-safe access to the window-exposed SDK and Store.
 */

export async function waitForSDK(page: Page) {
    await page.waitForFunction(() => {
        const client = (window as any).sdkClient;
        return client && client.connectionState === 'Connected';
    }, { timeout: 10000 });
}

export async function getUIState(page: Page, key: string) {
    return await page.evaluate((k) => {
        const store = (window as any).UIStore;
        if (!store || !store[k]) return null;
        return store[k].get();
    }, key);
}

export async function navigateTo(page: Page, view: string) {
    await page.evaluate((v) => {
        (window as any).UIStore.activeView.set(v);
    }, view);
}
