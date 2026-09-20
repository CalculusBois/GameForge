/** Procedural game audio via Web Audio API (no external asset files). */

type Tone = { freq: number; type?: OscillatorType; dur: number; gain?: number; slide?: number; delay?: number };

class GameAudio {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private bgmNodes: AudioNode[] = [];
    private bgmTimer: number | null = null;
    private lastWalk = 0;
    private lastMine = 0;
    private bgmOn = false;
    private resumeHooked = false;
    private volume = 0.35;

    unlock() {
        void this.wake();
    }

    setVolume(n: number) {
        this.volume = Math.max(0, Math.min(1, n));
        if (this.master) this.master.gain.value = this.volume;
    }

    private ensure() {
        if (!this.ctx) {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            this.ctx = new Ctx();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
            this.hookResume();
        }
        return this.ctx;
    }

    private hookResume() {
        if (this.resumeHooked) return;
        this.resumeHooked = true;
        const wake = () => { void this.wake(); };
        window.addEventListener('pointerdown', wake);
        window.addEventListener('keydown', wake);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) void this.wake();
        });
    }

    private async wake() {
        const ctx = this.ensure();
        if (ctx.state === 'suspended') {
            try { await ctx.resume(); } catch { /* autoplay policy */ }
        }
        if (this.master) this.master.gain.value = this.volume;
    }

    private async ready() {
        await this.wake();
        return this.ctx!;
    }

    private tone({ freq, type = 'square', dur, gain = 0.12, slide, delay = 0 }: Tone) {
        void this.ready().then(ctx => {
            if (ctx.state !== 'running') return;
            const t0 = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(Math.max(40, freq), t0);
            if (slide != null) osc.frequency.linearRampToValueAtTime(Math.max(40, slide), t0 + dur);
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
            g.gain.linearRampToValueAtTime(0, t0 + dur);
            osc.connect(g);
            g.connect(this.master!);
            osc.start(t0);
            osc.stop(t0 + dur + 0.03);
        });
    }

    private noise(dur: number, gain = 0.08, filterFreq = 1200, type: BiquadFilterType = 'bandpass') {
        void this.ready().then(ctx => {
            if (ctx.state !== 'running') return;
            const n = Math.ceil(ctx.sampleRate * dur);
            const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = type;
            filter.frequency.value = filterFreq;
            const g = ctx.createGain();
            g.gain.value = gain;
            src.connect(filter);
            filter.connect(g);
            g.connect(this.master!);
            src.start();
        });
    }

    ui() {
        this.tone({ freq: 880, type: 'triangle', dur: 0.06, gain: 0.08 });
        this.tone({ freq: 1320, type: 'sine', dur: 0.05, gain: 0.05, delay: 0.02 });
    }

    mine(material: number = 1, now = performance.now()) {
        if (now - this.lastMine < 140) return;
        this.lastMine = now;
        if (material === 1 || material === 9) {
            this.noise(0.06, 0.08, 320, 'lowpass');
            this.tone({ freq: 140 + Math.random() * 30, type: 'sine', dur: 0.06, gain: 0.06, slide: 80 });
        } else if (material === 2 || material === 7) {
            this.noise(0.05, 0.1, 1400, 'bandpass');
            this.tone({ freq: 260 + Math.random() * 40, type: 'square', dur: 0.045, gain: 0.07, slide: 120 });
        } else if (material === 3) {
            this.tone({ freq: 480, type: 'triangle', dur: 0.08, gain: 0.08, slide: 220 });
            this.tone({ freq: 720, type: 'sine', dur: 0.06, gain: 0.05, delay: 0.02 });
            this.noise(0.04, 0.06, 2000, 'highpass');
        } else if (material === 4) {
            this.tone({ freq: 880, type: 'sine', dur: 0.1, gain: 0.07, slide: 1320 });
            this.tone({ freq: 1320, type: 'triangle', dur: 0.08, gain: 0.04, delay: 0.03 });
        } else if (material === 5) {
            this.noise(0.08, 0.11, 700, 'bandpass');
            this.tone({ freq: 200 + Math.random() * 80, type: 'sawtooth', dur: 0.07, gain: 0.06, slide: 90 });
        } else if (material === 8) {
            this.tone({ freq: 600, type: 'triangle', dur: 0.04, gain: 0.05 });
        } else {
            this.noise(0.07, 0.09, 900, 'bandpass');
            this.tone({ freq: 180 + Math.random() * 40, type: 'sawtooth', dur: 0.05, gain: 0.06, slide: 90 });
        }
    }

    walk(now = performance.now()) {
        if (now - this.lastWalk < 260) return;
        this.lastWalk = now;
        this.noise(0.05, 0.08, 280, 'lowpass');
        this.tone({ freq: 95, type: 'sine', dur: 0.07, gain: 0.07, slide: 60 });
    }

    weapon(kind: 'melee' | 'ranged' | 'magic' = 'ranged') {
        if (kind === 'melee') {
            this.noise(0.09, 0.1, 600, 'highpass');
            this.tone({ freq: 420, type: 'sawtooth', dur: 0.1, gain: 0.09, slide: 160 });
        } else if (kind === 'magic') {
            this.tone({ freq: 520, type: 'sine', dur: 0.18, gain: 0.1, slide: 920 });
            this.tone({ freq: 780, type: 'triangle', dur: 0.14, gain: 0.06, delay: 0.03 });
        } else {
            this.tone({ freq: 640, type: 'square', dur: 0.08, gain: 0.08, slide: 220 });
            this.noise(0.05, 0.06, 1800, 'highpass');
        }
    }

    death() {
        this.tone({ freq: 320, type: 'sawtooth', dur: 0.28, gain: 0.11, slide: 70 });
        this.noise(0.2, 0.11, 500, 'lowpass');
        this.tone({ freq: 180, type: 'square', dur: 0.15, gain: 0.06, delay: 0.08, slide: 55 });
    }

    startBgm() {
        if (this.bgmOn) return;
        void this.ready().then(ctx => {
            if (this.bgmOn || ctx.state !== 'running') return;
            this.bgmOn = true;
            this.stopBgmNodes();

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 420;
            filter.Q.value = 0.5;
            filter.connect(this.master!);
            this.bgmNodes.push(filter);

            const voices: Array<{ freq: number; gain: number }> = [
                { freq: 65.41, gain: 0.014 },
                { freq: 98.00, gain: 0.01 },
                { freq: 130.81, gain: 0.006 },
            ];
            for (const { freq, gain } of voices) {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0, ctx.currentTime);
                g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 2.5);
                osc.connect(g);
                g.connect(filter);
                osc.start();
                this.bgmNodes.push(osc, g);
            }
        });
    }

    private stopBgmNodes() {
        for (const node of this.bgmNodes) {
            try {
                if ('stop' in node && typeof (node as OscillatorNode).stop === 'function')
                    (node as OscillatorNode).stop();
                node.disconnect();
            } catch { /* already stopped */ }
        }
        this.bgmNodes = [];
    }

    stopBgm() {
        this.bgmOn = false;
        if (this.bgmTimer != null) {
            window.clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.stopBgmNodes();
    }
}

export const gameAudio = new GameAudio();
