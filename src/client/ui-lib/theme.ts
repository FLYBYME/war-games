// ui-lib/theme.ts

export const Theme = {
    colors: {
        accent: 'var(--accent, #007acc)',
        bgPrimary: 'var(--bg-panel, #1e1e1e)',
        bgSecondary: 'var(--bg-sidebar, #252526)',
        bgTertiary: 'var(--bg-input, #2d2d30)',
        border: 'var(--border, #3e3e42)',
        textMain: 'var(--text-main, #cccccc)',
        textMuted: 'var(--text-muted, #888888)',
        success: 'var(--success, #4caf50)',
        warning: 'var(--warning, #ff9800)',
        error: 'var(--error, #f44336)',
        info: 'var(--info, #007acc)',
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
        sizeBase: '13px',
    }
};