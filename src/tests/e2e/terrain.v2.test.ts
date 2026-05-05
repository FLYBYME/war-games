import { test, expect } from '@playwright/test';
import { waitForSDK, navigateTo } from './test-utils';

test.describe('Dynamic Terrain Rendering (UI v2)', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForSDK(page);
    });

    test('should fetch WGT tiles for the visible area', async ({ page }) => {
        const requestedTiles = new Set<string>();
        
        await page.route('**/api/terrain/tiles/**', async route => {
            const url = route.request().url();
            requestedTiles.add(url);
            
            // Return a dummy WGT buffer (1201x1201)
            const resolution = 1201;
            const buffer = new ArrayBuffer(32 + resolution * resolution * 4);
            const view = new DataView(buffer);
            view.setUint32(0, 0x31544757, true); // MAGIC 'WGT1'
            view.setUint32(4, resolution, true); // Resolution
            
            route.fulfill({
                status: 200,
                contentType: 'application/octet-stream',
                body: Buffer.from(buffer)
            });
        });

        // Trigger tactical view
        await navigateTo(page, 'tactical'); 
        
        // Wait for at least one tile request
        await expect.poll(() => requestedTiles.size, { timeout: 10000 }).toBeGreaterThan(0);
        
        const initialCount = requestedTiles.size;
        console.log(`Initial tiles requested: ${initialCount}`);

        // Pan the map to trigger more loads
        // The tactical map has class .tactical-map
        const map = page.locator('.tactical-map');
        const box = await map.boundingBox();
        if (box) {
            // Drag from center to bottom-right to pan North-West
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx + 400, cy + 400, { steps: 20 });
            await page.mouse.up();
        }

        // Wait for more tiles to be requested
        await expect.poll(() => requestedTiles.size, { timeout: 10000 }).toBeGreaterThan(initialCount);
        console.log(`Total tiles requested after pan: ${requestedTiles.size}`);
    });

    test('should cache tiles and not refetch them when panning back', async ({ page }) => {
        const requestedUrls: string[] = [];
        
        await page.route('**/api/terrain/tiles/**', async route => {
            requestedUrls.push(route.request().url());
            const resolution = 1201;
            const buffer = new ArrayBuffer(32 + resolution * resolution * 4);
            const view = new DataView(buffer);
            view.setUint32(0, 0x31544757, true);
            view.setUint32(4, resolution, true);
            route.fulfill({ status: 200, body: Buffer.from(buffer) });
        });

        await navigateTo(page, 'tactical');
        await expect.poll(() => requestedUrls.length, { timeout: 10000 }).toBeGreaterThan(0);
        
        const firstLoadCount = requestedUrls.length;
        const firstLoadUrls = new Set(requestedUrls);

        // Pan away
        const map = page.locator('.tactical-map');
        const box = await map.boundingBox();
        if (box) {
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            
            // Pan far enough to load new tiles
            await page.mouse.move(cx, cy);
            await page.mouse.down();
            await page.mouse.move(cx + 600, cy + 600, { steps: 20 });
            await page.mouse.up();
            
            await expect.poll(() => requestedUrls.length, { timeout: 5000 }).toBeGreaterThan(firstLoadCount);
            const midCount = requestedUrls.length;

            // Pan back to original position
            await page.mouse.move(cx + 600, cy + 600);
            await page.mouse.down();
            await page.mouse.move(cx, cy, { steps: 20 });
            await page.mouse.up();
            
            // Give it a moment to potentially request
            await page.waitForTimeout(1000);
            
            // Should not have requested original tiles again
            // We check if any of the requestedUrls after midCount were in firstLoadUrls
            const newRequests = requestedUrls.slice(midCount);
            const redundant = newRequests.filter(url => firstLoadUrls.has(url));
            
            expect(redundant.length, `Redundant requests detected: ${redundant.join(', ')}`).toBe(0);
        }
    });
});
