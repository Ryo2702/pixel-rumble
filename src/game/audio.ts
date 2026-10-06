import type { CombatEvent, Settings } from '../types';

export class ArcadeAudio {
  private context: AudioContext | null = null;
  private settings: Settings | null = null;
  private nextAmbient = 0;
  private lastEffect = 0;
  enable(settings: Settings) {
    this.settings = settings;
    if (settings.sound && !this.context) this.context = new AudioContext();
    if (settings.sound) void this.context?.resume();
    else void this.context?.suspend();
  }
  configure(settings: Settings) { this.settings = settings; }
  private tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'square', endFrequency = frequency) {
    if (!this.context || !this.settings?.sound || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, endFrequency), now + duration);
    gain.gain.setValueAtTime(Math.max(0.00001, volume * this.settings.master), now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
    oscillator.connect(gain); gain.connect(this.context.destination);
    oscillator.start(); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  effect(event: CombatEvent) {
    if (!this.settings) return;
    const volume = this.settings.effects * 0.065;
    const now = performance.now();
    if (event.kind === 'hit' && now - this.lastEffect > 80) { this.tone(event.ranged ? 440 : 150, 0.065, volume, 'square', 55); this.lastEffect = now; }
    if (event.kind === 'kill') this.tone(180, 0.28, volume * 1.5, 'sawtooth', 28);
    if (event.kind === 'respawn') this.tone(250, 0.4, volume, 'triangle', 1200);
    if (event.kind === 'phase') this.tone(event.text === 'rumble' ? 550 : 330, 0.3, volume, 'triangle', 660);
    if (event.kind === 'payout') this.tone(event.amount! > 0 ? 880 : 160, 0.45, volume, 'sine', event.amount! > 0 ? 1320 : 80);
  }
  ambient(elapsed: number, base: number) {
    if (elapsed < this.nextAmbient || !this.settings) return;
    this.nextAmbient = elapsed + 0.46;
    const notes = [1, 1.5, 2, 1.25, 1, 2, 1.5, 1.125];
    this.tone(base * notes[Math.floor(elapsed / 0.46) % notes.length], 0.4, this.settings.music * 0.05, 'triangle');
  }
  destroy() { void this.context?.close(); this.context = null; }
}
