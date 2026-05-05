import { Component } from '../framework/Component';

/**
 * DetachableWindow: Pop out any panel into a separate browser window.
 * Leverages the Component lifecycle for multi-monitor command stations.
 */
export class DetachableWindow {
    private childWindow: Window | null = null;

    static popOut(component: Component, title: string, width = 600, height = 500) {
        const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`;
        const win = window.open('', '_blank', features);
        if (!win) return null;

        win.document.title = title;

        // Copy styles
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(s => {
            win.document.head.appendChild(s.cloneNode(true));
        });

        // Set base styling
        const baseStyle = win.document.createElement('style');
        baseStyle.textContent = `
            body { font-family: var(--font-ui); color: var(--text-main); background: var(--bg-base); margin: 0; padding: 0; overflow: auto; }
        `;
        win.document.head.appendChild(baseStyle);

        // Mount component
        component.mount(win.document.body);

        // Cleanup on close
        win.addEventListener('beforeunload', () => {
            component.unmount();
        });

        return win;
    }
}
