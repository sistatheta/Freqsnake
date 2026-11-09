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
  
  // Effect States
  private isReverbOn: boolean = false;
  private isDelayOn: boolean = false;
  
  // Progression State
  private currentProgressionId: string = 'pop-anthem';

  public initialize() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    
    // Setup Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.75;
    
    // Master -> Analyser -> Destination
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.setupEffects();
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

    // Rich synth tone combining triangle and sub overtone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Punchy arcade synth envelope
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