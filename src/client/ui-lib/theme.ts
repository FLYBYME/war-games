// ui-lib/theme.ts — Tactical Command Center Theme

export const Theme = {
    colors: {
        // Core surfaces
        accent: 'var(--accent, #007acc)',
        bgPrimary: 'var(--bg-primary, #0a0a0c)',
        bgPanel: 'var(--bg-panel, #1e1e1e)',
        bgSecondary: 'var(--bg-sidebar, #252526)',
        bgTertiary: 'var(--bg-input, #2d2d30)',
        border: 'var(--border, #3e3e42)',

        // Text
        textMain: 'var(--text-main, #cccccc)',
        textMuted: 'var(--text-muted, #888888)',

        // Semantic
        success: 'var(--success, #4caf50)',
        warning: 'var(--warning, #ff9800)',
        error: 'var(--error, #f44336)',
        info: 'var(--info, #007acc)',

        // Force colors (tactical)
        blueForce: 'var(--blue-force, #00bcd4)',
        redForce: 'var(--red-force, #ff9800)',
        neutralForce: 'var(--neutral-force, #9e9e9e)',

        // Status indicators
        statusOk: 'var(--status-ok, #4caf50)',
        statusWarn: 'var(--status-warn, #ff9800)',
        statusCrit: 'var(--status-crit, #f44336)',

        // Legacy alias (backward compat)
        bgPrimary_legacy: 'var(--bg-panel, #1e1e1e)',
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '32px',
    },
    radius: '4px',
    font: {
        family: 'var(--font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
        mono: 'var(--font-mono, "JetBrains Mono", "Fira Code", "Cascadia Code", monospace)',
        sizeBase: '13px',
        sizeSm: '11px',
        sizeXs: '10px',
    }
};

// Legacy alias for backward compatibility
Object.defineProperty(Theme.colors, 'bgPrimary', {
    get: () => Theme.colors.bgPanel,
});