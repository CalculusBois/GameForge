# GameForge

Browser game studio for a hackathon: describe a game in plain English, play a generated 2D top-down game, then revise it with follow-up prompts.

This first milestone is the playable foundation. Example games load authored `GameConfig` presets into a reusable Phaser engine. Custom AI generation is **not connected yet** and the UI labels that as demo mode.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the printed local URL (Vite defaults to `http://localhost:5173`).

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## What works now

- Dark studio layout with a description panel and a live Phaser game view
- WASD / arrow movement, walls, chasing enemies, pickups, hazards, and a locked exit
- Win and lose states, HUD, and Restart (destroys and recreates the Phaser game)
- Three presets: space station escape, zombie survival, dungeon treasure hunt
- Config validation, including reachability and no wall spawns
