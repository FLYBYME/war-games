
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface IconProps {
    icon: string;
    size?: 'sm' | 'md' | 'lg';
    color?: string;
}

export class Icon extends BaseComponent<IconProps> {
    constructor(props: IconProps) {
        super('i', props);
        this.render();
    }

    public render(): void {
        const { icon, size = 'md', color } = this.props;
        this.element.className = icon;
        this.applyStyles({
            fontSize: size === 'sm' ? '12px' : size === 'md' ? '16px' : '20px',
            color: color || Theme.colors.textMain,
        });
    }
}