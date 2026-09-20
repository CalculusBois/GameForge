import type { PickupConfig, Tile, Vec2 } from "./types";

export const WALL_CHAR = "#";

export interface ParsedLevel {
  map: Tile[][];
  player: Vec2;
  enemies: Vec2[];
  pickups: Vec2[];
  hazards: Vec2[];
  exit: Vec2;
}

export function parseLevel(ascii: string): ParsedLevel {
  const rows = ascii
    .trim()
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (rows.length === 0) {
    throw new Error("Level ASCII is empty.");
  }

  const width = rows[0].length;
  const map: Tile[][] = [];
  const playerSpawns: Vec2[] = [];
  const enemies: Vec2[] = [];
  const pickups: Vec2[] = [];
  const hazards: Vec2[] = [];
  const exits: Vec2[] = [];

  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    if (row.length !== width) {
      throw new Error(`Level row ${y} width ${row.length} does not match ${width}.`);
    }

    const tiles: Tile[] = [];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === WALL_CHAR) {
        tiles.push(1);
        continue;
      }

      tiles.push(0);
      const cell = { x, y };
      if (ch === "P") playerSpawns.push(cell);
      else if (ch === "E") enemies.push(cell);
      else if (ch === "O") pickups.push(cell);
      else if (ch === "H") hazards.push(cell);
      else if (ch === "X") exits.push(cell);
      else if (ch !== "." && ch !== " ") {
        throw new Error(`Unknown level character "${ch}" at ${x},${y}.`);
      }
    }
    map.push(tiles);
  }

  if (playerSpawns.length !== 1) {
    throw new Error("Level must contain exactly one player spawn (P).");
  }
  if (exits.length !== 1) {
    throw new Error("Level must contain exactly one exit (X).");
  }

  return {
    map,
    player: playerSpawns[0],
    enemies,
    pickups,
    hazards,
    exit: exits[0],
  };
}

export function pickupsFromTiles(
  tiles: Vec2[],
  label: string,
): PickupConfig[] {
  return tiles.map((tile, index) => ({
    id: `${label}-${index + 1}`,
    x: tile.x,
    y: tile.y,
    label,
  }));
}
