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

  // Drum Machine / Beat State
  private isBeatRunning: boolean = false;
  private beatTimer: number | null = null;
  private nextNoteTime: number = 0;
  private current16thStep: number = 0;
  private bpm: number = 124;
  private lookaheadMs: number = 25;
  private scheduleAheadTime: number = 0.12;

  public initialize() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    
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
    
    // Output Delay to Master
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
    }
  }

  public toggleReverb(active: boolean) {
    this.isReverbOn = active;
  }

  public toggleDelay(active: boolean) {
    this.isDelayOn = active;
  }

  /* ----------------------------------------------------
     DRUM MACHINE / FOUR-ON-THE-FLOOR SYNTHESIZER
  ---------------------------------------------------- */
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

  public setBpm(newBpm: number) {
    this.bpm = Math.max(90, Math.min(160, newBpm));
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
    // Four-on-the-floor kick on steps 0, 4, 8, 12
    if (step % 4 === 0) {
      const isDownbeat = step === 0;
      this.playKick(time, isDownbeat);
    }
    // Off-beat closed hi-hat on steps 2, 6, 10
    if (step === 2 || step === 6 || step === 10) {
      this.playHiHat(time, false);
    }
    // Accent open hi-hat on step 14 for syncopated groove
    if (step === 14) {
      this.playHiHat(time, true);
    }
  }

  private playKick(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Frequency sweeps down rapidly: creates punchy electronic kick
    const startFreq = isAccent ? 165 : 145;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);

    const kickVolume = isAccent ? 0.75 : 0.65;
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

    // Highpass filter for crisp metallic hi-hat sizzle
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

    // Rich synth tone combining triangle and punchy envelope
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