import Phaser from "phaser";
import { GameScene, GAME_SCENE_KEY } from "./GameScene";
import type { GameConfig, HudListener } from "./types";
import { validateGameConfig } from "./validateConfig";

export function createGame(
  parent: HTMLElement,
  config: GameConfig,
  onHud: HudListener,
): Phaser.Game {
  validateGameConfig(config);

  const width = config.map[0].length * config.tileSize;
  const height = config.map.length * config.tileSize;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: config.palette.background,
    banner: false,
    audio: { noAudio: true },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
  });

  game.events.once(Phaser.Core.Events.READY, () => {
    game.scene.add(GAME_SCENE_KEY, GameScene, true, { config, onHud });
  });
  return game;
}

export function destroyGame(game: Phaser.Game | null): void {
  if (!game) return;
  game.destroy(true);
}
