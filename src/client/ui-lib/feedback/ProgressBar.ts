// ui-lib/feedback/ProgressBar.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface ProgressBarProps {
    progress?: number; // 0 to 100
    infinite?: boolean;
    height?: string;
}

export class ProgressBar extends BaseComponent<ProgressBarProps> {
    private innerElement: HTMLDivElement;

    constructor(props: ProgressBarProps = {}) {
        super('div', props);
        this.innerElement = document.createElement('div');
        this.element.appendChild(this.innerElement);
        this.render();
    }

    public render(): void {
        const {
            progress = 0,
            infinite = false,
            height = '2px'
        } = this.props;

        this.applyStyles({
            width: '100%',
            height,
            backgroundColor: Theme.colors.bgTertiary,
            overflow: 'hidden',
            position: 'relative',
        });

        const innerStyles: Partial<CSSStyleDeclaration> = {
            height: '100%',
            backgroundColor: Theme.colors.accent,
            transition: infinite ? 'none' : 'width 0.3s ease-in-out',
            width: infinite ? '30%' : `${progress}%`,
        };

        if (infinite) {
            this.addInfiniteAnimation();
        } else {
            this.removeInfiniteAnimation();
        }

        Object.assign(this.innerElement.style, innerStyles);
    }

    private addInfiniteAnimation(): void {
        // Inject keyframes if not already present
        if (!document.getElementById('progress-bar-infinite-style')) {
            const style = document.createElement('style');
            style.id = 'progress-bar-infinite-style';
            style.textContent = `
                @keyframes progress-infinite {
                    0% { left: -30%; }
                    100% { left: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        this.innerElement.style.position = 'absolute';
        this.innerElement.style.animation = 'progress-infinite 1.5s infinite linear';
    }

    private removeInfiniteAnimation(): void {
        this.innerElement.style.position = 'static';
        this.innerElement.style.animation = 'none';
    }

    public setProgress(progress: number): void {
        this.updateProps({ progress, infinite: false });
    }

    public setInfinite(infinite: boolean): void {
        this.updateProps({ infinite });
    }
}
