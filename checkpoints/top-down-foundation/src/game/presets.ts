import { parseLevel, pickupsFromTiles } from "./parseLevel";
import type { EnemyConfig, GameConfig, HazardConfig, Palette } from "./types";
import { assertValidGameConfig } from "./validateConfig";

const CONTROLS = "WASD or arrow keys to move";

function enemiesFrom(
  tiles: { x: number; y: number }[],
  speed: number,
  damage: number,
): EnemyConfig[] {
  return tiles.map((tile, index) => ({
    id: `enemy-${index + 1}`,
    x: tile.x,
    y: tile.y,
    speed,
    damage,
  }));
}

function hazardsFrom(
  tiles: { x: number; y: number }[],
  damage: number,
): HazardConfig[] {
  return tiles.map((tile, index) => ({
    id: `hazard-${index + 1}`,
    x: tile.x,
    y: tile.y,
    damage,
  }));
}

function buildConfig(
  ascii: string,
  meta: Omit<GameConfig, "map" | "player" | "enemies" | "pickups" | "hazards" | "win"> & {
    playerSpeed: number;
    playerHealth: number;
    enemySpeed: number;
    enemyDamage: number;
    hazardDamage: number;
    pickupLabel: string;
    requiredPickups: number;
  },
): GameConfig {
  const level = parseLevel(ascii);
  return assertValidGameConfig({
    id: meta.id,
    title: meta.title,
    theme: meta.theme,
    description: meta.description,
    objective: meta.objective,
    controls: meta.controls,
    tileSize: meta.tileSize,
    palette: meta.palette,
    map: level.map,
    player: {
      x: level.player.x,
      y: level.player.y,
      speed: meta.playerSpeed,
      health: meta.playerHealth,
    },
    enemies: enemiesFrom(level.enemies, meta.enemySpeed, meta.enemyDamage),
    pickups: pickupsFromTiles(level.pickups, meta.pickupLabel),
    hazards: hazardsFrom(level.hazards, meta.hazardDamage),
    win: {
      type: "collect_and_exit",
      requiredPickups: meta.requiredPickups,
      exit: level.exit,
    },
  });
}

const spacePalette: Palette = {
  background: "#070b12",
  floor: "#152033",
  floorAlt: "#1b2940",
  wall: "#3d5a80",
  wallEdge: "#7ad7ff",
  player: "#7ee8ff",
  enemy: "#ff5d73",
  pickup: "#5eead4",
  hazard: "#fb923c",
  exitLocked: "#64748b",
  exitOpen: "#34d399",
};

const zombiePalette: Palette = {
  background: "#0a0d08",
  floor: "#1a2214",
  floorAlt: "#222c19",
  wall: "#3f4a32",
  wallEdge: "#a3e635",
  player: "#d9f99d",
  enemy: "#84cc16",
  pickup: "#facc15",
  hazard: "#ef4444",
  exitLocked: "#57534e",
  exitOpen: "#bef264",
};

const dungeonPalette: Palette = {
  background: "#120c08",
  floor: "#2a1c12",
  floorAlt: "#332216",
  wall: "#6b4423",
  wallEdge: "#fbbf24",
  player: "#fde68a",
  enemy: "#c084fc",
  pickup: "#f59e0b",
  hazard: "#f97316",
  exitLocked: "#78716c",
  exitOpen: "#fcd34d",
};

const SPACE_ASCII = `
############################
#..........######..........#
#..........######..........#
#....P..............O......#
#..........######..........#
#..........######..........#
######................######
######................######
#.........H......H.........#
#...O......................#
#...............X..........#
#......................O...#
######................######
######................######
#..........######..........#
#...E......######......E...#
#......................O...#
#..........######..........#
############################
`;

const ZOMBIE_ASCII = `
############################
#......................O...#
#..P........####...........#
#...........####......H....#
#..........................#
#......##########..........#
#......##########......E...#
#..........................#
#...H......................#
#..............X...........#
#..........................#
#...E......##########......#
#..........##########......#
#..........................#
#....H......####...........#
#...........####........O..#
#...O......................#
############################
`;

const DUNGEON_ASCII = `
############################
#P.......#........#.......O#
#........#........#........#
#........#...H....#........#
#..####..##########..####..#
#..........................#
#.....E..............O.....#
#..........................#
######..##############..####
#........#........#........#
#...O........X....#........#
#........#........#...E....#
######..##############..####
#..........................#
#.........H................#
#..####..##########..####..#
#........#........#........#
#........#........#........#
############################
`;

export const SPACE_STATION: GameConfig = buildConfig(SPACE_ASCII, {
  id: "space-station-escape",
  title: "Space Station Escape",
  theme: "space-station",
  description:
    "Aliens are loose on a failing station. Recover oxygen canisters and reach the airlock before you are overrun.",
  objective: "Collect 4 oxygen canisters, then reach the airlock.",
  controls: CONTROLS,
  tileSize: 32,
  palette: spacePalette,
  playerSpeed: 150,
  playerHealth: 100,
  enemySpeed: 72,
  enemyDamage: 18,
  hazardDamage: 12,
  pickupLabel: "Oxygen",
  requiredPickups: 4,
});

export const ZOMBIE_SURVIVAL: GameConfig = buildConfig(ZOMBIE_ASCII, {
  id: "zombie-survival",
  title: "Zombie Survival",
  theme: "zombie-outbreak",
  description:
    "The courtyard is overrun. Gather supply crates and get through the safehouse gate.",
  objective: "Collect 3 supply crates, then reach the safehouse gate.",
  controls: CONTROLS,
  tileSize: 32,
  palette: zombiePalette,
  playerSpeed: 155,
  playerHealth: 110,
  enemySpeed: 78,
  enemyDamage: 20,
  hazardDamage: 14,
  pickupLabel: "Supplies",
  requiredPickups: 3,
});

export const DUNGEON_TREASURE: GameConfig = buildConfig(DUNGEON_ASCII, {
  id: "dungeon-treasure-hunt",
  title: "Dungeon Treasure Hunt",
  theme: "dungeon",
  description:
    "A trapped vault maze. Collect the relics and find the sealed door before the guardians catch you.",
  objective: "Collect 3 relics, then reach the sealed vault door.",
  controls: CONTROLS,
  tileSize: 32,
  palette: dungeonPalette,
  playerSpeed: 145,
  playerHealth: 100,
  enemySpeed: 68,
  enemyDamage: 16,
  hazardDamage: 15,
  pickupLabel: "Relic",
  requiredPickups: 3,
});

export const PRESETS: GameConfig[] = [
  SPACE_STATION,
  ZOMBIE_SURVIVAL,
  DUNGEON_TREASURE,
];

export function getPresetById(id: string): GameConfig | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
