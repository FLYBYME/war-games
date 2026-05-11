// src/client/ui-lib/layout/Carousel.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface CarouselProps {
    items: (BaseComponent<any> | HTMLElement)[];
    width?: string;
    height?: string;
}

export class Carousel extends BaseComponent<CarouselProps> {
    private currentIndex: number = 0;
    private track!: HTMLElement;

    constructor(props: CarouselProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { items, width = '100%', height = '200px' } = this.props;

        this.applyStyles({
            position: 'relative',
            width,
            height,
            overflow: 'hidden',
            borderRadius: Theme.radius,
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            fontFamily: Theme.font.family
        });

        this.element.innerHTML = '';

        // Track
        this.track = document.createElement('div');
        Object.assign(this.track.style, {
            display: 'flex',
            width: `${items.length * 100}%`,
            height: '100%',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        });

        items.forEach(item => {
            const slide = document.createElement('div');
            Object.assign(slide.style, {
                width: `${100 / items.length}%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            });
            if (item instanceof BaseComponent) slide.appendChild(item.getElement());
            else slide.appendChild(item);
            this.track.appendChild(slide);
        });

        this.element.appendChild(this.track);

        // Controls
        if (items.length > 1) {
            const prev = this.createButton('fas fa-chevron-left', { left: '8px' }, () => this.move(-1));
            const next = this.createButton('fas fa-chevron-right', { right: '8px' }, () => this.move(1));
            this.element.appendChild(prev);
            this.element.appendChild(next);

            // Indicators
            const indicators = document.createElement('div');
            Object.assign(indicators.style, {
                position: 'absolute',
                bottom: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px'
            });

            items.forEach((_, i) => {
                const dot = document.createElement('div');
                Object.assign(dot.style, {
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: i === this.currentIndex ? Theme.colors.accent : Theme.colors.border,
                    transition: 'background-color 0.3s'
                });
                indicators.appendChild(dot);
            });
            this.element.appendChild(indicators);
        }
    }

    private createButton(iconClass: string, styles: Partial<CSSStyleDeclaration>, onClick: () => void): HTMLElement {
        const btn = document.createElement('button');
        Object.assign(btn.style, {
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            color: '#fff',
            border: 'none',
            width: '32px', height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '10',
            ...styles
        });
        btn.innerHTML = `<i class="${iconClass}"></i>`;
        btn.onclick = (e) => { e.stopPropagation(); onClick(); };
        btn.onmouseenter = () => btn.style.backgroundColor = 'rgba(0,0,0,0.5)';
        btn.onmouseleave = () => btn.style.backgroundColor = 'rgba(0,0,0,0.3)';
        return btn;
    }

    private move(dir: number): void {
        const count = this.props.items.length;
        this.currentIndex = (this.currentIndex + dir + count) % count;
        this.track.style.transform = `translateX(-${(this.currentIndex * 100) / count}%)`;
        this.render(); // Re-render to update indicators (could be optimized)
    }
}
