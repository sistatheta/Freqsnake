export const GRID_SIZE = 15;
export const INITIAL_SPEED = 140; // ms per tick - responsive baseline
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

// Audio & Musical Progression Constants
export interface MelodicNote {
  note: string;
  freq: number;
}

export interface ChordProgression {
  name: string;
  chords: {
    chordName: string;
    notes: MelodicNote[];
  }[];
}

export const PROGRESSIONS: Record<string, ChordProgression> = {
  'pop-anthem': {
    name: 'Pop Anthem (C - G - Am - F)',
    chords: [
      {
        chordName: 'C Major',
        notes: [
          { note: 'C4', freq: 261.63 },
          { note: 'E4', freq: 329.63 },
          { note: 'G4', freq: 392.00 },
          { note: 'C5', freq: 523.25 },
        ],
      },
      {
        chordName: 'G Major',
        notes: [
          { note: 'G3', freq: 196.00 },
          { note: 'B3', freq: 246.94 },
          { note: 'D4', freq: 293.66 },
          { note: 'G4', freq: 392.00 },
        ],
      },
      {
        chordName: 'A Minor',
        notes: [
          { note: 'A3', freq: 220.00 },
          { note: 'C4', freq: 261.63 },
          { note: 'E4', freq: 329.63 },
          { note: 'A4', freq: 440.00 },
        ],
      },
      {
        chordName: 'F Major',
        notes: [
          { note: 'F3', freq: 174.61 },
          { note: 'A3', freq: 220.00 },
          { note: 'C4', freq: 261.63 },
          { note: 'F4', freq: 349.23 },
        ],
      },
    ],
  },
  'synthwave-drive': {
    name: 'Synthwave Drive (Dm - F - C - G)',
    chords: [
      {
        chordName: 'D Minor',
        notes: [
          { note: 'D3', freq: 146.83 },
          { note: 'F3', freq: 174.61 },
          { note: 'A3', freq: 220.00 },
          { note: 'D4', freq: 293.66 },
        ],
      },
      {
        chordName: 'F Major',
        notes: [
          { note: 'F3', freq: 174.61 },
          { note: 'A3', freq: 220.00 },
          { note: 'C4', freq: 261.63 },
          { note: 'F4', freq: 349.23 },
        ],
      },
      {
        chordName: 'C Major',
        notes: [
          { note: 'C3', freq: 130.81 },
          { note: 'E3', freq: 164.81 },
          { note: 'G3', freq: 196.00 },
          { note: 'C4', freq: 261.63 },
        ],
      },
      {
        chordName: 'G Major',
        notes: [
          { note: 'G3', freq: 196.00 },
          { note: 'B3', freq: 246.94 },
          { note: 'D4', freq: 293.66 },
          { note: 'G4', freq: 392.00 },
        ],
      },
    ],
  },
  'cyber-minor': {
    name: 'Cyber Minor (Am - Em - F - G)',
    chords: [
      {
        chordName: 'A Minor',
        notes: [
          { note: 'A3', freq: 220.00 },
          { note: 'C4', freq: 261.63 },
          { note: 'E4', freq: 329.63 },
          { note: 'A4', freq: 440.00 },
        ],
      },
      {
        chordName: 'E Minor',
        notes: [
          { note: 'E3', freq: 164.81 },
          { note: 'G3', freq: 196.00 },
          { note: 'B3', freq: 246.94 },
          { note: 'E4', freq: 329.63 },
        ],
      },
      {
        chordName: 'F Major',
        notes: [
          { note: 'F3', freq: 174.61 },
          { note: 'A3', freq: 220.00 },
          { note: 'C4', freq: 261.63 },
          { note: 'F4', freq: 349.23 },
        ],
      },
      {
        chordName: 'G Major',
        notes: [
          { note: 'G3', freq: 196.00 },
          { note: 'B3', freq: 246.94 },
          { note: 'D4', freq: 293.66 },
          { note: 'G4', freq: 392.00 },
        ],
      },
    ],
  },
  'neon-pentatonic': {
    name: 'Neon Pentatonic (C Pentatonic)',
    chords: [
      {
        chordName: 'Ascending Pentatonic',
        notes: [
          { note: 'C4', freq: 261.63 },
          { note: 'D4', freq: 293.66 },
          { note: 'E4', freq: 329.63 },
          { note: 'G4', freq: 392.00 },
          { note: 'A4', freq: 440.00 },
          { note: 'C5', freq: 523.25 },
          { note: 'D5', freq: 587.33 },
          { note: 'E5', freq: 659.25 },
        ],
      },
    ],
  },
};
