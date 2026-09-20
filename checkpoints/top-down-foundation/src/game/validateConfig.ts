import type { GameConfig, Tile, Vec2 } from "./types";

export class ConfigValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}

const MAX_MAP_CELLS = 80 * 80;

function inBounds(map: Tile[][], x: number, y: number): boolean {
  return y >= 0 && y < map.length && x >= 0 && x < (map[0]?.length ?? 0);
}

function isFloor(map: Tile[][], x: number, y: number): boolean {
  return inBounds(map, x, y) && map[y][x] === 0;
}

export function reachableFrom(map: Tile[][], start: Vec2): Set<string> {
  const key = (x: number, y: number) => `${x},${y}`;
  const seen = new Set<string>();
  if (!isFloor(map, start.x, start.y)) return seen;

  const queue: Vec2[] = [{ x: start.x, y: start.y }];
  seen.add(key(start.x, start.y));

  const dirs: Vec2[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const dir of dirs) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nextKey = key(nx, ny);
      if (seen.has(nextKey) || !isFloor(map, nx, ny)) continue;
      seen.add(nextKey);
      queue.push({ x: nx, y: ny });
    }
  }

  return seen;
}

function assertTileCoord(
  issues: string[],
  map: Tile[][],
  point: Vec2,
  label: string,
): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    issues.push(`${label} must use integer tile coordinates.`);
    return;
  }
  if (!inBounds(map, point.x, point.y)) {
    issues.push(`${label} is outside the map.`);
    return;
  }
  if (!isFloor(map, point.x, point.y)) {
    issues.push(`${label} is inside a wall.`);
  }
}

export function validateGameConfig(config: GameConfig): void {
  const issues: string[] = [];

  if (!config.id.trim()) issues.push("Config id is required.");
  if (!config.title.trim()) issues.push("Config title is required.");
  if (!config.theme.trim()) issues.push("Config theme is required.");
  if (config.tileSize < 16 || config.tileSize > 64) {
    issues.push("tileSize must be between 16 and 64.");
  }

  const map = config.map;
  if (!Array.isArray(map) || map.length < 5) {
    issues.push("Map must have at least 5 rows.");
  } else {
    const width = map[0]?.length ?? 0;
    if (width < 5) issues.push("Map must have at least 5 columns.");
    let cells = 0;
    for (let y = 0; y < map.length; y += 1) {
      const row = map[y];
      if (!row || row.length !== width) {
        issues.push("Map must be rectangular.");
        break;
      }
      cells += row.length;
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] !== 0 && row[x] !== 1) {
          issues.push(`Invalid tile at ${x},${y}.`);
        }
      }
    }
    if (cells > MAX_MAP_CELLS) issues.push("Map is too large.");
  }

  if (config.player.speed <= 0) issues.push("Player speed must be positive.");
  if (config.player.health <= 0) issues.push("Player health must be positive.");
  if (config.win.type !== "collect_and_exit") {
    issues.push("Only collect_and_exit win conditions are supported.");
  }
  if (config.win.requiredPickups < 1) {
    issues.push("Win condition must require at least one pickup.");
  }
  if (config.win.requiredPickups > config.pickups.length) {
    issues.push("requiredPickups cannot exceed the number of pickups.");
  }
  if (config.pickups.length < 1) issues.push("At least one pickup is required.");
  if (config.enemies.length < 1) issues.push("At least one enemy is required.");

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }

  assertTileCoord(issues, map, config.player, "Player spawn");
  assertTileCoord(issues, map, config.win.exit, "Exit");

  const occupied = new Map<string, string>();
  const occupy = (point: Vec2, label: string) => {
    const key = `${point.x},${point.y}`;
    const existing = occupied.get(key);
    if (existing) issues.push(`${label} overlaps ${existing}.`);
    occupied.set(key, label);
  };

  occupy(config.player, "Player spawn");
  occupy(config.win.exit, "Exit");

  const ids = new Set<string>();
  const trackId = (id: string, label: string) => {
    if (!id.trim()) issues.push(`${label} is missing an id.`);
    else if (ids.has(id)) issues.push(`Duplicate id "${id}".`);
    else ids.add(id);
  };

  config.enemies.forEach((enemy, index) => {
    const label = `Enemy ${enemy.id || index}`;
    trackId(enemy.id, label);
    assertTileCoord(issues, map, enemy, label);
    occupy(enemy, label);
    if (enemy.speed <= 0) issues.push(`${label} speed must be positive.`);
    if (enemy.damage <= 0) issues.push(`${label} damage must be positive.`);
  });

  config.pickups.forEach((pickup, index) => {
    const label = `Pickup ${pickup.id || index}`;
    trackId(pickup.id, label);
    assertTileCoord(issues, map, pickup, label);
    occupy(pickup, label);
  });

  config.hazards.forEach((hazard, index) => {
    const label = `Hazard ${hazard.id || index}`;
    trackId(hazard.id, label);
    assertTileCoord(issues, map, hazard, label);
    occupy(hazard, label);
    if (hazard.damage <= 0) issues.push(`${label} damage must be positive.`);
  });

  const reachable = reachableFrom(map, config.player);
  const canReach = (point: Vec2) => reachable.has(`${point.x},${point.y}`);

  if (!canReach(config.win.exit)) {
    issues.push("Exit is not reachable from the player spawn.");
  }
  for (const pickup of config.pickups) {
    if (!canReach(pickup)) {
      issues.push(`Pickup ${pickup.id} is not reachable from the player spawn.`);
    }
  }

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }
}

export function assertValidGameConfig(config: GameConfig): GameConfig {
  validateGameConfig(config);
  return config;
}
