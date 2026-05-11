/**
 * WAR-GAMES - Core Public API
 * This file serves as the unified entry point for extensions to import core functionality.
 */

// --- UI Library ---
// Direct access to all UI components and theme utilities
export * from './ui-lib';

// --- Main IDE Infrastructure ---
export { IDE, IDEEvents } from './core/IDE';
export { EventBus } from './core/EventBus';

// --- Extension System ---
export { Extension, ExtensionContext } from './core/extensions/Extension';
export { ViewProvider, ViewLocation } from './core/extensions/ViewProvider';
export { ViewRegistry } from './core/extensions/ViewRegistry';

// --- Registry & Service Infrastructure ---
export { CommandRegistry } from './core/CommandRegistry';
export { ShortcutManager } from './core/ShortcutManager';
export { ConfigurationRegistry, ConfigurationNode, ConfigurationProperty } from './core/configuration/ConfigurationRegistry';
export { ConfigurationService, ConfigurationEvents } from './core/configuration/ConfigurationService';

// --- UI & Layout Services ---
export { LayoutManager } from './core/LayoutManager';
export { ActivityBarService } from './core/ActivityBarService';
export { ThemeService } from './core/ThemeService';
export { NotificationService } from './core/NotificationService';

// --- Editor & Content Services ---
export { MonacoService } from './core/MonacoService';
export { EditorManager } from './core/editor/EditorManager';
