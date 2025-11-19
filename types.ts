export enum GameState {
  START_MENU = 'START_MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export enum Turn {
  PLAYER_1 = 'PLAYER_1',
  PLAYER_2 = 'PLAYER_2',
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface BuildingWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  lightThreshold: number; // 0 to 1. Determines when this specific window lights up at dusk.
}

export interface Building {
  x: number;
  width: number;
  height: number;
  color: string;
  windows: BuildingWindow[];
}

export interface Gorilla {
  id: Turn;
  x: number; // Center X on top of building
  y: number; // Top Y of building
  isDead: boolean;
}

export interface ShotParams {
  angle: number;
  velocity: number;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  timestamp: number;
}

export interface GameSettings {
  gravity: number;
  mode: 'PVP' | 'CPU';
}