import { advanceWorld, collectFurnace } from './simulation';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WORLD,
  CHUNK,
  DEPTH,
  ITEMS,
  MATERIALS,
  BUILDING,
  newWorld,
  initialBundle,
  add,
  count,
  craft,
  smelt,
  SMELTING_RECIPES,
  SMELTING_FUELS,
  unlock,
  claim,
  chest,
  WEAPONS,
  useVitalityCore,
  useManaCore,
  equipItem,
  unequipItem,
  derivePlayerStats,
  createStatusEffect,
  tickStatusEffects,
  TOTEM_REGISTRY,
  type ItemId,
} from './model';
import { TOOL_TIERS, getToolProfile } from './registry/toolsAndWeapons';
import { generateChunk, baseTile, readTile, editTile, chunkOf, localOf, surface, landmarks, harvestables, findGroundY, calculateSafeSurfaceSpawnY, biome } from './terrain';
import { validateBundle } from './persistence';
describe('seeded continuous terrain', () => {
    it('is deterministic and independent of load order', () => { const a = newWorld('a', DEFAULT_WORLD), b = newWorld('b', DEFAULT_WORLD); const keys = [[-2, 0], [0, 0], [1, 1], [4, 2], [-1, 3]]; const reference = keys.map(([x, y]) => generateChunk(a, x, y)); for (const [x, y] of [...keys].reverse())
        generateChunk(b, x, y); keys.forEach(([x, y], i) => expect(generateChunk(b, x, y)).toEqual(reference[i])); });
    it('uses global tile coordinates at both sides of boundaries', () => { const w = newWorld('a', DEFAULT_WORLD); for (const cx of [-2, -1, 0, 1]) {
        const l = generateChunk(w, cx, 1), r = generateChunk(w, cx + 1, 1);
        for (let y = 0; y < CHUNK; y++) {
            expect(l[y * CHUNK + 31]).toBe(baseTile(DEFAULT_WORLD, cx * CHUNK + 31, 32 + y));
            expect(r[y * CHUNK]).toBe(baseTile(DEFAULT_WORLD, (cx + 1) * CHUNK, 32 + y));
        }
    } });
    it('correctly addresses negative chunks and tile offsets', () => { expect(chunkOf(-1)).toBe(-1); expect(localOf(-1)).toBe(31); expect(chunkOf(-32)).toBe(-1); expect(localOf(-32)).toBe(0); expect(chunkOf(-33)).toBe(-2); });
    it('keeps spawn safe, guarantees the starter cave and bottom boundary', () => { for (let x = 6; x < 25; x++) {
        expect(baseTile(DEFAULT_WORLD, x, 21)).toBe(0);
        expect(baseTile(DEFAULT_WORLD, x, 22)).toBe(7);
    } expect(baseTile(DEFAULT_WORLD, 40, 24)).toBe(0); for (let x = -100; x < 100; x++)
        expect(baseTile(DEFAULT_WORLD, x, DEPTH - 1)).toBe(6); for (let x = -200; x < 200; x++) {
        const step = Math.abs(surface(DEFAULT_WORLD, x + 1) - surface(DEFAULT_WORLD, x));
        // Spawn valley stays gentle; mountain cliffs elsewhere may step steeper (build/climb).
        expect(step).toBeLessThanOrEqual(x >= -80 && x < 80 ? 2 : 10);
    } });
    it('findGroundY accurately determines the top solid pixel coordinate for safe entity spawning', () => {
        const w = newWorld('test-ground', DEFAULT_WORLD);
        const groundY = findGroundY(w, 10, 20);
        expect(groundY).toBe(22 * 24); // 22 * TILE (TILE is 24)
    });
    it('calculateSafeSurfaceSpawnY calculates surface spawn with half-height and 0.1 offset to avoid floor clipping', () => {
        const ground_Y = 22 * 24; // 528
        const height = 64;
        const spawnY = calculateSafeSurfaceSpawnY(ground_Y, height, false);
        // Entity center is at ground_Y - (height / 2) - 0.1
        expect(spawnY).toBeCloseTo(528 - 32 - 0.1, 5);
        // Bottom edge sits at exactly ground_Y - 0.1, preventing any terrain tile overlap
        expect(spawnY + height / 2).toBeCloseTo(ground_Y - 0.1, 5);

        // Flying entity hovers safely above
        const flyY = calculateSafeSurfaceSpawnY(ground_Y, height, true);
        expect(flyY).toBe(528 - 64 - 80);
    });
    it('preserves mined and placed tiles through regeneration and serialized reopen', () => { const b = initialBundle(), w = b.worlds[b.active]; editTile(w, -1, 35, 0); editTile(w, 32, 30, 7); generateChunk(w, 8, 2); const restored = JSON.parse(JSON.stringify(b)); validateBundle(restored); expect(readTile(restored.worlds[b.active], -1, 35)).toBe(0); expect(readTile(restored.worlds[b.active], 32, 30)).toBe(7); expect(generateChunk(restored.worlds[b.active], -1, 1)[3 * 32 + 31]).toBe(0); });
    it('guarantees harvestable timber and exposed copper across supported settings', () => {
        for (const seed of ['frontier', 'negative-map', 'strange planet', '123']) {
            for (const roughness of [.6, 1, 1.4]) {
                const settings = {...DEFAULT_WORLD, seed, roughness};
                expect(harvestables(settings, 0).some(p => p.x === 3 && p.kind === 'tree')).toBe(true);
                for (let x = 27; x <= 32; x++) {
                    expect(baseTile(settings, x, 21)).toBe(0);
                    expect(baseTile(settings, x, 22)).toBe(10);
                }
            }
        }
    });
    it('owns every chest once and leaves its interaction point open', () => { const all = [...landmarks(DEFAULT_WORLD, 1), ...landmarks(DEFAULT_WORLD, 2), ...landmarks(DEFAULT_WORLD, 3)]; expect(new Set(all.map(l => l.id)).size).toBe(all.length); for (const l of all)
        expect(baseTile(DEFAULT_WORLD, l.x, l.y - 1)).toBe(0); });
});
describe('inventory and durable progression rules', () => {
    it('consumes recipe ingredients exactly once', () => { const w = newWorld('w', DEFAULT_WORLD); add(w.inventory, 'station_furnace', 1); add(w.inventory, 'iron', 4); add(w.inventory, 'wood', 1); craft(w, 'bar', true); for(let i=0;i<10;i++) advanceWorld(w,1000); collectFurnace(w,true); expect(count(w.inventory, 'iron')).toBe(2); expect(count(w.inventory, 'bar')).toBe(1); expect(() => craft(w, 'staff', false)).toThrow(); });
    it('keeps all ingredients if crafting output does not fit', () => { const w = newWorld('w', DEFAULT_WORLD); w.inventory = Array.from({ length: 32 }, () => ({ id: 'stone' as ItemId, count: 99 })); w.inventory[0] = { id: 'bar', count: 99 }; const before = structuredClone(w.inventory); expect(() => craft(w, 'sword', true)).toThrow(); expect(w.inventory).toEqual(before); });
    it('does not partially add inventory stacks on overflow', () => { const w = newWorld('w', DEFAULT_WORLD); w.inventory = Array.from({ length: 32 }, () => ({ id: 'stone' as ItemId, count: 99 })); w.inventory[0]!.count = 98; expect(add(w.inventory, 'stone', 2)).toBe(false); expect(w.inventory[0]!.count).toBe(98); });
    it('charges a skin purchase once and preserves ownership', () => { const b = initialBundle(), w = b.worlds[b.active]; w.coins = 100; unlock(b, 'ranger'); unlock(b, 'ranger'); expect(w.coins).toBe(40); expect(b.profile.owned.filter(id => id === 'ranger')).toHaveLength(1); expect(() => unlock(b, 'knight')).toThrow(); expect(w.coins).toBe(40); });
    it('prevents repeated chest and objective rewards', () => { const w = newWorld('w', DEFAULT_WORLD); chest(w, 'landing-cache'); expect(() => chest(w, 'landing-cache')).toThrow(); expect(w.coins).toBe(20); claim(w, 'chest'); expect(() => claim(w, 'chest')).toThrow(); expect(w.coins).toBe(65); });
    it('keeps chest closed and coins unchanged with a full pack', () => { const w = newWorld('w', DEFAULT_WORLD); w.inventory = Array.from({ length: 32 }, () => ({ id: 'stone' as ItemId, count: ITEMS.stone.stack })); expect(() => chest(w, 'cache')).toThrow(); expect(w.opened).toEqual([]); expect(w.coins).toBe(0); });
});

describe('Milestone B: ores, tool tiers, and furnace smelting progression', () => {
    it('executes atomic furnace smelting with fuel consumption and recipe ratio', () => {
        expect(SMELTING_RECIPES.length).toBeGreaterThanOrEqual(5);
        expect(SMELTING_FUELS.coal.smeltsPerUnit).toBe(8);
        expect(TOOL_TIERS.pickaxe.tier).toBe(0);
        const w = newWorld('smelt-test', DEFAULT_WORLD);
        add(w.inventory, 'station_furnace', 1);
        add(w.inventory, 'copper_ore', 10);
        add(w.inventory, 'coal', 5);
        // Smelt 2 copper bars: requires 4 copper ore and 1 coal (1 coal covers up to 8 smelts)
        const msg = smelt(w, 'copper_ore', 'coal', 2, true);
        expect(msg).toContain('Queued 2 Copper bar using 1 Coal');
        expect(count(w.inventory, 'copper_bar')).toBe(0);
        for(let i=0;i<20;i++) advanceWorld(w,1000); collectFurnace(w,true);
        expect(count(w.inventory, 'copper_ore')).toBe(6);
        expect(count(w.inventory, 'coal')).toBe(4);
        expect(count(w.inventory, 'copper_bar')).toBe(2);
        // Leftover coal burn must cover another 2 bars without taking more coal
        const leftover = smelt(w, 'copper_ore', 'coal', 2, true);
        expect(leftover).toContain('using 0 Coal');
        for(let i=0;i<20;i++) advanceWorld(w,1000); collectFurnace(w,true);
        expect(count(w.inventory, 'coal')).toBe(4);
        expect(count(w.inventory, 'copper_bar')).toBe(4);
    });

    it('enforces coal vs wood fuel efficiency scaling', () => {
        const w = newWorld('fuel-test', DEFAULT_WORLD);
        add(w.inventory, 'station_furnace', 1);
        add(w.inventory, 'copper_ore', 20);
        add(w.inventory, 'coal', 5);
        add(w.inventory, 'wood', 10);

        // 8 bars with coal uses exactly 1 coal (8 smelts / unit)
        smelt(w, 'copper_ore', 'coal', 8, true);
        for(let i=0;i<80;i++) advanceWorld(w,1000); collectFurnace(w,true);
        expect(count(w.inventory, 'coal')).toBe(4);
        expect(count(w.inventory, 'copper_bar')).toBe(8);

        // 2 bars with timber uses exactly 1 timber (2 smelts / unit)
        smelt(w, 'copper_ore', 'wood', 2, true);
        for(let i=0;i<20;i++) advanceWorld(w,1000); collectFurnace(w,true);
        expect(count(w.inventory, 'wood')).toBe(9);
        expect(count(w.inventory, 'copper_bar')).toBe(10);
    });

    it('guards smelting preconditions: outpost location, ore quantity, fuel quantity, and pack capacity', () => {
        const w = newWorld('guard-test', DEFAULT_WORLD);
        add(w.inventory, 'station_furnace', 1);
        add(w.inventory, 'iron', 4);
        add(w.inventory, 'coal', 2);

        // Must be at outpost forge
        expect(() => smelt(w, 'iron', 'coal', 1, false)).toThrow(/outpost forge/);

        const wNoFurnace = newWorld('no-furnace', DEFAULT_WORLD);
        add(wNoFurnace.inventory, 'iron', 4);
        add(wNoFurnace.inventory, 'coal', 2);
        expect(() => smelt(wNoFurnace, 'iron', 'coal', 1, true)).toThrow(/furnace/);

        // Insufficient ore
        expect(() => smelt(w, 'iron', 'coal', 10, true)).toThrow(/Need/);

        // Insufficient fuel
        const wNoFuel = newWorld('no-fuel', DEFAULT_WORLD);
        add(wNoFuel.inventory, 'station_furnace', 1);
        add(wNoFuel.inventory, 'iron', 4);
        expect(() => smelt(wNoFuel, 'iron', 'coal', 1, true)).toThrow(/fuel/);

        // Full inventory safety: ingredients must be preserved
        const wFull = newWorld('full-pack', DEFAULT_WORLD);
        wFull.inventory = Array.from({ length: 32 }, () => ({ id: 'stone' as ItemId, count: 99 }));
        wFull.inventory[0] = { id: 'iron', count: 10 };
        wFull.inventory[1] = { id: 'coal', count: 10 };
        wFull.inventory[2] = { id: 'station_furnace', count: 1 };
        smelt(wFull, 'iron', 'coal', 1, true);
        for(let i=0;i<10;i++) advanceWorld(wFull,1000);
        expect(() => collectFurnace(wFull,true)).toThrow(/full/);
        expect(wFull.furnace?.stored).toBe(1);
    });

    it('defines strictly tiered tool profiles and harvesting tier gates', () => {
        const starter = getToolProfile('pickaxe')!;
        const copper = getToolProfile('pickaxe_copper')!;
        const iron = getToolProfile('pickaxe_iron')!;
        const cobalt = getToolProfile('pickaxe_cobalt')!;
        const aether = getToolProfile('pickaxe_aether')!;

        expect(starter.tier).toBe(0);
        expect(copper.tier).toBe(1);
        expect(iron.tier).toBe(2);
        expect(cobalt.tier).toBe(3);
        expect(aether.tier).toBe(4);

        // Monotonically increasing mining speed multipliers
        expect(copper.mineSpeedMultiplier).toBeGreaterThan(starter.mineSpeedMultiplier);
        expect(iron.mineSpeedMultiplier).toBeGreaterThan(copper.mineSpeedMultiplier);
        expect(cobalt.mineSpeedMultiplier).toBeGreaterThan(iron.mineSpeedMultiplier);
        expect(aether.mineSpeedMultiplier).toBeGreaterThan(cobalt.mineSpeedMultiplier);

        // Harvesting capabilities
        expect(starter.maxHarvestTier).toBe(1);
        expect(copper.maxHarvestTier).toBe(2);
        expect(cobalt.maxHarvestTier).toBe(4);
        expect(aether.maxHarvestTier).toBe(4);

        // Reach tiles scaling
        expect(aether.reachTiles).toBeGreaterThanOrEqual(7);
    });

    it('contains all expanded ore materials, placeables, and drop mappings in MATERIALS', () => {
        // Core ore materials
        expect(MATERIALS[10].drop).toBe('copper_ore');
        expect(MATERIALS[11].drop).toBe('coal');
        expect(MATERIALS[12].drop).toBe('silver_ore');
        expect(MATERIALS[13].drop).toBe('gold_ore');
        expect(MATERIALS[14].drop).toBe('cobalt_ore');
        expect(MATERIALS[15].drop).toBe('obsidian');
        expect(MATERIALS[16].drop).toBe('aether_crystal');

        // Material tier gating
        expect(MATERIALS[10].minTier).toBe(0); // Copper can be mined by starter pickaxe
        expect(MATERIALS[3].minTier).toBe(1);  // Iron requires copper or better
        expect(MATERIALS[13].minTier).toBe(2); // Gold requires iron or better
        expect(MATERIALS[14].minTier).toBe(2); // Cobalt requires iron or better
        expect(MATERIALS[15].minTier).toBe(3); // Obsidian requires cobalt or better
        expect(MATERIALS[16].minTier).toBe(3); // Aether cluster requires cobalt or better

        // Placeable building materials
        expect(BUILDING.platform_wood).toBe(17);
        expect(BUILDING.wall_wood).toBe(18);
        expect(BUILDING.wall_stone).toBe(19);
        expect(BUILDING.chest_wood).toBe(20);
    });

    it('procedurally distributes deep and shallow ore veins in generated chunks', () => {
        const w = newWorld('vein-world', DEFAULT_WORLD);
        // Generate chunk 0, 1 (cavern depth: y from 32 to 64)
        const cavernTiles = generateChunk(w, 0, 1);
        // Should contain ores from the expanded table
        const oresFound = new Set(cavernTiles.filter(m => [3, 4, 5, 10, 11, 12, 13, 14, 15, 16].includes(m)));
        expect(oresFound.size).toBeGreaterThan(0);
    });
});

describe('Milestone C: Biomes, limited lava, building improvements, and textures', () => {
    it('generates all 6 continuous biomes with deterministic transitions', () => {
        const biomesFound = new Set<string>();
        // Scan across surface, mid caverns, and deep mantle
        for (let x = -400; x <= 400; x += 15) {
            for (let y = 10; y <= 130; y += 15) {
                biomesFound.add(biome(DEFAULT_WORLD, x, y));
            }
        }
        expect(biomesFound).toContain('Verdant frontier');
        expect(biomesFound).toContain('Rust wastes');
        expect(biomesFound).toContain('Frost highlands');
        expect(biomesFound).toContain('Fungal hollows');
        expect(biomesFound).toContain('Crystal depths');
        expect(biomesFound).toContain('Ashen depths');
        expect(biomesFound.size).toBe(6);

        // Spawn safety and starter zone guarantees
        expect(biome(DEFAULT_WORLD, 0, 22)).toBe('Verdant frontier');
        expect(biome(DEFAULT_WORLD, 20, 22)).toBe('Verdant frontier');
        expect(biome(DEFAULT_WORLD, -20, 22)).toBe('Verdant frontier');

        // Deep mantle guarantees Ashen depths
        expect(biome(DEFAULT_WORLD, 0, 110)).toBe('Ashen depths');
        expect(biome(DEFAULT_WORLD, 150, 120)).toBe('Ashen depths');
    });

    it('strictly enforces zero water anywhere and generates bounded deep lava pools', () => {
        // Zero water constraint: verify no water items, tiles, or materials exist
        const allItems = Object.keys(ITEMS);
        expect(allItems.some(id => id.includes('water'))).toBe(false);
        const allMaterials = Object.values(MATERIALS);
        expect(allMaterials.some(m => m.name.toLowerCase().includes('water'))).toBe(false);

        // Lava specifications
        const lava = MATERIALS[23];
        expect(lava.name).toBe('Lava');
        expect(lava.solid).toBe(false);
        expect(lava.isHazard).toBe(true);
        expect(lava.time).toBe(Infinity);

        // Surface and shallow caverns never spawn lava
        const w = newWorld('lava-test', DEFAULT_WORLD);
        const surfaceChunk = generateChunk(w, 0, 0);
        expect(surfaceChunk.filter(m => m === 23)).toHaveLength(0);
        const midCavernChunk = generateChunk(w, 0, 1);
        expect(midCavernChunk.filter(m => m === 23)).toHaveLength(0);

        // Deep mantle (y >= 115) hollows contain bounded lava pools (1-3% coverage)
        let deepLavaCount = 0;
        let deepMantleTiles = 0;
        for (let cy = 3; cy <= 4; cy++) {
            for (let cx = -2; cx <= 2; cx++) {
                const chunk = generateChunk(w, cx, cy);
                deepLavaCount += chunk.filter(m => m === 23).length;
                deepMantleTiles += chunk.length;
            }
        }
        expect(deepLavaCount).toBeGreaterThan(0);
        const lavaRatio = deepLavaCount / deepMantleTiles;
        expect(lavaRatio).toBeLessThan(0.05); // strictly bounded to small pools
    });

    it('supports full placeable building suite: timber doors, platforms, walls, crates, and climbables', () => {
        // Door materials and building registry
        expect(BUILDING.door_wood).toBe(24);
        expect(MATERIALS[24].name).toBe('Timber door');
        expect(MATERIALS[24].solid).toBe(true);
        expect(MATERIALS[24].isDoor).toBe(true);
        expect(MATERIALS[25].name).toBe('Open door');
        expect(MATERIALS[25].solid).toBe(false);
        expect(MATERIALS[25].isDoor).toBe(true);

        // Crafting door from timber
        const w = newWorld('door-craft-test', DEFAULT_WORLD);
        add(w.inventory, 'wood', 8);
        const msg = craft(w, 'door_wood', true);
        expect(msg).toContain('Crafted 1 Timber door');
        expect(count(w.inventory, 'door_wood')).toBe(1);

        // Platforms, walls, and climbables
        expect(BUILDING.platform_wood).toBe(17);
        expect(MATERIALS[17].isPlatform).toBe(true);
        expect(MATERIALS[17].solid).toBe(false);

        expect(BUILDING.wall_wood).toBe(18);
        expect(MATERIALS[18].isBackground).toBe(true);
        expect(MATERIALS[18].solid).toBe(false);

        expect(BUILDING.wall_stone).toBe(19);
        expect(MATERIALS[19].isBackground).toBe(true);
        expect(MATERIALS[19].solid).toBe(false);

        expect(BUILDING.chest_wood).toBe(20);
        expect(BUILDING.rope).toBe(21);
        expect(MATERIALS[21].isClimbable).toBe(true);
        expect(BUILDING.ladder).toBe(22);
        expect(MATERIALS[22].isClimbable).toBe(true);
    });

    it('preserves and validates bundle persistence with all new Milestone C materials (0-25)', () => {
        const b = initialBundle();
        const w = b.worlds[b.active];
        // Edit tiles with new materials
        editTile(w, 5, 20, 17); // Platform
        editTile(w, 6, 20, 18); // Wood wall
        editTile(w, 7, 20, 20); // Storage crate
        editTile(w, 8, 20, 21); // Rope
        editTile(w, 9, 20, 22); // Ladder
        editTile(w, 10, 20, 23); // Lava
        editTile(w, 11, 20, 24); // Timber door closed
        editTile(w, 12, 20, 25); // Timber door open

        const serialized = JSON.parse(JSON.stringify(b));
        expect(() => validateBundle(serialized)).not.toThrow();
        expect(readTile(serialized.worlds[b.active], 10, 20)).toBe(23);
        expect(readTile(serialized.worlds[b.active], 11, 20)).toBe(24);
        expect(readTile(serialized.worlds[b.active], 12, 20)).toBe(25);
    });
});

describe('Milestone D: weapons, magic, equipment, permanent upgrades, and totems', () => {
    it('provides 12+ working weapons across guns, melee, and magic categories', () => {
        const guns = ['blaster', 'carbine', 'blaster_burst', 'blaster_scatter', 'rifle_rail'];
        const melee = ['sword', 'sword_long', 'spear', 'hammer_heavy'];
        const magic = ['staff', 'staff_ember', 'wand_frost', 'staff_arc', 'tome_crystal'];

        // All 14 weapons exist in WEAPONS registry
        for (const wId of [...guns, ...melee, ...magic]) {
            const w = WEAPONS[wId];
            expect(w, `Weapon ${wId} should be defined`).toBeDefined();
            expect(w.damage).toBeGreaterThan(0);
            expect(w.cooldown).toBeGreaterThan(0);
        }

        // Guns verify types and special firing properties
        expect(WEAPONS['blaster'].type).toBe('gun');
        expect(WEAPONS['blaster_burst'].type).toBe('gun');
        expect(WEAPONS['blaster_burst'].pellets).toBe(3);
        expect(WEAPONS['blaster_scatter'].type).toBe('gun');
        expect(WEAPONS['blaster_scatter'].pellets).toBe(5);
        expect(WEAPONS['rifle_rail'].type).toBe('gun');
        expect(WEAPONS['rifle_rail'].pierce).toBe(3);

        // Melee verify types, range reach, and knockback
        expect(WEAPONS['sword'].type).toBe('melee');
        expect(WEAPONS['sword_long'].range).toBeGreaterThan(WEAPONS['sword'].range ?? 0);
        expect(WEAPONS['spear'].type).toBe('melee');
        expect(WEAPONS['spear'].range).toBeGreaterThan(WEAPONS['sword'].range ?? 0);
        expect(WEAPONS['hammer_heavy'].type).toBe('melee');
        expect(WEAPONS['hammer_heavy'].knockback).toBeGreaterThanOrEqual(250);

        // Magic verify mana cost, status effects, and projectile properties
        expect(WEAPONS['staff'].type).toBe('magic');
        expect(WEAPONS['staff'].mana).toBeGreaterThan(0);
        expect(WEAPONS['staff_ember'].statusEffect?.type).toBe('burning');
        expect(WEAPONS['wand_frost'].statusEffect?.type).toBe('slowing');
        expect(WEAPONS['staff_arc'].pierce).toBe(2);
        expect(WEAPONS['tome_crystal'].mana).toBeGreaterThan(0);
    });

    it('manages equipment slots, equips/unequips valid items, and enforces slot constraints', () => {
        const w = newWorld('equip-test', DEFAULT_WORLD);
        expect(w.equipment).toBeDefined();
        expect(w.equipment?.head).toBeNull();
        expect(w.equipment?.chest).toBeNull();
        expect(w.equipment?.legs).toBeNull();
        expect(w.equipment?.accessory1).toBeNull();
        expect(w.equipment?.accessory2).toBeNull();

        // Add gear to inventory
        add(w.inventory, 'helmet_iron', 1);
        add(w.inventory, 'chest_iron', 1);
        add(w.inventory, 'boots_iron', 1);
        add(w.inventory, 'charm_mining', 1);
        add(w.inventory, 'boots_speed', 1);

        // Slot constraint validation
        expect(() => equipItem(w, 'head', 'chest_iron')).toThrow('Only helmets');
        expect(() => equipItem(w, 'chest', 'boots_iron')).toThrow('Only torso armor');
        expect(() => equipItem(w, 'legs', 'helmet_iron')).toThrow('Only leg armor');
        expect(() => equipItem(w, 'accessory1', 'helmet_iron')).toThrow('Only accessories');

        // Valid equipping
        expect(equipItem(w, 'head', 'helmet_iron')).toContain('Equipped');
        expect(w.equipment?.head).toBe('helmet_iron');
        expect(count(w.inventory, 'helmet_iron')).toBe(0);

        expect(equipItem(w, 'chest', 'chest_iron')).toContain('Equipped');
        expect(w.equipment?.chest).toBe('chest_iron');

        expect(equipItem(w, 'legs', 'boots_iron')).toContain('Equipped');
        expect(w.equipment?.legs).toBe('boots_iron');

        expect(equipItem(w, 'accessory1', 'charm_mining')).toContain('Equipped');
        expect(w.equipment?.accessory1).toBe('charm_mining');

        expect(equipItem(w, 'accessory2', 'boots_speed')).toContain('Equipped');
        expect(w.equipment?.accessory2).toBe('boots_speed');

        // Unequipping returns items to inventory
        expect(unequipItem(w, 'head')).toContain('Unequipped');
        expect(w.equipment?.head).toBeNull();
        expect(count(w.inventory, 'helmet_iron')).toBe(1);

        // Unequipping empty slot throws
        expect(() => unequipItem(w, 'head')).toThrow('No item equipped');
    });

    it('handles permanent progression upgrades via Vitality and Mana Cores with a cap of 10', () => {
        const w = newWorld('cores-test', DEFAULT_WORLD);
        expect(w.upgrades?.vitalityCores).toBe(0);
        expect(w.upgrades?.manaCores).toBe(0);

        // Attempting to consume with none in inventory fails
        expect(() => useVitalityCore(w)).toThrow('No Vitality Core');
        expect(() => useManaCore(w)).toThrow('No Mana Core');

        // Consume 10 Vitality Cores
        add(w.inventory, 'vitality_core', 12);
        for (let i = 1; i <= 10; i++) {
            const res = useVitalityCore(w);
            expect(res).toContain(`(${i}/10)`);
            expect(w.upgrades?.vitalityCores).toBe(i);
        }
        // 11th consumption blocked
        expect(() => useVitalityCore(w)).toThrow('Maximum Vitality Cores reached');
        expect(count(w.inventory, 'vitality_core')).toBe(2);

        // Consume 10 Mana Cores
        add(w.inventory, 'mana_core', 11);
        for (let i = 1; i <= 10; i++) {
            const res = useManaCore(w);
            expect(res).toContain(`(${i}/10)`);
            expect(w.upgrades?.manaCores).toBe(i);
        }
        expect(() => useManaCore(w)).toThrow('Maximum Mana Cores reached');
    });

    it('accurately derives player stats combining base, cores, equipment, and active effects', () => {
        const w = newWorld('stats-test', DEFAULT_WORLD);

        // Baseline stats
        const baseStats = derivePlayerStats(w, []);
        expect(baseStats.maxHealth).toBe(100);
        expect(baseStats.maxMana).toBe(100);
        expect(baseStats.defense).toBe(0);
        expect(baseStats.speedMultiplier).toBe(1.0);
        expect(baseStats.mineSpeedMultiplier).toBe(1.0);
        expect(baseStats.knockbackResistance).toBe(0);

        // Add cores
        w.upgrades = { vitalityCores: 5, manaCores: 3 };
        const coreStats = derivePlayerStats(w, []);
        expect(coreStats.maxHealth).toBe(150); // 100 + 5 * 10
        expect(coreStats.maxMana).toBe(130); // 100 + 3 * 10

        // Equip Iron Armor set (helmet +4 def, chest +8 def, boots +4 def)
        add(w.inventory, 'helmet_iron', 1);
        add(w.inventory, 'chest_iron', 1);
        add(w.inventory, 'boots_iron', 1);
        add(w.inventory, 'charm_mining', 1);
        add(w.inventory, 'charm_knockback', 1);
        equipItem(w, 'head', 'helmet_iron');
        equipItem(w, 'chest', 'chest_iron');
        equipItem(w, 'legs', 'boots_iron');
        equipItem(w, 'accessory1', 'charm_mining');
        equipItem(w, 'accessory2', 'charm_knockback');

        const gearedStats = derivePlayerStats(w, []);
        expect(gearedStats.defense).toBe(16); // 4 + 8 + 4
        expect(gearedStats.mineSpeedMultiplier).toBe(1.25); // +25%
        expect(gearedStats.knockbackResistance).toBe(0.50); // +50%

        // Active status effects
        const buffedStats = derivePlayerStats(w, [
            { type: 'defense' },
            { type: 'speed' },
        ]);
        expect(buffedStats.defense).toBe(26); // 16 + 10
        expect(buffedStats.speedMultiplier).toBe(1.25); // +25%

        // Slowing effect
        const slowedStats = derivePlayerStats(w, [{ type: 'slowing' }]);
        expect(slowedStats.speedMultiplier).toBeCloseTo(0.55, 3);
    });

    it('simulates status effect lifecycle: creation, tick progression, damage, and expiration', () => {
        const burning = createStatusEffect('burning', 3000, 10);
        expect(burning.type).toBe('burning');
        expect(burning.maxDurationMs).toBe(3000);
        expect(burning.remainingMs).toBe(3000);
        expect(burning.magnitude).toBe(10);

        // Tick 1000ms
        let tick = tickStatusEffects([burning], 1000);
        expect(tick.remainingEffects.length).toBe(1);
        expect(tick.remainingEffects[0].remainingMs).toBe(2000);
        expect(tick.hpDelta).toBeLessThan(0); // Burning deals damage (negative hpDelta)

        // Tick past remaining duration
        tick = tickStatusEffects(tick.remainingEffects, 2500);
        expect(tick.remainingEffects.length).toBe(0); // Expired
    });

    it('registers placeable totems (materials 26-29) and validates save bundle persistence', () => {
        expect(BUILDING.totem_vitality).toBe(26);
        expect(BUILDING.totem_warding).toBe(27);
        expect(BUILDING.totem_prospector).toBe(28);
        expect(BUILDING.totem_arcane).toBe(29);

        expect(MATERIALS[26].name).toBe('Vitality Totem');
        expect(MATERIALS[26].solid).toBe(false);
        expect(MATERIALS[27].name).toBe('Warding Totem');
        expect(MATERIALS[28].name).toBe('Prospector Totem');
        expect(MATERIALS[29].name).toBe('Arcane Totem');

        // Totem definitions
        expect(TOTEM_REGISTRY.totem_vitality.radiusTiles).toBeGreaterThanOrEqual(8);
        expect(TOTEM_REGISTRY.totem_vitality.effect.type).toBe('vitality');
        expect(TOTEM_REGISTRY.totem_warding.effect.type).toBe('warding');
        expect(TOTEM_REGISTRY.totem_prospector.effect.type).toBe('prospector');
        expect(TOTEM_REGISTRY.totem_arcane.effect.type).toBe('arcane');

        // Save bundle validation with totem materials
        const b = initialBundle();
        const w = b.worlds[b.active];
        editTile(w, 20, 20, 26);
        editTile(w, 21, 20, 27);
        editTile(w, 22, 20, 28);
        editTile(w, 23, 20, 29);

        const serialized = JSON.parse(JSON.stringify(b));
        expect(() => validateBundle(serialized)).not.toThrow();
        expect(readTile(serialized.worlds[b.active], 20, 20)).toBe(26);
        expect(readTile(serialized.worlds[b.active], 21, 20)).toBe(27);
        expect(readTile(serialized.worlds[b.active], 22, 20)).toBe(28);
        expect(readTile(serialized.worlds[b.active], 23, 20)).toBe(29);
    });
});

import { approveWorldProposal } from './ai';
describe('future AI boundary', () => {
    it('accepts only supported settings and discards extra fields', () => { expect(approveWorldProposal({ ...DEFAULT_WORLD, code: 'not executable' })).toEqual(DEFAULT_WORLD); expect(() => approveWorldProposal({ ...DEFAULT_WORLD, caves: 100 })).toThrow(); expect(() => approveWorldProposal(null)).toThrow(); });
});
