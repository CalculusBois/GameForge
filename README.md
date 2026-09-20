# GameForge — Asterion Frontier

An original 2D side-view sandbox built with React, TypeScript, and Phaser. Explore a seeded planet, mine and build, fight with guns/swords/magic, craft at an outpost, and earn cosmetic skins. Artwork is generated locally from shapes. MIT Parley Forge can create bosses from a prompt; those bosses are saved on the active world (reload keeps them). World generation via Parley also creates a real saved world.

## Run locally

```sh
cd /Users/Chewy/Documents/GameForge
./scripts/dev.sh --port 5175 --strictPort
```

Open **http://127.0.0.1:5175/**. Keep using the same browser, hostname, and port to access the same saves. If that port is occupied, use its existing server or stop that server before restarting. Changing the port or using `localhost` opens a separate browser storage origin.

On another computer, install Node 22.12+ and run `npm install`, then `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.

## Controls and first expedition

- A/D or arrows: move. Space: jump; hold for height.
- 1–8: select hotbar slot. Mouse: aim. Hold left click or J: mine or attack.
- Right click over the canvas or F: place the selected block. E: harvest or interact nearby.
- I: inventory; C: crafting; M: explored map; Escape: pause.
- H / Recall: remain still for 2.5 seconds to return to the outpost. Damage or movement cancels the channel.

Start with a pickaxe, blaster, and 20 soil blocks. Harvest a nearby tree with E. Mine the exposed iron just east of the outpost; four ore plus three timber make two bars and a sword. Crafting takes place near the outpost. Claim the crafting objective in **Earn Coins** for 60 coins, enough for the Salvage ranger skin. Unlock explicitly, then equip it for free. Enemies, chests, other objectives, and selling spare resources also earn coins. Common resources sell only in complete bundles (for example 20 timber → 1 coin). MIT Parley Forge bosses stay on that world after reload.

The inventory supports selecting and swapping stacks into the eight-slot hotbar. Equip the pickaxe before mining; solid blocks block your reach. Placement requires support and space clear of actors. Opening a major menu pauses gameplay. Click **Continue expedition** to return control to the canvas.

## Persistence

Saves are local to this browser; there is no account or cloud synchronization. IndexedDB stores seeds and sparse terrain edits, player/checkpoint, inventory, coins, objectives, treasure, defeated encounters, exploration, and forged bosses. Cosmetics belong to a shared local profile and work across worlds; other progression belongs to its world. Death retains possessions and returns you to the beacon.

New worlds preserve existing ones. Import merges worlds and renames duplicate IDs instead of replacing them. Use export to keep a backup or move between browsers. Incompatible saves produce an error rather than being silently reset. Terrain settings are fixed for each world.

## Current architecture

- `src/sandbox/model.ts`: items, eight recipes, six skins, objectives, world schema, progression rules.
- `terrain.ts`: global seeded terrain, caves, biomes, harvestables, structure ownership, sparse edits. Tiles are 24px; chunks are 32×32. Depth is 160 tiles, with bottom bedrock; horizontal range is ±120,000 tiles.
- `chunks.ts`: incremental loading, bounded cache, merged collision rectangles, graphics cleanup.
- `engine.ts`, `enemies.ts`, `assets.ts`: Phaser lifecycle, movement, mining/building, weapons, six enemy behaviors, effects, lighting, death/recall.
- `persistence.ts`: validated, serialized IndexedDB transactions and merge import/export.
- `src/App.tsx`, `src/index.css`: menus, HUD, hotbar, world settings, shop, skins and crafting.
- `src/creator/`: MIT Parley Forge. Prompted bosses persist on the active world save.
- `src/sandbox/ai.ts`: world-generation provider boundary for Parley settings.
- `src/platformer/`: retained platformer movement constants, textures, and room templates; room progression is no longer the primary mode. `src/game/` preserves the older top-down implementation.

The platformer baseline is preserved at Git checkpoint `855d463`; an earlier snapshot is in `checkpoints/top-down-foundation.tar.gz`.

## Checks

```sh
export PATH="$PWD/.tools/node-v22.19.0-darwin-x64/bin:$PATH" # only if Node is absent from PATH
npm run typecheck
npm test
npm run build
```

Development-only gameplay regression: open `http://127.0.0.1:5175/?verify=sandbox`. This runs actual Phaser controls and physics using a separately named IndexedDB database. Fresh economy checks grant no currency or materials; subsequent combat cases explicitly create test enemies. It never opens the normal player database. Results and failures appear on the page. This route is excluded from production.

See **HANDOFF.md** for the exact latest verification results, incomplete original requirements, and resumption steps. Unit tests do not establish game feel or prove every generated route is traversable. The build currently reports a large Phaser bundle advisory.
