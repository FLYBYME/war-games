import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export class SimControl extends BaseComponent<{
    isPaused: boolean;
    speed: number;
    onTogglePause: () => void;
    onChangeSpeed: (speed: number) => void;
}> {
    constructor() {
        super('div', { isPaused: true, speed: 1, onTogglePause: () => {}, onChangeSpeed: () => {} });
        this.render();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            height: '100%',
            color: Theme.colors.textMain,
            fontSize: '12px',
            paddingRight: '8px'
        });

        this.element.innerHTML = '';

        // Speed Display
        const speedText = document.createElement('span');
        speedText.innerText = `${this.props.speed}x`;
        speedText.style.minWidth = '35px';
        speedText.style.textAlign = 'center';
        speedText.style.fontWeight = 'bold';
        speedText.style.fontFamily = 'monospace';
        speedText.style.color = '#00e5ff'; // Tactical cyan

        // Speed Up/Down
        const slowBtn = document.createElement('button');
        slowBtn.innerHTML = '<i class="fas fa-minus"></i>';
        this.styleButton(slowBtn);
        slowBtn.onclick = () => this.props.onChangeSpeed(Math.max(1, this.props.speed / 2));

        const fastBtn = document.createElement('button');
        fastBtn.innerHTML = '<i class="fas fa-plus"></i>';
        this.styleButton(fastBtn);
        fastBtn.onclick = () => this.props.onChangeSpeed(Math.min(128, this.props.speed * 2));

        // Master Play/Pause
        const playBtn = document.createElement('button');
        playBtn.innerHTML = this.props.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        this.styleButton(playBtn);
        playBtn.style.padding = '4px 12px';
        playBtn.style.fontSize = '14px';
        playBtn.onclick = () => this.props.onTogglePause();
        
        if (!this.props.isPaused) {
            playBtn.style.color = '#00ff00';
            playBtn.style.textShadow = '0 0 8px rgba(0,255,0,0.6)';
        } else {
            playBtn.style.color = '#ff9800'; // Amber for paused
        }

        this.element.appendChild(slowBtn);
        this.element.appendChild(speedText);
        this.element.appendChild(fastBtn);
        this.element.appendChild(this.createDivider());
        this.element.appendChild(playBtn);
    }

    private styleButton(btn: HTMLButtonElement) {
        Object.assign(btn.style, {
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: Theme.colors.textMain,
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '12px',
            borderRadius: '4px',
            transition: 'all 0.15s ease',
            marginLeft: '2px'
        });
        btn.onmouseover = () => {
            btn.style.backgroundColor = 'rgba(255,255,255,0.15)';
            btn.style.transform = 'scale(1.1)';
        };
        btn.onmouseout = () => {
            btn.style.backgroundColor = 'rgba(255,255,255,0.05)';
            btn.style.transform = 'scale(1.0)';
        };
    }

    private createDivider() {
        const div = document.createElement('div');
        div.style.width = '1px';
        div.style.height = '15px';
        div.style.backgroundColor = Theme.colors.border;
        div.style.margin = '0 4px';
        return div;
    }
}
