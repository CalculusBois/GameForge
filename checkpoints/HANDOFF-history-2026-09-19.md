# GameForge sandbox upgrade handoff

## Reliability resumption — 2026-09-19 (current, supersedes historical status below)

Current request: preserve all work/saves; check post-browser edits; test long exploration, chunk-boundary mine/place, every enemy, death/respawn/recall, and a fresh no-grants economy loop. Fix reliability before adding scope. Original full requirements: `/Users/Chewy/.codex/attachments/ab3a6681-5833-4bcb-a30d-d249e5ced03c/Pasted text.txt`.

- Baseline resumption: typecheck, production build, and all 27 prior tests passed. Phaser bundle advisory remains. New code since then requires final rerun.
- Added `src/sandbox/verification.tsx`, dev-only `?verify=sandbox` entry in `src/main.tsx`, optional development verification port in engine, and named test-database support in SaveStore. These use actual held controls/physics and durable transactions, never open the normal `gameforge-frontier` database, and grant no economy resources. Enemy cases use explicit fixtures after the natural economy proof.
- Actual browser results so far: normal fresh start; E tree harvest → 8 wood; mine → 4 iron; smelt twice and craft sword → 5 wood remaining; craft objective → 60 coins; ranger unlock → 0 coins; equip. Craft/purchase calls use the same durable transactions as the separately browser-tested menus, while harvesting/mining use Phaser.
- Boundary x=32,y=22 mined and replaced with one consumed soil block. Reopened actual IndexedDB record retained that block and earned skin. Guardrails rejected obstructed mining and actor-overlapping placement while adjusting the test navigation.
- Actual sustained traversal: x≈3900 then recall and x≈−2400, active terrain stayed at 10 chunks, maximum 267 collision rectangles in that run. Natural enemy damage cancelled a recall; a subsequent uninterrupted recall completed. Browser sample performance was 16–29 FPS, so do not claim steady 60 FPS.
- Every-enemy fixtures and death/respawn are currently in progress; do not mark passed yet. Current regression tab is `http://127.0.0.1:5175/?verify=sandbox` and displays stage, metrics, PASS/FAIL logs.
- README now explains current sandbox, controls, progression, save ownership/origin and launch. Added guaranteed starter-resource checks across seeds/settings; final test run pending.

Exact next steps: read regression results; fix any gameplay failures; reduce avoidable graphics/rebuild cost if measurable; verify all combat/death/reset cases; rerun typecheck/tests/build; replace this interim status with final results and remaining original requirements. Keep the historical sections below for context; their “not connected” statements are outdated.


## Original request and preservation
Extend the existing React/TypeScript/Phaser platformer into an original side-view planet sandbox: continuous seeded hills/caves, three biomes, bounded chunk streaming, mining/placement, inventory, blaster/sword/magic, six behavioral enemies, coins, eight crafting recipes, objectives, six cosmetic skins, safe outpost, chests, lighting, explored map, recall, and versioned local saves. All menus must have functional gameplay integration. AI remains disconnected; approved data only. Requirements also demand deterministic/transaction tests, browser checks, and honest limitations.

Full requirements remain in `/Users/Chewy/.codex/attachments/ab3a6681-5833-4bcb-a30d-d249e5ced03c/Pasted text.txt`.
Local Git checkpoint: `855d463` (platformer before sandbox expansion). Do not discard untracked sandbox modules or checkpoints archive. No project AGENTS.md found in the audit. This handoff is created before further implementation, as requested.

## Audit at resumption
- Connected and previously verified: existing room-based platformer at `src/App.tsx` → `src/platformer/engine.ts`, movement, camera, original sprites, UI; prior tests/build passed. Prior browser checks only covered rendering, pause/resume, restarts, typing isolation and viewport sizing.
- Partially implemented, NOT connected to gameplay: all five `src/sandbox` modules. Their existence does not mean mining, terrain, economy or saving is playable.
- Missing: sandbox engine and UI integration, six enemy behavior integration, map, recall, lighting, real transactions exposed to player, automated sandbox checks, current browser verification.
- Git audit: only `src/sandbox/` and `checkpoints/` are untracked; no modifications to committed platformer at audit time.

## Files inspected
- `src/sandbox/model.ts`: item registry/stacks, eight recipes, six skins, objectives, world/profile models, basic crafting/unlock/claim/chest transaction functions, material and weapon definitions.
- `src/sandbox/terrain.ts`: global seeded terrain/noise, negative-coordinate helpers, biomes, cave corridors, ore, deterministic harvestables/chests, sparse edits and line-of-sight helpers.
- `src/sandbox/chunks.ts`: bounded active/cache chunk renderer and merged terrain collision bodies; not instantiated by gameplay yet.
- `src/sandbox/assets.ts`: original skin poses, enemy and equipment textures, reuse of platformer assets; not loaded yet.
- `src/sandbox/persistence.ts`: IndexedDB bundle storage and serialized atomic transactions; not opened by UI yet. Position debounce captures old coordinates; cross-tab writing not protected. Needs review and tests.
- `src/platformer/`: retained playable room game, movement constants, assets and tests; reusable source.
- `src/App.tsx`, `src/index.css`: current room-game interface.
- `scripts/dev.sh`: launcher using local Node when absent from PATH.

## Exact interrupted task
About to write and connect a continuous-world Phaser engine using `ChunkManager`, existing movement, and SaveStore; then expose mining/placement and actual inventory/economy menus. The existing primary app still launches the old room game.

## Checks / known problems at audit
Build/typecheck and existing tests were started on resumption; results pending at this initial handoff write. No sandbox behavior has been browser-tested. The terrain chamber ownership expression may truncate one side of a chamber and needs correction. Cache invalidation/physics destruction, spawn restoration, save validation and durable transaction behavior require checks before claiming completion.

## Run
`cd /Users/Chewy/Documents/GameForge && ./scripts/dev.sh --port 5174`
Open the URL Vite prints (it may select another port if occupied).
Checks: `export PATH="$PWD/.tools/node-v22.19.0-darwin-x64/bin:$PATH"`, then `npm test`, `npm run typecheck`, `npm run build`.

## Next steps in priority order
1. Finish audit checks and record errors; correct any compiler failures without discarding modules.
2. Milestone A: connect terrain/chunks to the retained movement and camera; safe spawn, unload boundaries; browser-check.
3. Milestone B: integrate actual mining, placement, resources/inventory and durable terrain edits.
4. Milestone C: weapons, six bounded enemy behaviors, drops, coins, death/recall.
5. Milestone D: connect base crafting, selling, objectives, skin purchase/equip and persistent world/profile ownership.
6. Milestone E: explored map, lighting, chests/biomes, tests/performance and browser verification.
7. Update this file after each milestone, marking unverified work explicitly.

## Milestone A integration update
- Connected `src/App.tsx` to new `src/sandbox/engine.ts` and IndexedDB initialization. Primary mode now instantiates continuous terrain, chunk collision/streaming, retained movement constants, following camera, and safe outpost.
- Fixed TypeScript parameter-property errors in `chunks.ts` and corrected deterministic chamber ownership in `terrain.ts`.
- Engine integration also contains initial hooks for B–E (tools, enemies, menus), but these are not yet verified. Compile check is currently running; do not infer playable completeness from source existence.
- `src/index.css` retains platformer styling and adds responsive sandbox HUD, hotbar, and modal panels.
- Next: fix compiler errors, inspect browser startup, then validate mining/save and economy transactions with tests. Known unfinished detail: import currently replaces bundle while UI says merge; fix before exposing as complete. Enemy resource overflow currently discards a resource and needs a reliable alternative.

## Milestone B integration and automated checks
- Engine now connects mining with reach/line-of-sight checks, material times, inventory insertion and durable sparse edits; placement consumes blocks and checks actor/outpost overlap. Harvesting uses E. Chunk graphics/collision invalidate after successful transactions.
- Inventory/hotbar UI is connected, including click-to-swap. Position writes now retain the latest sampled position, not the first stale sample.
- IndexedDB transactions read and modify the latest durable bundle atomically; failure leaves in-memory progression unchanged. Import now merges worlds without overwriting an existing world and merges cosmetic ownership.
- 26 tests passed (13 sandbox tests + 13 retained tests): global deterministic terrain, load order, borders, negative coordinates, safe start/cave/bedrock, serialized terrain edits, chest ownership, exact recipe consumption, inventory-full rollback, skin repeat purchase, chest/objective duplication, invalid saves.
- Production build is in progress. Local server start failed with sandbox EPERM and was retried with required escalation. Browser verification has not yet happened for the sandbox.

## Milestone C/D integration status (unverified in browser)
- `src/sandbox/engine.ts` connects blaster/carbine, sword, staff/mana, damage/death/recall, six enemy behavior branches, persistent defeat rewards, and bounded projectiles/enemies/particles.
- Full-pack enemy resources are held in persistent `pendingLoot` for collection at the base terminal instead of being silently discarded.
- `src/App.tsx` connects 8 recipe cards, selling quantities, 5 one-time objectives, 6 skin purchase/equip options with illustrated previews, world creation/load/export/import, and map/settings panels. Each mutation uses SaveStore transactions.
- Still need actual browser checks for terrain streaming, actions, crafting/skins and save/reload; do not call these verified yet. Enemy navigation and lighting are basic first versions. Need update README after final checks.

## Browser startup verified
- Sandbox loads at `http://127.0.0.1:5175/` (5174 was occupied). Outpost, original explorer, terrain, tree/plant decorations and hotbar visibly render. Continue expedition changes state to playing.
- No browser console errors/warnings were captured in the initial startup check.
- Actual gameplay checks beyond startup are still in progress; do not claim combat/mining/persistence from this screenshot alone.

## Milestone D browser transaction verification
Used a separate `http://localhost:5175/` origin (main player origin remains `http://127.0.0.1:5175/`) with explicit fixture `test-fixtures/browser-qa.json`. The fixture supplies test resources/100 coins; these checks do NOT establish earning those resources through gameplay.
- Imported the fixture through the actual file import UI. Existing first world remained available.
- Crafted two iron bars: iron ore 12→10→8, bars 0→1→2.
- Crafted Arc sabre: bars 2→0, timber 12→9.
- Crafted Prism staff: crystal 8→4, timber 9→5.
- Purchased Salvage ranger: coins 100→40; button changed to free Equip. Equipped it without further deduction.
- Reloaded browser: coins 40, reduced resources, sword/staff and ownership persisted. Inventory UI contained both crafted weapons.
- Swapped staff into hotbar using click-to-move, resumed, selected slot 3 and pressed J: mana visibly fell 100→85, magical projectile fired, and the equipped ranger hat/armour visibly appeared in actual gameplay.
- Menu focus now moves to the menu container when opened, preventing shortcuts from controlling a hidden game.
- Performance sample at spawn: 60 FPS, 10 active chunks, 219 terrain bodies, 0 enemies. This is one sample, not an extended benchmark.

## Milestone E status
- Biome palettes, natural terrain, seeded chests/ruin backgrounds, depth darkness with local player/torch/crystal light, explored-chunk map, recall and performance overlay are connected.
- Extended enemy spawning to scan underground chunk floors so crystal-depth enemy types can actually appear; gunner/caster maintain distance.
- Still not browser-verified: sustained travel across positive/negative chunks, mine/place at boundaries, melee damage/enemy defeat, all six enemy behaviors, death/recall end-to-end, long-session object growth. Geometry and transaction tests do not replace those playthroughs.
- Final tasks: review remaining correctness gaps, rerun checks after last changes, update README/this handoff, leave main world ready for play.
