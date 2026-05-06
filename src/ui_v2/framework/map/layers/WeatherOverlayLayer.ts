import { Container, Graphics, Rectangle, BlurFilter } from 'pixi.js';
import { MapLayer } from '../MapLayer';
import { ViewState } from '../../UIStore';

/**
 * WeatherOverlayLayer: Visualizes environmental effects like cloud cover and precipitation.
 */
export class WeatherOverlayLayer implements MapLayer {
    readonly id = 'weather';
    readonly container = new Container();
    private cloudGraphics = new Graphics();
    private rainGraphics = new Graphics();
    
    constructor() {
        this.container.addChild(this.cloudGraphics);
        this.container.addChild(this.rainGraphics);
        
        // Add a blur filter to clouds for a soft look
        this.cloudGraphics.filters = [new BlurFilter({ strength: 20 })];
    }

    update(state: ViewState, viewScale: number, visibleWorldBounds?: Rectangle) {
        this.cloudGraphics.clear();
        this.rainGraphics.clear();

        const weather = state.weather;
        if (!weather) return;

        // 1. Render Cloud Cover
        if (weather.cloudCover > 0 && visibleWorldBounds) {
            const alpha = (weather.cloudCover / 100) * 0.4;
            // Draw a few large overlapping "cells" based on world bounds
            // In a real system we'd use a noise texture or server-provided cell positions
            const step = 50000; // 50km
            const startX = Math.floor(visibleWorldBounds.x / step) * step;
            const startY = Math.floor(visibleWorldBounds.y / step) * step;
            
            for (let x = startX; x < visibleWorldBounds.right + step; x += step) {
                for (let y = startY; y < visibleWorldBounds.bottom + step; y += step) {
                    // Semi-random deterministic seed based on coordinates
                    const seed = Math.sin(x * 0.0001) * Math.cos(y * 0.0001);
                    if (seed > 0.3) {
                        const size = step * (0.8 + seed * 0.5);
                        this.cloudGraphics.circle(x, y, size);
                    }
                }
            }
            this.cloudGraphics.fill({ color: 0xcccccc, alpha });
        }

        // 2. Render Precipitation (Rain)
        const rainRate = weather.precipitationRateMMhr ?? weather.precipitation ?? 0;
        if (rainRate > 0 && visibleWorldBounds) {
            const density = Math.min(100, rainRate);
            const alpha = Math.min(0.5, rainRate / 50);
            
            // Draw streaks
            for (let i = 0; i < density; i++) {
                // Use tick for animation
                const t = state.tick * 0.1;
                const rx = (visibleWorldBounds.x + (Math.sin(i * 123 + t) * 0.5 + 0.5) * visibleWorldBounds.width);
                const ry = (visibleWorldBounds.y + (Math.cos(i * 456 + t) * 0.5 + 0.5) * visibleWorldBounds.height);
                
                const len = 500 / viewScale;
                this.rainGraphics.moveTo(rx, ry);
                this.rainGraphics.lineTo(rx - len * 0.2, ry + len);
            }
            this.rainGraphics.stroke({ width: 1 / viewScale, color: 0x00aaff, alpha });
        }
    }

    destroy() {
        this.cloudGraphics.destroy();
        this.rainGraphics.destroy();
        this.container.removeChildren();
    }
}
