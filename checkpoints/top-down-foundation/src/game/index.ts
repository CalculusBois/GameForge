export type { GameConfig, GameHudState, GameStatus } from "./types";
export { PRESETS, SPACE_STATION, ZOMBIE_SURVIVAL, DUNGEON_TREASURE } from "./presets";
export { validateGameConfig, ConfigValidationError } from "./validateConfig";
export { createGame, destroyGame } from "./createGame";
