export type Tile = 0 | 1;

export interface Vec2 {
  x: number;
  y: number;
}

export interface Palette {
  background: string;
  floor: string;
  floorAlt: string;
  wall: string;
  wallEdge: string;
  player: string;
  enemy: string;
  pickup: string;
  hazard: string;
  exitLocked: string;
  exitOpen: string;
}

export interface PlayerConfig {
  x: number;
  y: number;
  speed: number;
  health: number;
}

export interface EnemyConfig {
  id: string;
  x: number;
  y: number;
  speed: number;
  damage: number;
}

export interface PickupConfig {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface HazardConfig {
  id: string;
  x: number;
  y: number;
  damage: number;
}

export interface WinCondition {
  type: "collect_and_exit";
  requiredPickups: number;
  exit: Vec2;
}

export interface GameConfig {
  id: string;
  title: string;
  theme: string;
  description: string;
  objective: string;
  controls: string;
  tileSize: number;
  map: Tile[][];
  player: PlayerConfig;
  enemies: EnemyConfig[];
  pickups: PickupConfig[];
  hazards: HazardConfig[];
  win: WinCondition;
  palette: Palette;
}

export type GameStatus = "playing" | "unlocked" | "won" | "lost";

export interface GameHudState {
  title: string;
  objective: string;
  controls: string;
  health: number;
  maxHealth: number;
  collected: number;
  required: number;
  status: GameStatus;
}

export type HudListener = (state: GameHudState) => void;
