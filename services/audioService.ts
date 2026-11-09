import { PROGRESSIONS, MelodicNote } from '../constants';

export interface PlayedNoteInfo {
  freq: number;
  note: string;
  chordName: string;
}

class AudioService {
  private ctx: AudioContext | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  // Effect States
  private isReverbOn: boolean = false;
  private isDelayOn: boolean = false;
  
  // Progression State
  private currentProgressionId: string = 'pop-anthem';
  private currentChordIndex: number = 0;

  // Drum Machine / Beat State (Ideas A, B, C)
  private isBeatRunning: boolean = false;
  private beatTimer: number | null = null;
  private nextNoteTime: number = 0;
  private current16thStep: number = 0;
  private bpm: number = 122;
  private currentScore: number = 0;
  private lookaheadMs: number = 25;
  private scheduleAheadTime: number = 0.12;

  // Ambient Synth Pad State (Star Powerup)
  private isPadActive: boolean = false;
  private padGainNode: GainNode | null = null;
  private padFilterNode: BiquadFilterNode | null = null;
  private padOscillators: OscillatorNode[] = [];
  private padExpiryTimer: number | null = null;
  private padExpiresAt: number = 0;

  public initialize() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.42;
    
    // Setup Analyser for Visualizers
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    
    // Master -> Analyser -> Destination
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.setupEffects();
    this.initNoiseBuffer();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  private async setupEffects() {
    if (!this.ctx || !this.masterGain) return;

    // Setup Delay
    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.28;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.45;

    // Delay Loop: Source -> Delay -> Feedback -> Delay
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);

    // Setup Reverb (Impulse Response)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2.2, 2.5, false);
    this.reverbNode.connect(this.masterGain);
  }

  private initNoiseBuffer() {
    if (!this.ctx || this.noiseBuffer) return;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private createImpulseResponse(duration: number, decay: number, reverse: boolean): AudioBuffer {
    const sampleRate = this.ctx!.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx!.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = reverse ? length - i : i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    return impulse;
  }

  public setProgression(id: string) {
    if (PROGRESSIONS[id]) {
      this.currentProgressionId = id;
      this.currentChordIndex = 0;
      if (this.isPadActive) {
        this.updatePadChord(0);
      }
    }
  }

  public toggleReverb(active: boolean) {
    this.isReverbOn = active;
  }

  public toggleDelay(active: boolean) {
    this.isDelayOn = active;
  }

  /* ----------------------------------------------------
     DYNAMIC DRUM MACHINE (IDEAS A, B, C COMBINED)
  ---------------------------------------------------- */
  public setGameScore(score: number) {
    this.currentScore = score;
    // Subtly scale tempo with game progression (122 to 134 BPM)
    this.bpm = Math.min(134, 122 + Math.floor(score * 0.35));
  }

  public startBeat() {
    this.initialize();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.isBeatRunning) return;

    this.isBeatRunning = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.current16thStep = 0;

    this.beatTimer = window.setInterval(() => {
      this.scheduler();
    }, this.lookaheadMs);
  }

  public stopBeat() {
    this.isBeatRunning = false;
    if (this.beatTimer !== null) {
      clearInterval(this.beatTimer);
      this.beatTimer = null;
    }
  }

  public isBeatActive(): boolean {
    return this.isBeatRunning;
  }

  public getBpm(): number {
    return this.bpm;
  }

  private scheduler() {
    if (!this.ctx || !this.isBeatRunning) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleDrumStep(this.current16thStep, this.nextNoteTime);
      this.advanceDrumStep();
    }
  }

  private advanceDrumStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    const secondsPer16th = 0.25 * secondsPerBeat;
    this.nextNoteTime += secondsPer16th;
    this.current16thStep = (this.current16thStep + 1) % 16;
  }

  private scheduleDrumStep(step: number, time: number) {
    // 1. Kick Drum (Idea A): Four-on-the-floor on steps 0, 4, 8, 12
    if (step % 4 === 0) {
      const isDownbeat = step === 0;
      this.playKick(time, isDownbeat);
    }

    // 2. Closed Hi-Hats (Idea B: unlocks at score >= 4)
    if (this.currentScore >= 4) {
      if (step === 2 || step === 6 || step === 10) {
        this.playHiHat(time, false);
      }
      // Accent open hi-hat on step 14
      if (step === 14) {
        this.playHiHat(time, true);
      }
    }

    // 3. 808 Snare / Clap (Idea B: unlocks at score >= 9 on beats 2 & 4)
    if (this.currentScore >= 9) {
      if (step === 4 || step === 12) {
        this.playSnare(time);
      }
    }
  }

  private playKick(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isAccent ? 165 : 145;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);

    const kickVolume = isAccent ? 0.72 : 0.62;
    gain.gain.setValueAtTime(kickVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  private playHiHat(time: number, isOpen: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    this.initNoiseBuffer();
    if (!this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7200, time);

    const gain = this.ctx.createGain();
    const duration = isOpen ? 0.14 : 0.045;
    const peakVolume = isOpen ? 0.32 : 0.2;

    gain.gain.setValueAtTime(peakVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    if (this.isReverbOn && this.reverbNode && isOpen) {
      gain.connect(this.reverbNode);
    }

    source.start(time);
    source.stop(time + duration + 0.02);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    this.initNoiseBuffer();
    if (!this.noiseBuffer) return;

    // Tonal body pop
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(185, time);
    osc.frequency.exponentialRampToValueAtTime(65, time + 0.06);
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.09);

    // Filtered noise crack
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.Q.setValueAtTime(1.4, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    if (this.isReverbOn && this.reverbNode) {
      noiseGain.connect(this.reverbNode);
    }

    source.start(time);
    source.stop(time + 0.14);
  }

  // Idea C: Interactive chomp percussion click when food is eaten
  public playFoodChompAccent() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  /* ----------------------------------------------------
     SPECIAL STAR ITEM: AMBIENT SYNTH CHORD PAD
  ---------------------------------------------------- */
  public activateSynthPad(durationSeconds: number = 20) {
    this.initialize();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Play sparkling star collection chime
    this.playStarCollectionChime();

    this.padExpiresAt = Date.now() + durationSeconds * 1000;

    if (this.isPadActive && this.padGainNode) {
      // Already running: extend timer and refresh swell
      const now = this.ctx.currentTime;
      this.padGainNode.gain.cancelScheduledValues(now);
      this.padGainNode.gain.linearRampToValueAtTime(0.18, now + 0.5);
      this.schedulePadExpiry(durationSeconds);
      return;
    }

    this.isPadActive = true;

    // Create warm lowpass filter for smooth ambient pad
    this.padFilterNode = this.ctx.createBiquadFilter();
    this.padFilterNode.type = 'lowpass';
    this.padFilterNode.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.padFilterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // Dedicated pad gain node with smooth attack
    this.padGainNode = this.ctx.createGain();
    const now = this.ctx.currentTime;
    this.padGainNode.gain.setValueAtTime(0, now);
    this.padGainNode.gain.linearRampToValueAtTime(0.18, now + 0.8);

    this.padFilterNode.connect(this.padGainNode);
    this.padGainNode.connect(this.masterGain);

    if (this.reverbNode) {
      this.padGainNode.connect(this.reverbNode);
    }

    // Spin up 3 warm polyphonic chord voices
    this.createPadVoices(this.currentChordIndex);
    this.schedulePadExpiry(durationSeconds);
  }

  private schedulePadExpiry(durationSeconds: number) {
    if (this.padExpiryTimer !== null) {
      clearTimeout(this.padExpiryTimer);
    }
    this.padExpiryTimer = window.setTimeout(() => {
      this.stopSynthPad();
    }, durationSeconds * 1000);
  }

  public getPadRemainingSeconds(): number {
    if (!this.isPadActive) return 0;
    return Math.max(0, Math.ceil((this.padExpiresAt - Date.now()) / 1000));
  }

  public isSynthPadActive(): boolean {
    return this.isPadActive;
  }

  private createPadVoices(chordIdx: number) {
    if (!this.ctx || !this.padFilterNode) return;

    this.clearPadOscillators();

    const freqs = this.getChordFrequencies(chordIdx);
    const now = this.ctx.currentTime;

    freqs.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      // Triangle wave creates classic soft vintage synth pad
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Subtle analog detuning for lush stereo chorus effect
      const detuneCents = (i === 0 ? 0 : i === 1 ? -6 : 6);
      osc.detune.setValueAtTime(detuneCents, now);

      osc.connect(this.padFilterNode!);
      osc.start(now);
      this.padOscillators.push(osc);
    });
  }

  public updatePadChord(chordIdx: number) {
    this.currentChordIndex = chordIdx;
    if (!this.isPadActive || !this.ctx || this.padOscillators.length === 0) return;

    const freqs = this.getChordFrequencies(chordIdx);
    const now = this.ctx.currentTime;

    // Smoothly glide pad frequencies to new chord (0.5s musical crossfade)
    this.padOscillators.forEach((osc, i) => {
      if (freqs[i]) {
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.exponentialRampToValueAtTime(freqs[i], now + 0.55);
      }
    });
  }

  private getChordFrequencies(chordIdx: number): number[] {
    const progression = PROGRESSIONS[this.currentProgressionId] || PROGRESSIONS['pop-anthem'];
    const chord = progression.chords[chordIdx % progression.chords.length];
    if (!chord || !chord.notes.length) return [261.63, 329.63, 392.00];

    // Sub-octave root + 3rd + 5th for deep warm pad voicing
    const rootFreq = chord.notes[0].freq;
    const thirdFreq = chord.notes[1] ? chord.notes[1].freq : rootFreq * 1.25;
    const fifthFreq = chord.notes[2] ? chord.notes[2].freq : rootFreq * 1.5;

    return [rootFreq * 0.5, thirdFreq, fifthFreq];
  }

  public stopSynthPad() {
    if (!this.isPadActive) return;
    this.isPadActive = false;
    this.padExpiresAt = 0;

    if (this.padExpiryTimer !== null) {
      clearTimeout(this.padExpiryTimer);
      this.padExpiryTimer = null;
    }

    if (this.ctx && this.padGainNode) {
      const now = this.ctx.currentTime;
      this.padGainNode.gain.cancelScheduledValues(now);
      this.padGainNode.gain.linearRampToValueAtTime(0, now + 0.8);
      setTimeout(() => {
        this.clearPadOscillators();
        this.padGainNode = null;
        this.padFilterNode = null;
      }, 900);
    } else {
      this.clearPadOscillators();
    }
  }

  private clearPadOscillators() {
    this.padOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    this.padOscillators = [];
  }

  private playStarCollectionChime() {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 sparkle chime
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.05 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      if (this.delayNode) {
        gain.connect(this.delayNode);
      }

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.4);
    });
  }

  /* ----------------------------------------------------
     MELODIC FOOD NOTES SYNTHESIZER
  ---------------------------------------------------- */
  public playNote(stepIndex: number): PlayedNoteInfo {
    if (!this.ctx || !this.masterGain) this.initialize();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }

    const progression = PROGRESSIONS[this.currentProgressionId] || PROGRESSIONS['pop-anthem'];
    const chords = progression.chords;
    
    // Determine chord and note
    const notesPerChord = chords[0].notes.length;
    const chordIndex = Math.floor(stepIndex / notesPerChord) % chords.length;
    const currentChord = chords[chordIndex];
    const noteIndex = stepIndex % currentChord.notes.length;
    const melodicNote = currentChord.notes[noteIndex];

    this.currentChordIndex = chordIndex;

    // If ambient pad is playing, glide it to current chord
    if (this.isPadActive) {
      this.updatePadChord(chordIndex);
    }

    this.playFrequency(melodicNote.freq);

    return {
      freq: melodicNote.freq,
      note: melodicNote.note,
      chordName: currentChord.chordName,
    };
  }

  private playFrequency(freq: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.masterGain);

    if (this.isDelayOn && this.delayNode) {
      gain.connect(this.delayNode);
    }
    if (this.isReverbOn && this.reverbNode) {
      gain.connect(this.reverbNode);
    }

    osc.start(now);
    osc.stop(now + 0.45);
  }
}

export const audioService = new AudioService();