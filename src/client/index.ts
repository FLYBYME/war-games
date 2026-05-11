/**
 * WAR-GAMES — Tactical Command Center Entry Point
 * Initializes all services and extensions for the simulation workbench.
 */

import { IDE } from './core/IDE';
import { ProjectScaffolderExtension } from './extensions/ProjectScaffolderExtension';
import { MapExtension } from './extensions/map/MapExtension';
import { MatchExtension } from './extensions/MatchExtension';
import { ToolRunnerExtension } from './extensions/ToolRunnerExtension';
import { EntityExtension } from './extensions/EntityExtension';
import { EventLogExtension } from './extensions/EventLogExtension';
import { SimControlExtension } from './extensions/SimControlExtension';
import { AgentExtension } from './extensions/AgentExtension';
import { DBBrowserExtension } from './extensions/DBBrowserExtension';
import { HistoryExtension } from './extensions/HistoryExtension';
import { DevToolsExtension } from './extensions/DevToolsExtension';
import { KeyboardShortcutsExtension } from './extensions/KeyboardShortcutsExtension';
import { QuickCommandExtension } from './extensions/QuickCommandExtension';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as monaco from 'monaco-editor';

// Import styles
import './css/main.css';
import './css/tactical-theme.css';
import './css/layout.css';
import './css/filetree.css';
import './css/settings.css';
import './css/dialog.css';
import './css/inline-edit.css';
import './css/sourcecontrol.css';

// Expose dependencies to the global window object for dynamically loaded extensions
declare global {
    interface Window {
        __IDE_REACT__: typeof React;
        __IDE_REACT_DOM__: typeof ReactDOM;
        __IDE_MONACO__: typeof monaco;
    }
}

window.__IDE_REACT__ = React;
window.__IDE_REACT_DOM__ = ReactDOM;
window.__IDE_MONACO__ = monaco;

/**
 * Main application initialization
 */
async function initializeApp(): Promise<void> {
    try {
        const ide = new IDE();

        // ── Phase 1: Foundation ──────────────────────────────────────────
        ide.extensions.register(MatchExtension);       // Match lifecycle, status bar, notification-status
        ide.extensions.register(MapExtension);          // Tactical map (center panel)
        ide.extensions.register(EntityExtension);       // Entity inspector (right sidebar)

        // ── Phase 2: Interactivity ──────────────────────────────────────
        ide.extensions.register(SimControlExtension);   // Play/pause/step toolbar
        ide.extensions.register(EventLogExtension);     // Live event stream viewer
        ide.extensions.register(ToolRunnerExtension);   // Schema-driven debug console

        // ── Phase 3: Intelligence ───────────────────────────────────────
        ide.extensions.register(AgentExtension);        // AI agent chat
        ide.extensions.register(DBBrowserExtension);    // Database browser
        ide.extensions.register(HistoryExtension);      // Post-match analytics

        // ── Phase 4: Dev Tools ──────────────────────────────────────────
        ide.extensions.register(DevToolsExtension);     // Developer console
        ide.extensions.register(QuickCommandExtension); // Command palette (Ctrl+Shift+P)
        ide.extensions.register(KeyboardShortcutsExtension); // Shortcut overlay
        ide.extensions.register(ProjectScaffolderExtension);  // Legacy scaffolder

        await ide.initialize();
        hideLoadingScreen();
        console.log('✅ War Games Command Center initialized');
    } catch (error) {
        hideLoadingScreen(); // Hide it even on error so user can see error screen
        console.error('❌ Failed to initialize application:', error);
        showErrorScreen(error as Error);
    }
}

/**
 * Hide loading screen with fade effect
 */
function hideLoadingScreen(): void {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.remove();
        }, 500); // Match transition duration
    }
}

/**
 * Show error screen if initialization fails
 */
function showErrorScreen(error: Error): void {
    const app = document.getElementById('app');
    if (app) {
        app.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1e1e1e; color: #fff;">
                <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f44336; margin-bottom: 20px;"></i>
                <h1 style="margin: 0 0 10px;">Failed to Initialize</h1>
                <p style="color: #888; margin: 0 0 20px;">${error.message}</p>
                <button onclick="location.reload()" style="background: #007acc; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Reload Application
                </button>
            </div>
        `;
    }
}

// Start when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
