export type AudioPresetName =
  | 'chime'
  | 'soft-chime'
  | 'ambient-gong'
  | 'beep'
  | 'tick'
  | 'bell-echo'
  | 'digital-sweep'
  | 'bell'
  | 'gong'
  | 'notification'
  | 'default';

export class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private activeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
  private isGestureInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initOnUserGesture();
    }
  }

  /**
   * Register user gesture listeners to resume or initialize AudioContext.
   */
  public initOnUserGesture(): void {
    if (typeof window === 'undefined' || this.isGestureInitialized) return;
    this.isGestureInitialized = true;

    const unlockHandler = async () => {
      await this.ensureContext();
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('click', unlockHandler, { once: true, passive: true });
    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
  }

  /**
   * Lazily create AudioContext and ensure it is not suspended.
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;

    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return null;
        this.ctx = new AudioContextClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      return this.ctx;
    } catch (err) {
      console.warn('[AudioSynthesizer] Failed to initialize/resume AudioContext:', err);
      return null;
    }
  }

  /**
   * Stop all currently playing synthesized tones immediately.
   */
  public stop(): void {
    try {
      for (const { osc } of this.activeNodes) {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      }
      this.activeNodes = [];
    } catch {}
  }

  /**
   * Play a synthesized sound preset with volume and pitch controls.
   *
   * @param preset - Name of preset ('chime', 'soft-chime', 'ambient-gong', 'beep', 'tick', etc.)
   * @param volumeOverride - Volume scale (either 0.0 - 1.0 or 0 - 100 percentage)
   * @param pitchHz - Optional fundamental frequency override in Hz
   */
  public async play(
    preset: AudioPresetName | string,
    volumeOverride?: number,
    pitchHz?: number
  ): Promise<void> {
    const ctx = await this.ensureContext();
    if (!ctx) return;

    // Normalize volume to 0.0 - 1.0 range
    let vol = 0.8;
    if (volumeOverride !== undefined) {
      vol = volumeOverride > 1 ? volumeOverride / 100 : volumeOverride;
    }
    vol = Math.max(0, Math.min(1, vol));
    if (vol === 0) return;

    const startTime = ctx.currentTime;

    const playTone = (
      freq: number,
      type: OscillatorType,
      delay: number,
      duration: number,
      baseVol: number,
      attack = 0.02
    ) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime + delay);

        const targetGain = baseVol * vol;
        const actualStart = startTime + delay;

        gain.gain.setValueAtTime(0.0001, actualStart);
        gain.gain.linearRampToValueAtTime(targetGain, actualStart + Math.min(attack, duration * 0.2));
        gain.gain.exponentialRampToValueAtTime(0.00001, actualStart + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(actualStart);
        osc.stop(actualStart + duration + 0.05);

        const nodeRef = { osc, gain };
        this.activeNodes.push(nodeRef);
        setTimeout(() => {
          const idx = this.activeNodes.indexOf(nodeRef);
          if (idx !== -1) this.activeNodes.splice(idx, 1);
        }, (delay + duration + 0.1) * 1000);
      } catch (err) {
        console.warn('[AudioSynthesizer] Tone play error:', err);
      }
    };

    switch (preset) {
      case 'tick': {
        const freq = pitchHz || 1200;
        playTone(freq, 'sine', 0, 0.08, 0.18, 0.005);
        break;
      }

      case 'chime':
      case 'default': {
        if (pitchHz) {
          playTone(pitchHz, 'triangle', 0, 0.6, 0.25, 0.02);
        } else {
          // Quad-tone arpeggiated harmonic chord: C5, E5, G5, C6 with exponential decays
          playTone(523.25, 'sine', 0.00, 1.2, 0.20, 0.02);
          playTone(659.25, 'sine', 0.15, 1.2, 0.20, 0.02);
          playTone(783.99, 'sine', 0.30, 1.8, 0.20, 0.02);
          playTone(1046.50, 'sine', 0.45, 2.4, 0.25, 0.03);
        }
        break;
      }

      case 'soft-chime': {
        // Triangle wave triad (A4 440Hz, E4 329.63Hz, A4 440Hz) with gentle envelope
        playTone(440.00, 'triangle', 0.00, 1.5, 0.15, 0.08);
        playTone(329.63, 'triangle', 0.35, 1.8, 0.15, 0.08);
        playTone(440.00, 'triangle', 0.70, 2.2, 0.12, 0.08);
        break;
      }

      case 'ambient-gong':
      case 'gong': {
        // Deep fundamental (A2 110Hz) + rich sub-harmonics (220Hz, 329.63Hz, 440Hz) with lingering decay
        playTone(110.00, 'triangle', 0.00, 3.5, 0.30, 0.04);
        playTone(220.00, 'sine', 0.05, 3.0, 0.18, 0.05);
        playTone(329.63, 'sine', 0.10, 2.5, 0.12, 0.06);
        playTone(440.00, 'sine', 0.15, 2.0, 0.10, 0.08);
        break;
      }

      case 'beep': {
        // Dual-pulsed 880Hz square/sine wave
        playTone(880.00, 'sine', 0.00, 0.25, 0.15, 0.01);
        playTone(880.00, 'sine', 0.35, 0.35, 0.15, 0.01);
        break;
      }

      case 'bell-echo':
      case 'bell': {
        playTone(659.25, 'sine', 0.00, 2.0, 0.20, 0.02);
        playTone(830.61, 'sine', 0.15, 2.0, 0.15, 0.02);
        playTone(987.77, 'sine', 0.30, 2.5, 0.15, 0.02);
        playTone(1318.51, 'sine', 0.45, 3.0, 0.18, 0.03);
        playTone(659.25, 'sine', 0.80, 1.5, 0.06, 0.05);
        playTone(1318.51, 'sine', 1.20, 1.5, 0.05, 0.05);
        break;
      }

      case 'digital-sweep': {
        playTone(523.25, 'sine', 0.00, 0.25, 0.10, 0.01);
        playTone(587.33, 'sine', 0.08, 0.25, 0.10, 0.01);
        playTone(659.25, 'sine', 0.16, 0.25, 0.10, 0.01);
        playTone(783.99, 'sine', 0.24, 0.40, 0.14, 0.01);
        playTone(1046.50, 'sine', 0.32, 0.80, 0.18, 0.02);
        break;
      }

      case 'notification': {
        playTone(587.33, 'sine', 0.00, 0.30, 0.18, 0.01);
        playTone(880.00, 'sine', 0.12, 0.60, 0.22, 0.02);
        break;
      }

      default: {
        playTone(523.25, 'sine', 0.00, 1.0, 0.18, 0.02);
        playTone(659.25, 'sine', 0.15, 1.2, 0.18, 0.02);
        playTone(783.99, 'sine', 0.30, 1.5, 0.20, 0.02);
        break;
      }
    }
  }

  public playPreset(preset: AudioPresetName | string, volumeOverride?: number): Promise<void> {
    return this.play(preset, volumeOverride);
  }

  public playTick(volumeOverride?: number): void {
    this.play('tick', volumeOverride).catch(() => {});
  }

  public playChime(volumeOverride?: number, pitchHz?: number): void {
    this.play('chime', volumeOverride, pitchHz).catch(() => {});
  }
}

export const audioSynthesizer = new AudioSynthesizer();

export function playAudioPreset(preset: AudioPresetName | string, volumeOverride?: number): Promise<void> {
  return audioSynthesizer.play(preset, volumeOverride);
}

export function playSynthesizedSound(
  type: 'chime' | 'tick' | string,
  volumeOverride?: number,
  pitchHz?: number
): void {
  audioSynthesizer.play(type, volumeOverride, pitchHz).catch(() => {});
}
