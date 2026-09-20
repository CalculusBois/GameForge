# GameForge sandbox handoff — 2026-09-19

## Current task and preservation

The latest request was to resume without discarding work, run type/build checks after earlier edits, test sustained chunk exploration, boundary mining/placement, every enemy, death/respawn/recall, and a **fresh world without resource/coin grants**. Fix reliability before adding scope. Those scenarios have now completed through the real Phaser engine in an isolated browser regression run. Performance and some original content/polish requirements remain incomplete; do not describe the entire detailed upgrade as finished.

Original full requirements: `/Users/Chewy/.codex/attachments/ab3a6681-5833-4bcb-a30d-d249e5ced03c/Pasted text.txt`. Earlier direction: `/Users/Chewy/.codex/attachments/10cf3afc-93cf-424c-acf3-b95d75e97fda/Pasted text.txt`.

The requested game is an original science-fiction/fantasy side-view sandbox extending the existing React/TypeScript/Phaser platformer: continuous seeded natural terrain and caves, three biomes, bounded streaming, mining/building, inventory, guns/sword/magic, six enemy types, earnable coins, eight recipes, six cosmetic skins, safe outpost, treasure/lighting/map, recall/death, validated durable local saves, functional menus, and an honest disconnected future AI boundary. No accounts, payments, multiplayer, or backend.

- Platformer checkpoint: Git `855d463`. Older top-down archive: `checkpoints/top-down-foundation.tar.gz`.
- Prior handoff retained verbatim in `checkpoints/HANDOFF-history-2026-09-19.md`; its early disconnected-module status is historical.
- No project AGENTS.md was found during the audit.
- Sandbox files remain untracked in Git; preserve them. No reset, checkout, clean, save deletion, or overwriting of user worlds was performed.
- Normal saves use IndexedDB `gameforge-frontier`. Regression runs use separately named `gameforge-verification-<timestamp>` databases. Earlier resource-assisted UI checks used the separate `localhost:5175` origin. Neither workflow injected resources into the normal `127.0.0.1:5175` world.

## Implemented and actually verified

### Milestones A/B — world, controls, mining, placement, persistence

Continuous side-view movement/camera uses retained platformer physics. Terrain uses 24px tiles, 32×32 chunks, 160-tile depth with bottom bedrock, and ±120,000 horizontal tiles. Global seeded coordinates handle negative chunks. Three biome identities, hills, caves, sparse edits, bounded cache, merged terrain bodies, unload cleanup, reach/line-of-sight mining, supported block placement and actual inventory are connected.

Browser regression used held engine controls and real physics/collisions:
- Started with normal pickaxe, blaster, 20 soil, no wood/ore/coins.
- Harvested the guaranteed tree with E: 8 timber.
- Mined four exposed iron ore blocks.
- Mined tile (32,22), placed one soil block there, and consumed exactly one inventory item.
- Reopened the actual test IndexedDB database: edited terrain and earned skin persisted.
- Entered the starter cave, reached its chest and collected real treasure.
- Traversed from spawn to x≈3900, recalled, then reached x≈−2400. Traversal stayed within 10 active chunks; maximum terrain collision rectangles in that tracked segment: 267.
- Returned to the edited chunk after distant travel and stood on the restored boundary block: collision as well as saved data was checked.

Tests cover deterministic terrain, load order, chunk boundaries, negative coordinates, starter safety/ore/timber across seeds and supported roughness, bedrock, edit regeneration, and unique/open chest anchors. This is not a proof that every procedural cave is reachable.

### Milestone C — weapons, enemies, damage

Blaster/carbine, sword arc, staff/mana, pickaxe/drill, damage/invulnerability/knockback, persistent defeat rewards, enemy resource overflow held at base, caps, and distinct enemy behavior branches are connected.

All six explicit isolated encounter fixtures were damaged and defeated through real projectile collision. Observed states:
- Crawler: patrol/chase.
- Hopper: patrol/chase/windup/recover.
- Drone: patrol/chase/windup/recover.
- Gunner: patrol/chase/windup/burst/recover.
- Caster: patrol/chase/windup/recover.
- Sentinel: patrol/chase/windup/charge/recover.

Naturally crafted sword and staff each defeated an additional enemy. Staff mana consumption and regeneration to 100 were checked. Enemy damage reached the death state; respawn restored 100 health at the checkpoint and retained inventory, coins, and cosmetics. Natural enemy damage cancelled recall; a subsequent uninterrupted recall returned to base.

These controlled encounters verify integration, not comprehensive wall/ledge fairness across every generated terrain shape. Natural traversal included enemy encounters, but the six-type coverage uses fixtures, not six organically discovered spawn locations.

### Milestone D — natural progression and menus

32-slot inventory/eight-slot hotbar, eight recipe cards, selling quantities, five one-time objectives, six skin unlock/equip options, world creation/load, merge import, export, and profile/world ownership rules are connected.

Fresh no-grants regression:
1. Real tree/ore gathering supplied materials.
2. Two bars and sword crafted: timber 8→5; ore consumed by smelting.
3. Craft objective awarded 60 coins.
4. Ranger skin unlock consumed those 60 coins; equip was free.
5. Reachable cave chest supplied crystals; remaining gathered timber + treasure produced the staff.

Gathering/mining/treasure/combat use Phaser actions. Crafting, objective claim, purchase/equip and inventory swaps in this regression call the same durable transactions used by the UI, at the outpost; they do not click every menu card. Separate earlier browser UI checks (with an explicit resource fixture) verified actual crafting clicks, skin purchase/equip, hotbar swapping, refresh persistence and magic fire. Keep that distinction.

Unit tests verify exact recipe consumption, no partial inventory additions, full-pack crafting/chest rollback, one-time chest/objective rewards, repeat skin unlock protection, invalid save rejection, and future AI setting validation.

### Milestone E — connected, only partly polished/verified

Depth darkness, player/torch/crystal light, parallax, biome palettes, underground chest/ruin backgrounds, coarse explored-chunk map with outpost/cache markers, recall, and development metrics are connected. Starter cave/chest and recall were browser-tested. Settings/pause/menu focus and typing isolation were previously browser-tested. Main normal player page still opens with existing basic inventory and zero coins, separate from QA progression.

## Reliability changes in this pass

- Added dev-only `?verify=sandbox` runner with real held inputs, live state checks, normal starting resources, isolated storage, explicit later encounter fixtures, and visible PASS/FAIL output.
- Added named database support to SaveStore; production default is unchanged.
- Added guaranteed starter-resource tests across seeds/settings.
- Respawn clears held/fresh input, jump buffer/coyote state, mining progress, cursor aim and temporary attack/knockback timers; projectiles/enemies are reset.
- Mining rebuilds its chunk and only border-adjacent affected chunks; gathering/chests refresh only their owning decoration chunk.
- Off-screen terrain graphics are culled while collision remains preloaded.
- Enemy decisions are staggered instead of all running in the same update batch.
- Test input waits on actual jump/grounded state instead of assuming a fixed frame rate.
- Fixed test-run cancellation error when hot reload destroyed a scene while an asynchronous test was still finishing. The captured older console error was `Cannot read properties of undefined (reading 'velocity')` in verification cleanup; it was not a normal-game error.
- README replaced obsolete room-game instructions with sandbox launch, controls, progression, saves and testing guidance.

## Checks and limitations

- At resumption: typecheck, build and all 27 previous tests passed.
- After gameplay fixes: typecheck passed, all **28 tests** passed, production build passed.
- Full expanded browser regression completed successfully after respawn/chunk/AI changes (database `gameforge-verification-1789859080434`). Later change only guards cancellation of the dev test runner during hot reload; final typecheck and production build also passed after that guard. The built assets contain neither the verification database prefix nor the regression entry text.
- Production bundle is about 1.50 MB / 427 KB gzip; Vite reports its large-chunk advisory. No build error.
- Browser performance is not certified: regression samples ranged roughly 16–29 FPS, completed at 21 FPS; the normal play page subsequently showed 39–41 FPS with 10 chunks/219 bodies and no console errors. These are samples in this automated browser, not a hardware benchmark or steady 60 FPS claim. Active object bounds passed the finite traversal; multi-hour growth is unverified.
- No remaining gameplay-blocking failure was observed in the completed regression. Earlier failed attempts were test navigation/timing issues or correct guards (overlapping placement, blocked mining, interrupted recall, jumping over instead of entering the cave); the final test handles these.

## Incomplete original requirements / not started

- Performance needs a focused profile on the user's normal browser/laptop. Off-screen culling/rebuild reductions are implemented but have not established smooth 60 FPS.
- Terrain/biomes are a practical first version: limited structure variety, regularly spaced similar chest chambers, simple ruins/shrine backgrounds, and limited surface abandoned facilities. No diverse authored underground laboratory/room-template integration yet; useful old room templates remain preserved only.
- Biome-specific terrain shapes/ambient effects and gradual visual transitions need more polish. Current depth and palette/resource/enemy differences are functional but simpler than the full request.
- Map shows explored chunks, not detailed excavated tile contours. Lighting is intentionally coarse, not a light simulation.
- Enemy wall/ledge edge cases and full natural underground spawn distribution are not exhaustively browser-tested. All six branches and attack states were exercised with explicit fixtures.
- Selling is connected but has not had a separate browser click-through in this pass. Torch illumination, every upgraded recipe, full-pack enemy overflow retrieval, storage-failure UI and multi-tab conflicts are not end-to-end browser-tested.
- Long-session memory/texture growth, other browsers, device fullscreen, and all parameter/seed combinations remain unverified.
- Future AI proposal interface currently supports seed/difficulty/roughness/caves/abundance only. No provider or prompt interpretation is connected; supported live enemy/weapon/objective proposal schemas are not yet implemented. No executable model code or runtime model calls.

## Files to know

- `src/App.tsx`: main sandbox interface, menus and durable transactions; `src/index.css`: responsive shell/HUD/panels.
- `src/main.tsx`: production app entry and DEV-only verification route.
- `src/sandbox/model.ts`: world/profile schema, registries, progression and inventory functions.
- `src/sandbox/terrain.ts`: deterministic global generation, biomes, ownership, sparse edits.
- `src/sandbox/chunks.ts`: bounded loading/cache, graphics, merged collision and invalidation.
- `src/sandbox/engine.ts`: Phaser lifecycle, input, movement, tools, combat, interactions, lighting, death/recall; optional DEV verification port.
- `src/sandbox/enemies.ts`: six enemy data definitions; `assets.ts`: original generated textures/skin poses.
- `src/sandbox/persistence.ts`: validated IndexedDB bundle, serialized atomic mutations, debounce, non-destructive merge import.
- `src/sandbox/ai.ts`: future approved setting boundary, disconnected from AI.
- `src/sandbox/sandbox.test.ts`: 15 sandbox unit tests; remaining 13 legacy tests under `src/game/` and `src/platformer/`.
- `src/sandbox/verification.tsx`: real-engine browser regression. Run in a new tab; it leaves its own QA database for inspection.
- `src/platformer/`: retained movement constants/assets/rooms and prior engine. `src/game/`: older top-down code.
- `test-fixtures/browser-qa.json`: supplied-resource fixture used only in the earlier UI checks, not the fresh progression run.
- `scripts/dev.sh`: launch wrapper using project-local Node. `README.md`: current teammate/player instructions.

## Run / exact next steps

```sh
cd /Users/Chewy/Documents/GameForge
./scripts/dev.sh --port 5175 --strictPort
```

Open `http://127.0.0.1:5175/`. A Vite process is already running there at this handoff. Keep hostname and port stable for existing saves; `localhost` and `127.0.0.1` are distinct storage origins. New worlds preserve old ones; use export for a portable backup.

```sh
export PATH="$PWD/.tools/node-v22.19.0-darwin-x64/bin:$PATH"
npm run typecheck
npm test
npm run build
```

Dev regression URL: `http://127.0.0.1:5175/?verify=sandbox`. Its final page must say COMPLETE, not merely contain some PASS entries. Production excludes that route/module.

Exact work at this checkpoint: reliability repeat, final typecheck/build, normal-page smoke check, and documentation are complete. The normal game tab is left paused at the outpost, ready for Continue expedition; temporary viewport overrides and QA tabs were closed/reset. There is no intentionally half-connected gameplay edit. The highest-priority remaining investigation is performance, followed by the explicit coverage/content gaps above.

Priority for a subsequent implementation session:
1. Re-read this file and Git changes; preserve all untracked work and existing IndexedDB worlds. Final typecheck/build passed; all 28 tests passed.
2. Profile actual gameplay performance (frame time/render commands/chunk generation) with one active game tab; consider baking chunk graphics if drawing is the bottleneck. Re-run the regression after engine changes.
3. Extend targeted wall/ledge, underground spawn, selling/overflow/storage failure checks; fix demonstrated failures before new features.
4. Only after reliability, finish original structure/biome variety and integrate selected retained room templates with deterministic ownership; do not change the generator for existing worlds without version/migration handling.
5. Expand validated future AI schemas if requested; leave model connection explicitly disabled until actually integrated.
