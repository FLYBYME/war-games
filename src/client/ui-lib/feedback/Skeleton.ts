// src/client/ui-lib/feedback/Skeleton.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface SkeletonProps {
    width?: string;
    height?: string;
    variant?: 'text' | 'circle' | 'rect';
    animation?: 'pulse' | 'wave' | 'none';
}

export class Skeleton extends BaseComponent<SkeletonProps> {
    constructor(props: SkeletonProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { width = '100%', height = '1em', variant = 'text', animation = 'pulse' } = this.props;

        this.applyStyles({
            width,
            height: variant === 'text' ? '12px' : height,
            backgroundColor: Theme.colors.bgTertiary,
            borderRadius: variant === 'circle' ? '50%' : (variant === 'text' ? '2px' : Theme.radius),
            display: 'block',
            position: 'relative',
            overflow: 'hidden'
        });

        if (animation !== 'none') {
            this.element.classList.add(`skeleton-${animation}`);
        }

        // Add CSS for animation if not present
        if (!document.getElementById('ui-lib-skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'ui-lib-skeleton-styles';
            style.textContent = `
                @keyframes skeleton-pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.4; }
                    100% { opacity: 1; }
                }
                .skeleton-pulse {
                    animation: skeleton-pulse 1.5s ease-in-out infinite;
                }
                @keyframes skeleton-wave {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .skeleton-wave::after {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
                    animation: skeleton-wave 1.5s linear infinite;
                }
            `;
            document.head.appendChild(style);
        }
    }
}
