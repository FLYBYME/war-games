import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { ProgressBar } from './ProgressBar';
import { Text } from '../typography/Text';

export interface Step {
    label: string;
    description?: string;
}

export interface StepProgressProps {
    steps: Step[];
    currentStepIndex: number; // 0-based
}

export class StepProgress extends BaseComponent<StepProgressProps> {
    constructor(props: StepProgressProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        const { steps, currentStepIndex } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.md,
            width: '100%'
        });

        // Overall progress bar [cite: 38]
        const totalProgress = (currentStepIndex / (steps.length - 1)) * 100;
        const bar = new ProgressBar({ progress: totalProgress, height: '4px' });
        this.element.appendChild(bar.getElement());

        // Step Labels
        const labelsContainer = document.createElement('div');
        Object.assign(labelsContainer.style, {
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
        });

        steps.forEach((step, index) => {
            const stepWrapper = document.createElement('div');
            stepWrapper.style.textAlign = 'center';
            stepWrapper.style.flex = '1';

            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            const label = new Text({
                text: step.label,
                size: 'sm',
                variant: (isActive || isCompleted) ? 'main' : 'muted',
                weight: isActive ? 'bold' : 'normal'
            });

            const dot = document.createElement('div');
            Object.assign(dot.style, {
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? Theme.colors.success :
                    isActive ? Theme.colors.accent :
                        Theme.colors.bgTertiary,
                margin: '4px auto'
            });

            stepWrapper.appendChild(dot);
            stepWrapper.appendChild(label.getElement());
            labelsContainer.appendChild(stepWrapper);
        });

        this.element.appendChild(labelsContainer);
    }
}