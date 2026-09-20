import { describe, expect, it } from "vitest";
import { DUNGEON_TREASURE, PRESETS, SPACE_STATION, ZOMBIE_SURVIVAL } from "./presets";
import type { GameConfig } from "./types";
import { ConfigValidationError, validateGameConfig } from "./validateConfig";

function clone(config: GameConfig): GameConfig {
  return structuredClone(config);
}

describe("preset configurations", () => {
  it("validates every sample level", () => {
    for (const preset of PRESETS) {
      expect(() => validateGameConfig(preset)).not.toThrow();
    }
  });

  it("keeps items and exits reachable", () => {
    expect(SPACE_STATION.pickups).toHaveLength(4);
    expect(ZOMBIE_SURVIVAL.pickups).toHaveLength(3);
    expect(DUNGEON_TREASURE.pickups).toHaveLength(3);
  });
});

describe("validateGameConfig", () => {
  it("rejects entities inside walls", () => {
    const config = clone(SPACE_STATION);
    config.player.x = 0;
    config.player.y = 0;
    expect(() => validateGameConfig(config)).toThrow(ConfigValidationError);
  });

  it("rejects unreachable pickups", () => {
    const config = clone(SPACE_STATION);
    config.map[1][1] = 0;
    config.pickups[0] = { ...config.pickups[0], x: 1, y: 1 };
    for (let x = 0; x < config.map[0].length; x += 1) {
      config.map[2][x] = 1;
    }
    expect(() => validateGameConfig(config)).toThrow(/not reachable/);
  });

  it("rejects a non-rectangular map", () => {
    const config = clone(ZOMBIE_SURVIVAL);
    config.map[0] = config.map[0].slice(0, 8);
    expect(() => validateGameConfig(config)).toThrow(/rectangular/);
  });
});
