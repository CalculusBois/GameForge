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

    unlock() {
        const ctx = this.ensure();
        if (ctx.state === 'suspended') void ctx.resume();
    }

    private ensure() {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.55;
            this.master.connect(this.ctx.destination);
        }
        return this.ctx;
    }

    private tone({ freq, type = 'square', dur, gain = 0.12, slide, delay = 0 }: Tone) {
        const ctx = this.ensure();
        if (ctx.state === 'suspended') void ctx.resume();
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slide != null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g);
        g.connect(this.master!);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
    }

    private noise(dur: number, gain = 0.08, filterFreq = 1200, type: BiquadFilterType = 'bandpass') {
        const ctx = this.ensure();
        if (ctx.state === 'suspended') void ctx.resume();
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
    }

    /** Soft UI tick — short high blip */
    ui() {
        this.tone({ freq: 880, type: 'triangle', dur: 0.06, gain: 0.07 });
        this.tone({ freq: 1320, type: 'sine', dur: 0.05, gain: 0.04, delay: 0.02 });
    }

    /** Mining chips — distinct grit per material */
    mine(material: number = 1, now = performance.now()) {
        if (now - this.lastMine < 140) return;
        this.lastMine = now;
        if (material === 1 || material === 9) {
            // Soil / turf — soft earthy thump
            this.noise(0.06, 0.07, 320, 'lowpass');
            this.tone({ freq: 140 + Math.random() * 30, type: 'sine', dur: 0.06, gain: 0.05, slide: 80 });
        } else if (material === 2 || material === 7) {
            // Stone / brick — hard clack
            this.noise(0.05, 0.09, 1400, 'bandpass');
            this.tone({ freq: 260 + Math.random() * 40, type: 'square', dur: 0.045, gain: 0.06, slide: 120 });
        } else if (material === 3) {
            // Iron — metallic ring
            this.tone({ freq: 480, type: 'triangle', dur: 0.08, gain: 0.07, slide: 220 });
            this.tone({ freq: 720, type: 'sine', dur: 0.06, gain: 0.04, delay: 0.02 });
            this.noise(0.04, 0.05, 2000, 'highpass');
        } else if (material === 4) {
            // Crystal — glassy chime
            this.tone({ freq: 880, type: 'sine', dur: 0.1, gain: 0.06, slide: 1320 });
            this.tone({ freq: 1320, type: 'triangle', dur: 0.08, gain: 0.035, delay: 0.03 });
        } else if (material === 5) {
            // Scrap — rattly crunch
            this.noise(0.08, 0.1, 700, 'bandpass');
            this.tone({ freq: 200 + Math.random() * 80, type: 'sawtooth', dur: 0.07, gain: 0.055, slide: 90 });
        } else if (material === 8) {
            // Torch — light tap
            this.tone({ freq: 600, type: 'triangle', dur: 0.04, gain: 0.04 });
        } else {
            this.noise(0.07, 0.08, 900, 'bandpass');
            this.tone({ freq: 180 + Math.random() * 40, type: 'sawtooth', dur: 0.05, gain: 0.05, slide: 90 });
        }
    }

    /** Footsteps — low thud */
    walk(now = performance.now()) {
        if (now - this.lastWalk < 260) return;
        this.lastWalk = now;
        this.noise(0.05, 0.07, 280, 'lowpass');
        this.tone({ freq: 95, type: 'sine', dur: 0.07, gain: 0.06, slide: 60 });
    }

    /** Weapon fire / swing — bright zap or whoosh */
    weapon(kind: 'melee' | 'ranged' | 'magic' = 'ranged') {
        if (kind === 'melee') {
            this.noise(0.09, 0.09, 600, 'highpass');
            this.tone({ freq: 420, type: 'sawtooth', dur: 0.1, gain: 0.08, slide: 160 });
        } else if (kind === 'magic') {
            this.tone({ freq: 520, type: 'sine', dur: 0.18, gain: 0.09, slide: 920 });
            this.tone({ freq: 780, type: 'triangle', dur: 0.14, gain: 0.05, delay: 0.03 });
        } else {
            this.tone({ freq: 640, type: 'square', dur: 0.08, gain: 0.07, slide: 220 });
            this.noise(0.05, 0.05, 1800, 'highpass');
        }
    }

    /** Enemy death — falling crunch */
    death() {
        this.tone({ freq: 320, type: 'sawtooth', dur: 0.28, gain: 0.1, slide: 70 });
        this.noise(0.2, 0.1, 500, 'lowpass');
        this.tone({ freq: 180, type: 'square', dur: 0.15, gain: 0.05, delay: 0.08, slide: 55 });
    }

    /** Soft, calm ambient drone while exploring — silent on pause screens */
    startBgm() {
        if (this.bgmOn) return;
        const ctx = this.ensure();
        if (ctx.state === 'suspended') void ctx.resume();
        this.bgmOn = true;
        this.stopBgmNodes();

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        filter.Q.value = 0.5;
        filter.connect(this.master!);
        this.bgmNodes.push(filter);

        // Quiet open fifth + soft root — calm, not busy
        const voices: Array<{ freq: number; gain: number }> = [
            { freq: 65.41, gain: 0.012 },  // C2
            { freq: 98.00, gain: 0.009 },  // G2
            { freq: 130.81, gain: 0.005 }, // C3 (very soft)
        ];
        for (const { freq, gain } of voices) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 2.5);
            osc.connect(g);
            g.connect(filter);
            osc.start();
            this.bgmNodes.push(osc, g);
        }
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
