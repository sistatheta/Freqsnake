export interface Point {
  x: number;
  y: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export type ItemType = 'FOOD' | 'REVERB' | 'DELAY';

export interface GameItem {
  pos: Point;
  type: ItemType;
  id: string; // Unique ID for React keys
}

export interface GameState {
  snake: Point[];
  items: GameItem[];
  direction: Direction;
  score: number;
  isGameOver: boolean;
  isPaused: boolean;
  highScore: number;
}

export interface AudioConfig {
  progressionId: string;
  reverbEnabled: boolean;
  delayEnabled: boolean;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  timestamp: number;
}