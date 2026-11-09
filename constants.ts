export const GRID_SIZE = 15;
export const INITIAL_SPEED = 150; // ms per tick
export const SPEED_INCREMENT = 2; // Decrease ms per food eaten
export const MIN_SPEED = 50;

export const KEY_MAP: Record<string, string> = {
  ArrowUp: 'UP',
  Up: 'UP',
  w: 'UP',
  W: 'UP',
  KeyW: 'UP',

  ArrowDown: 'DOWN',
  Down: 'DOWN',
  s: 'DOWN',
  S: 'DOWN',
  KeyS: 'DOWN',

  ArrowLeft: 'LEFT',
  Left: 'LEFT',
  a: 'LEFT',
  A: 'LEFT',
  KeyA: 'LEFT',

  ArrowRight: 'RIGHT',
  Right: 'RIGHT',
  d: 'RIGHT',
  D: 'RIGHT',
  KeyD: 'RIGHT',
};

// Audio Constants
export interface ChordProgression {
  name: string;
  frequencies: number[][]; // Array of chords, each chord is array of frequencies
}

const C_MAJ_SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
const A_MIN_SCALE = [220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00];

export const PROGRESSIONS: Record<string, ChordProgression> = {
  'pop-anthem': {
    name: 'Pop Anthem (C-G-Am-F)',
    frequencies: [
      [261.63, 329.63, 392.00], // C
      [392.00, 493.88, 587.33], // G
      [220.00, 261.63, 329.63], // Am
      [349.23, 440.00, 523.25]  // F
    ]
  },
  'cyber-minor': {
    name: 'Cyber Minor (Am-F-C-G)',
    frequencies: [
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [261.63, 329.63, 392.00], // C
      [196.00, 246.94, 293.66]  // G
    ]
  },
  'jazz-vibes': {
    name: 'Jazz Vibes (Dm7-G7-Cmaj7)',
    frequencies: [
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [392.00, 493.88, 587.33, 698.46], // G7
      [261.63, 329.63, 392.00, 493.88]  // Cmaj7
    ]
  },
  'pentatonic-run': {
    name: 'Pentatonic Run',
    frequencies: [
       [261.63, 293.66, 329.63, 392.00, 440.00, 523.25] // C Major Pentatonic
    ]
  }
};
