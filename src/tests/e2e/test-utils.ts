import { Page } from '@playwright/test';

/**
 * Common E2E test utilities for V2 UI.
 */

export interface MockUIStore {
    currentMatchId: { get: () => string | null };
    getLayerSignal: (id: string) => { get: () => boolean };
    isPaused: { get: () => boolean };
    activeView: { get: () => string };
    viewState: { get: () => { tick: number } | null };
}

export interface MockWindow extends Window {
    UIStore: MockUIStore;
    sdkClient: { connectionState: string };
}

export async function getSDKClient(page: Page) {
    return await page.evaluate(() => (window as unknown as MockWindow).sdkClient);
}

export async function getUIStore(page: Page) {
    return await page.evaluate(() => (window as unknown as MockWindow).UIStore);
}

export async function waitForSimulationTick(page: Page, targetTick: number) {
    await page.waitForFunction((tick) => {
        const store = (window as unknown as MockWindow).UIStore;
        const vs = store.viewState.get();
        return vs && vs.tick >= tick;
    }, targetTick, { timeout: 30000 });
}

export async function waitForSDK(page: Page) {
    await page.waitForFunction(() => (window as unknown as MockWindow).sdkClient?.connectionState === 'Connected');
}

export async function navigateTo(page: Page, view: string) {
    await page.goto(`/#${view}`);
}
