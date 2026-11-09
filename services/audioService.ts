import { PROGRESSIONS } from '../constants';

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
  private currentChordIndex: number = 0;

  public initialize() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    
    // Setup Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048; // Larger buffer for smoother waves
    this.analyser.smoothingTimeConstant = 0.8;
    
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
    this.delayNode.delayTime.value = 0.3; // 300ms delay
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;

    // Delay Loop: Source -> Delay -> Feedback -> Delay
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    // Output Delay to Master
    this.delayNode.connect(this.masterGain);

    // Setup Reverb (Impulse Response)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2, 2, false);
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
      this.currentChordIndex = 0;
    }
  }

  public toggleReverb(active: boolean) {
    this.isReverbOn = active;
  }

  public toggleDelay(active: boolean) {
    this.isDelayOn = active;
  }

  public playNote(stepIndex: number): number {
    if (!this.ctx || !this.masterGain) this.initialize();
    if (this.ctx?.state === 'suspended') this.ctx.resume();

    const progression = PROGRESSIONS[this.currentProgressionId];
    const chords = progression.frequencies;
    
    // Cycle through chords every 4 steps (beats)
    const chordIndex = Math.floor(stepIndex / 4) % chords.length;
    const currentChord = chords[chordIndex];
    
    // Arpeggiate through notes in the chord
    const noteIndex = stepIndex % currentChord.length;
    const frequency = currentChord[noteIndex];

    this.playFrequency(frequency);
    return frequency;
  }

  private playFrequency(freq: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Envelope
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    // Routing
    osc.connect(gain);
    
    // Direct Signal
    gain.connect(this.masterGain);

    // Effects Routing
    if (this.isDelayOn && this.delayNode) {
      gain.connect(this.delayNode);
    }
    if (this.isReverbOn && this.reverbNode) {
      gain.connect(this.reverbNode);
    }

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

export const audioService = new AudioService();