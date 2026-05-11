import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Slider } from './Slider';
import { Popover } from '../overlays/Popover';

export interface ColorPickerProps {
    color: string; // e.g., "hsl(200, 50%, 50%)"
    onChange: (color: string) => void;
}

export class ColorPicker extends BaseComponent<ColorPickerProps> {
    private preview: HTMLDivElement;

    constructor(props: ColorPickerProps) {
        super('div', props);
        this.preview = document.createElement('div');
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        Object.assign(this.preview.style, {
            width: '24px',
            height: '24px',
            borderRadius: Theme.radius,
            backgroundColor: this.props.color,
            border: `1px solid ${Theme.colors.border}`,
            cursor: 'pointer'
        });

        this.preview.onclick = () => this.openPicker();
        this.element.appendChild(this.preview);
    }

    private openPicker(): void {
        const container = document.createElement('div');
        container.style.padding = Theme.spacing.sm;

        // Hue Slider
        const hueSlider = new Slider({
            min: 0,
            max: 360,
            label: 'Hue',
            onChange: (val) => this.props.onChange(`hsl(${val}, 100%, 50%)`)
        });

        // Saturation/Brightness Canvas Mockup
        const canvas = document.createElement('div');
        Object.assign(canvas.style, {
            width: '150px',
            height: '100px',
            marginTop: Theme.spacing.sm,
            background: `linear-gradient(to top, black, transparent), 
                         linear-gradient(to right, white, ${this.props.color})`,
            borderRadius: Theme.radius
        });

        container.appendChild(hueSlider.getElement());
        container.appendChild(canvas);

        const popover = new Popover({
            anchor: this.preview,
            content: [container],
            placement: 'right'
        });
        popover.show();
    }
}