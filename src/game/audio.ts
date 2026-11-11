/**
 * Procedural Web Audio API synthesizer for Apex Drift
 * Zero external audio files (100% procedural)
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  
  // Continuous engine sound nodes
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Continuous tire skid sound nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;

  // Nitro loop nodes
  private nitroNoise: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  private isRunning: boolean = false;

  constructor() {
    // Lazy init on first user gesture
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      // Audio not supported
    }
  }

  public resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain) {
      this.engineGain.gain.value = muted ? 0 : 0.18;
    }
    if (this.skidGain && muted) {
      this.skidGain.gain.value = 0;
    }
    if (this.nitroGain && muted) {
      this.nitroGain.gain.value = 0;
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public startEngine() {
    this.resume();
    if (!this.ctx || this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Dual oscillator engine rumble
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.16, this.ctx.currentTime);

      this.engineOsc.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start();
      this.engineOsc2.start();

      // 2. Continuous tire skid noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.skidNode = this.ctx.createBufferSource();
      this.skidNode.buffer = noiseBuffer;
      this.skidNode.loop = true;

      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.skidNode.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.ctx.destination);
      this.skidNode.start();

      // 3. Continuous nitro roar buffer
      this.nitroNoise = this.ctx.createBufferSource();
      this.nitroNoise.buffer = noiseBuffer;
      this.nitroNoise.loop = true;

      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'bandpass';
      this.nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.nitroFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.nitroNoise.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.ctx.destination);
      this.nitroNoise.start();
    } catch {
      // Audio node failure fallback
    }
  }

  public updateEngine(speedMps: number, isDrifting: boolean, driftSlip: number, isNitro: boolean) {
    if (!this.ctx || !this.isRunning || this.isMuted) return;

    const t = this.ctx.currentTime;
    const speedKmh = Math.abs(speedMps) * 3.6;

    // RPM simulated from speed and gears
    const speedNorm = Math.min(1, speedKmh / 280);
    const gearCycle = (speedNorm * 5) % 1; // 5 virtual gear steps
    const rpmPitch = 50 + gearCycle * 70 + speedNorm * 60;

    if (this.engineOsc && this.engineOsc2 && this.engineFilter) {
      this.engineOsc.frequency.setTargetAtTime(rpmPitch, t, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(rpmPitch * 2.02, t, 0.05);
      this.engineFilter.frequency.setTargetAtTime(300 + speedNorm * 1100 + (isNitro ? 500 : 0), t, 0.05);
    }

    // Tire screech
    if (this.skidGain && this.skidFilter) {
      const targetSkid = isDrifting ? Math.min(0.28, driftSlip * 0.32) : 0;
      this.skidGain.gain.setTargetAtTime(targetSkid, t, 0.04);
      this.skidFilter.frequency.setTargetAtTime(1200 + driftSlip * 800, t, 0.05);
    }

    // Nitro sound
    if (this.nitroGain && this.nitroFilter) {
      const targetNitro = isNitro ? 0.35 : 0;
      this.nitroGain.gain.setTargetAtTime(targetNitro, t, 0.06);
      if (isNitro) {
        this.nitroFilter.frequency.setTargetAtTime(1400, t, 0.08);
      }
    }
  }

  public stopEngine() {
    if (!this.ctx || !this.isRunning) return;
    this.isRunning = false;
    try {
      this.engineOsc?.stop();
      this.engineOsc2?.stop();
      this.skidNode?.stop();
      this.nitroNoise?.stop();
      this.engineOsc?.disconnect();
      this.engineOsc2?.disconnect();
      this.skidNode?.disconnect();
      this.nitroNoise?.disconnect();
    } catch {
      // Ignore
    }
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.skidNode = null;
    this.nitroNoise = null;
  }

  /**
   * Sound effects
   */
  public playCrash(weight: 'light' | 'heavy' = 'light') {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const startFreq = weight === 'heavy' ? 140 : 220;
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + (weight === 'heavy' ? 0.35 : 0.2));

      gain.gain.setValueAtTime(weight === 'heavy' ? 0.5 : 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + (weight === 'heavy' ? 0.35 : 0.2));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (weight === 'heavy' ? 0.36 : 0.21));
    } catch {}
  }

  public playNearMiss() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    } catch {}
  }

  public playPickup() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.15, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.13);
      });
    } catch {}
  }

  public playNitroIgnite() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.2);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch {}
  }

  public playCountdownBeep(isFinal: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isFinal ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + (isFinal ? 0.35 : 0.18));
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (isFinal ? 0.36 : 0.19));
    } catch {}
  }

  public playGameOver() {
    if (!this.ctx || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      [330, 293.66, 261.63, 220].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + idx * 0.15);
        gain.gain.setValueAtTime(0.25, t + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.15);
        osc.stop(t + idx * 0.15 + 0.32);
      });
    } catch {}
  }
}

export const soundManager = new SoundManager();
