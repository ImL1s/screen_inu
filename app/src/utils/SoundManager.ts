class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    constructor() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    private createOscillator(type: OscillatorType, freq: number, startTime: number, duration: number, gainValue: number = 0.1) {
        if (!this.ctx || !this.enabled) return;

        // Resume suspended AudioContext (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(gainValue, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    public playBark() {
        if (!this.ctx || !this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;

        // "Woof" - Low pitch square wave with pitch drop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);

        // Little high pitch yip
        this.createOscillator('triangle', 600, now, 0.05, 0.1);
    }

    public playShutter() {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;

        // Click sound
        this.createOscillator('square', 800, now, 0.05, 0.1);
        this.createOscillator('square', 600, now + 0.05, 0.05, 0.1);
    }

    public playSuccess() {
        if (!this.ctx || !this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const now = this.ctx.currentTime;

        // "Ding!" - High pitch sine wave
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // Octave jump

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0); // Long Decay

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.0);

        // Harmony
        this.createOscillator('sine', 1108, now + 0.05, 0.5, 0.05); // C#6
    }

    public playError() {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;

        this.createOscillator('sawtooth', 150, now, 0.2, 0.2);
        this.createOscillator('sawtooth', 120, now + 0.1, 0.3, 0.2);
    }
}

export const soundManager = new SoundManager();
