/**
 * Procedural Web Audio Synthesizer.
 * Zero-asset audio engine generating weight-scaled retro/fantasy sounds
 * for push-up validation, weapon slashes, critical hits, and dungeon impacts.
 */

export class AudioSynth {
  private static instance: AudioSynth;
  private ctx: AudioContext | null = null;
  private muted = false;

  private constructor() {}

  public static getInstance(): AudioSynth {
    if (!AudioSynth.instance) {
      AudioSynth.instance = new AudioSynth();
    }
    return AudioSynth.instance;
  }

  private initContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /**
   * Resonant crystal chime triggered on validated push-up rep.
   */
  public playRepValidated(quality: string): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = quality === 'PERFECT' ? 659.25 : quality === 'GREAT' ? 523.25 : 440; // E5 or C5 or A4
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.35);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  /**
   * Sword / weapon slash whoosh.
   */
  public playSlash(pitchMultiplier = 1.0): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const pitchVariation = 0.92 + Math.random() * 0.16;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 * pitchMultiplier * pitchVariation, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Heavy crunch hit on enemy impact.
   */
  public playHit(isCrit = false): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isCrit ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(isCrit ? 320 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(isCrit ? 0.35 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Triumphant fanfare when unlocking a new weapon through milestones.
   */
  public playWeaponUnlocked(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.2, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.45);
    });
  }

  /**
   * Warning cue when form is shallow or hips sag.
   */
  public playFormWarning(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const audioSynth = AudioSynth.getInstance();
