// ui-lib/BaseComponent.ts

export abstract class BaseComponent<TProps = {}> {
    protected element: HTMLElement;
    protected _props: TProps;
    protected disposables: { dispose: () => void }[] = [];

    /**
     * @param tagName The HTML tag to create (e.g., 'div', 'button')
     * @param props The configuration properties for this component
     */
    constructor(tagName: string, props: TProps = {} as TProps) {
        this.element = document.createElement(tagName);
        this._props = props;
    }

    /**
     * Core render method to be implemented by subclasses.
     * This is where you map props to the DOM structure.
     */
    public abstract render(): void;

    /**
     * Returns the underlying DOM element.
     */
    public getElement(): HTMLElement {
        return this.element;
    }

    /**
     * Mounts the component to a parent DOM element.
     */
    public mount(parent: HTMLElement): void {
        parent.appendChild(this.element);
    }

    /**
     * Utility to safely append children (either BaseComponents, DOM nodes, or text).
     */
    public appendChildren(...children: (BaseComponent<any> | Node | string)[]): void {
        children.forEach(child => {
            if (child instanceof BaseComponent) {
                this.element.appendChild(child.getElement());
            } else if (typeof child === 'string') {
                this.element.appendChild(document.createTextNode(child));
            } else {
                this.element.appendChild(child);
            }
        });
    }

    /**
     * Get children of the component.
     */
    public getChildren(): BaseComponent<any>[] {
        return this.element.children as unknown as BaseComponent<any>[];
    }

    /**
     * Applies inline styles safely.
     */
    public applyStyles(styles: Partial<CSSStyleDeclaration>): void {
        Object.assign(this.element.style, styles);
    }

    /**
     * Adds CSS classes to the root element.
     */
    protected addClasses(...classNames: string[]): void {
        this.element.classList.add(...classNames.filter(Boolean));
    }

    /**
     * Updates props and triggers a re-render. 
     * Useful for dynamic components.
     */
    public updateProps(newProps: Partial<TProps>): void {
        this._props = { ...this._props, ...newProps };
        // Clear existing children before re-rendering
        this.element.innerHTML = '';
        // const stack = new Error().stack;
        // console.log(`updateProps ${stack}\n${JSON.stringify(newProps, null, 2)}`);
        this.render();
    }

    public get props(): TProps {
        return this._props;
    }

    /**
     * Lifecycle method for cleanup. Remove event listeners here.
     */
    public destroy(): void {
        this.element.remove();
    }

    /**
     * Alias for destroy to match IDE naming conventions.
     */
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.destroy();
    }
}