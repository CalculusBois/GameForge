# Implementation status — audited 2026-09-20

## Persistent Forge and remaining F/G gaps (2026-09-20)

- **Forge bosses save on the world.** Temporary AI sessions removed. `world.creations` holds up to 8 specs + spawn + defeated flag. Reload restores living bosses. First defeat pays 60–150 coins. Coins, inventory, terrain, and cosmetics are normal saves during Forge use.
- **Economy:** central `ECONOMY_TABLE` with bulk sizes and shop buy list; décor pack grants banners/lamps/torches atomically; vendor buy > bundle resale tested; complete-bundle sales only (no per-item rounding). Existing gold and owned cosmetics preserved.
- **Gun skins:** equipped family skins recolor the held weapon and hotbar icon. Damage/fire rate unchanged.
- **Wardrobe:** mix-and-match layers use distinct silhouettes (brim, horns, antennae, cape) and follow idle/run/jump/hurt pose. Collision unchanged.
- **QoL:** field journal; map SVG markers for outpost, chests, furnaces, regional bosses, and forged bosses; recipe-discovery notices; comparison tooltips; onboarding checklist.
- **Unverified this session:** live browser Forge create → reload; natural 10–20 minute first-cosmetic timing (estimated in economy comments only); gun-skin in-world appearance in browser.

Previous milestone checkmarks were not reliable: the starting checkout fails typecheck with 12 errors. This audit supersedes them. Checkpoint: `checkpoints/pre-audit-20260920.tar.gz` (source/config/docs; excludes secrets and browser saves). Existing unrelated AI Forge work retained.

Classification uses actual call sites, not registry presence. “Verified” below specifies the evidence; it does not imply natural-play balance.

- **Complete and verified (source inspection):** existing React/Phaser 2D engine, continuous seeded chunks, destructive mining, no water definitions/generation, existing export/merge import, world/profile purchase transaction, starter ownership.
- **Partially implemented — A/shared data:** registries exist for every requested domain; many are disconnected, economy duplicated, runtime definition validation incomplete. Baseline fails typecheck.
- **Partially implemented — B/ores:** eight ores defined and generated; aether placement extremely restricted by biome/depth branching; accessible copper not guaranteed. Gold ore currently sellable. Unique ore visuals need inspection in browser.
- **Partially implemented — B/tools:** tiers/recipes/reach/line-of-sight exist; upgraded pickaxe input broken. Axe tree efficiency and grapple missing. Ladder/rope movement implemented but unverified.
- **Partially implemented — B/furnace:** atomic instant smelt exists, but no authoritative timer, queue, persisted machine output or progress. Legacy bar craft bypasses fuel.
- **Partially implemented — C/biomes/lava:** six biomes and deterministic tiles exist. Generator remained version 1 despite changes; preserve this snapshot before further changes. Lava is noise-filled cave cells, not bounded basins; coverage unmeasured. Burning visual does not apply lingering damage.
- **Partially implemented — C/building:** blocks, walls, platforms, doors, ropes, torches and totems place/reclaim. Crates have no contents. Door closure can overlap actors. Background walls share foreground layer. Furniture, lamps, metal/crystal sets, portable stations missing. Chunk edits rebuild chunks.
- **Partially implemented — D/weapons:** 14 attacks defined; arc pierces rather than chains; shared category sprites; burst uses independent timer. Dedicated tradeoff/range/duplicate-hit verification needed.
- **Partially implemented — D/status/spells:** status ticking exists; movement modifiers applied twice. Blink checks terrain but needs loaded-body check. Shield lacks damage budget. Death cleanup partly implemented.
- **Implemented but unverified — D/equipment/cores:** equip/unequip and caps implemented; optional save fields not validated. Core acquisition needs verification; full stat breakdown missing.
- **Implemented but unverified — D/totems:** nonstacking proximity booleans, placement and HUD exist; scans 441 cells/frame. Balance/selection radius still need verification.
- **Missing — E/animals/variants:** definitions only; no animal runtime or variant spawning/elite behavior.
- **Partially implemented — E/spawns:** cap 12, seeded one enemy/chunk, base exclusion. Desired populations, respawn grace, biome variants, hazard/body checks need work.
- **Partially implemented — E/food/farming:** food transaction helpers, crops and recipes defined; hunger HUD absent, no drain/cooking UI/farming runtime. Buff descriptions overpromise behavior.
- **Partially implemented — F/economy:** existing commerce works; renewable sales, rewards and cosmetic pricing not tuned; gold ore convertible into currency. No measured rates.
- **Missing — F/modular wardrobe/gun skins:** registry definitions only. Existing full-body skins/purchases retained.
- **Missing — F/supply shop:** registry only; no purchase UI.
- **Missing — G/three bosses:** registry only; custom AI Forge enemies are not the requested regional encounters.
- **Partially implemented — G/QoL:** map/base/chests, export, inventory swaps exist; recipe search/pins, sorting, stacking, comparisons, journal, onboarding incomplete.
- **Partially implemented — presentation:** deterministic programmatic art and backgrounds; many shared silhouettes/icons; audio/volume absent; shake toggle exists.
- **Partially implemented — saves:** atomic bundle writes, version rejection/merge import exist; no migration backup, generator history, optional progression/storage validation. No silent reset observed in source.
- **Partially implemented — performance:** bounded chunks/cache/enemies/particles and staggered AI; expensive per-frame scans/rebuilds, projectiles and pause callbacks need auditing. No current performance measurement.
- **Missing — final verification:** fresh-world ore→tool→meal→cosmetic flow, boss fight, prepared late-game cases, cross-chunk/death/reload/menu checks for this revision.

## Verification and milestones

- Initial `npm run typecheck`: FAIL, 12 errors. Node bundled under `.tools/node-v22.19.0-darwin-x64/bin` (not on shell PATH).
- Work proceeds A → B integrations before later additions. No user approval is needed to continue the authorized implementation.

### Integration milestone A/B (2026-09-20)
- Fixed initial 12 compiler errors; baseline 92 tests then passed.
- Connected all registered mining tools to input; removed cobalt recipe circular dependency.
- New generator 2 adds guaranteed surface copper and coal; generator 1 uses the frozen starting implementation in `terrain-v1.ts`. Earlier pre-session generator-1 changes cannot be reconstructed from Git (sandbox was untracked); compatibility claim is limited to this session's starting files.
- Furnace now reserves inputs/fuel once, processes 10s/bar from authoritative active-play clock, persists queue/progress/fuel/output, and holds output until collected. Legacy bar recipe routes through the same furnace. Wood 20s, coal 80s; unused fuel in a completed batch is discarded when replaced (shown by batch reservation).
- Connected crates to persistent 16-slot contents with atomic transfer; nonempty crates cannot be mined. Door closure checks actor overlap.
- Connected hunger (27.5 minutes), six cooking recipes, one replaceable meal buff, forage berries/mushrooms/seeds, soil crops (90s active growth, cap 128), harvest and HUD. No starvation damage. Cooking is instantaneous at outpost; cooking time animation remains incomplete.
- Fixed duplicate status speed application, lingering lava burn, blink full-body/loaded destination checks and path obstruction; shield now has a 40-damage budget and 12s cooldown.
- Added recipe search/pinning, pack sort (hotbar untouched), nearby quick stack. Restricted common resources to complete sale bundles and disabled gold ore/bar sales.
- Added nine focused integration tests; latest full checks in progress. Browser natural progression not yet verified.

### Milestones C–G integration update
- **Verified unit tests:** finite lava basins in generator 2, 2.61% coverage across 50,400 eligible cells / three seeds; no sampled shallow lava; solid floors. Generator 1 stays frozen. Guaranteed copper/coal and aether availability expanded only in generator 2.
- **Verified browser (natural resources):** gathered timber, mined six copper, queued three bars, confirmed pause stops processing, waited for actual furnace output, crafted/equipped copper tool, mined iron through real input, cooked/eat foraged berry dish, bought legacy cosmetic with earned objective reward, reopened actual IndexedDB. Test database separate from player saves. First test route failed line-of-sight and was corrected; gameplay reach was retained.
- **Implemented, limited visual verification:** four wildlife species with separate wander/flee/neutral retaliation AI, bounded population and persistent kill IDs; biome variant selection, silhouettes, frost/poison contact, rust resistance and registry drops. Grazer visible in browser screenshot. Full species/variant behavior remains unverified.
- **Verified model tests + browser rendering:** four modular wardrobe sets, individually purchased parts, discounted remaining pack price, free equip, gun appearance ownership/equip per family, legacy full-body reset. Cosmetic purchase world/profile commits share the existing transaction. New silhouettes for all tools/weapons; arc chains to at most two additional targets; grapple pulls toward visible terrain; axe improves tree yield.
- **Verified prepared Rust boss encounter:** deliberate E interaction at shrine, safe opening, telegraph/recover/charge and phase 2 observed, actual rail projectiles defeated boss, reward not repeated, defeat and gun skin retained after reopen. Character/armor/coins explicitly granted in isolated test; does NOT prove natural boss balance. Fungal and aether boss runtime connected but checks pending.
- **Implemented but unverified:** portable workbench/cooking/advanced stations; portable furnace accesses one authoritative world queue (linked furnace design, not independent machines); table/chair/banner/lamp; timber/stone/metal/crystal building sets; background walls persist separately for newly placed walls; original foreground-layer walls remain compatible/reclaimable.
- **Implemented but unverified:** original synthesized sound cues after user activation, volume control; more distinct weapon sprites; totem scans reduced to 5 Hz.
- **Save format 2:** accepts v1, saves a `backup-v1` record in the same atomic transaction before upgrading. Both terrain generators supported. New profile parts/gun appearances merge on import. Existing balances/owned legacy skins retained. Additional optional-field validation runs on every committed transaction.
- **Economy:** central enemy rewards now 3 ordinary / 8 strong, chest 20, bosses 90/120/150. Common resource bundle sales and no gold-ore/bar conversion. Supply shop connected; quantity/resale tests. Legacy objective/full-body skin prices retained. No natural 10–20 minute cosmetic balancing claim.
- **Performance observation:** prepared Rust encounter on local development server, IAB at 960×540 canvas, roughly 42–44 FPS, 15 chunks / 256 terrain bodies. Natural starter test observed roughly 51 FPS / 10 chunks / 223 bodies. These are HUD samples, not controlled benchmarks; later totem/cache optimizations need remeasurement.
