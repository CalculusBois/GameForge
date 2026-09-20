/** Tiny original synthesized cues. Audio is created only after a user gesture. */
export class GameSound {
  private context?: AudioContext;
  private master?: GainNode;
  private last = 0;
  volume = 0.15;

  unlock() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context ??= new Ctx();
    if (!this.master && this.context) {
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    void this.context.resume().catch(() => {});
  }

  setVolume(n: number) {
    this.volume = Math.max(0, Math.min(1, n));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(kind: 'attack' | 'mine' | 'damage' | 'reward' | 'boss' | 'walk' | 'ui') {
    this.unlock();
    const c = this.context;
    if (!c || c.state !== 'running' || this.volume <= 0.001) return;
    const minGap = kind === 'walk' ? 0.22 : kind === 'mine' ? 0.12 : 0.045;
    if (c.currentTime - this.last < minGap) return;
    this.last = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    const pitch = { attack: 380, mine: 130, damage: 85, reward: 740, boss: 60, walk: 95, ui: 880 }[kind];
    o.type = kind === 'reward' || kind === 'ui' ? 'sine' : kind === 'walk' ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(pitch, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, pitch * 0.6), c.currentTime + 0.1);
    const peak = this.volume * (kind === 'boss' ? 0.28 : kind === 'damage' ? 0.22 : kind === 'walk' ? 0.12 : 0.2);
    g.gain.setValueAtTime(peak, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (kind === 'boss' ? 0.22 : 0.14));
    o.connect(g);
    g.connect(this.master ?? c.destination);
    o.start();
    o.stop(c.currentTime + 0.24);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  close() {
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.master = undefined;
  }
}
