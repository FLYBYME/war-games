import { Page } from '@playwright/test';

/**
 * Common E2E test utilities for V2 UI.
 */

export async function getSDKClient(page: Page) {
    return await page.evaluate(() => (window as unknown as { sdkClient: unknown }).sdkClient);
}

export async function getUIStore(page: Page) {
    return await page.evaluate(() => (window as unknown as { UIStore: unknown }).UIStore);
}

export async function waitForSimulationTick(page: Page, targetTick: number) {
    await page.waitForFunction((tick) => {
        const store = (window as unknown as { UIStore: { viewState: { get: () => { tick: number } | null } } }).UIStore;
        const vs = store.viewState.get();
        return vs && vs.tick >= tick;
    }, targetTick, { timeout: 30000 });
}

export async function waitForSDK(page: Page) {
    await page.waitForFunction(() => (window as unknown as { sdkClient?: { connectionState: string } }).sdkClient?.connectionState === 'Connected');
}

export async function navigateTo(page: Page, view: string) {
    await page.goto(`/#${view}`);
}
