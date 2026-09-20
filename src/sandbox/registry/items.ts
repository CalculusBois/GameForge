/**
 * Central Items & Ores Registry for GameForge.
 * Preserves all legacy item IDs and definitions while adding expanded ore,
 * tool, weapon, building, food, and equipment items.
 */

export type ItemCategory =
  | 'tool'
  | 'weapon'
  | 'resource'
  | 'building'
  | 'consumable'
  | 'equipment'
  | 'totem';

export interface ItemDefinition {
  id: string;
  name: string;
  icon: string;
  stack: number;
  description: string;
  category: ItemCategory;
  value: number; // Base vendor value in gold coins
  buyPrice?: number; // Shop buy price if purchasable
  tier?: number; // Progression tier (0=starter, 1=copper, 2=iron, 3=cobalt, 4=aether)
  tag?: string;
}

export type ItemId =
  // --- Legacy Items (Preserved with identical IDs) ---
  | 'pickaxe'
  | 'blaster'
  | 'sword'
  | 'staff'
  | 'drill'
  | 'carbine'
  | 'dirt'
  | 'stone'
  | 'wood'
  | 'iron'
  | 'bar'
  | 'scrap'
  | 'crystal'
  | 'herb'
  | 'tonic'
  | 'torch'
  | 'brick'
  // --- Expanded Ores & Refined Bars ---
  | 'copper_ore'
  | 'copper_bar'
  | 'coal'
  | 'silver_ore'
  | 'silver_bar'
  | 'gold_ore'
  | 'gold_bar'
  | 'cobalt_ore'
  | 'cobalt_bar'
  | 'obsidian'
  | 'aether_crystal'
  // --- Upgraded Tools & Utilities ---
  | 'pickaxe_copper'
  | 'pickaxe_iron'
  | 'pickaxe_cobalt'
  | 'pickaxe_aether'
  | 'axe_wood'
  | 'hammer_construction'
  | 'rope'
  | 'ladder'
  | 'grapple_hook'
  // --- Expanded Weapons ---
  | 'blaster_burst'
  | 'blaster_scatter'
  | 'rifle_rail'
  | 'sword_long'
  | 'spear'
  | 'hammer_heavy'
  | 'staff_ember'
  | 'wand_frost'
  | 'staff_arc'
  | 'tome_crystal'
  // --- Equipment & Accessories ---
  | 'helmet_iron'
  | 'chest_iron'
  | 'boots_iron'
  | 'charm_mining'
  | 'boots_speed'
  | 'charm_mana'
  | 'charm_knockback'
  | 'vitality_core'
  | 'mana_core'
  // --- Support Totems ---
  | 'totem_vitality'
  | 'totem_warding'
  | 'totem_prospector'
  | 'totem_arcane'
  // --- Food & Agriculture ---
  | 'berries'
  | 'mushroom_edible'
  | 'meat_raw'
  | 'vegetable_raw'
  | 'seeds_crop'
  | 'meat_cooked'
  | 'mushrooms_grilled'
  | 'stew_vegetable'
  | 'dish_berry'
  | 'meal_mixed'
  | 'meal_expedition'
  | 'potion_mana'
  // --- Advanced Building & Stations ---
  | 'station_workbench'
  | 'station_furnace'
  | 'station_advanced' | 'table_wood' | 'chair_wood' | 'banner' | 'lamp' | 'block_metal' | 'block_crystal'
  | 'station_cooking'
  | 'chest_wood'
  | 'platform_wood'
  | 'wall_wood'
  | 'wall_stone'
  | 'door_wood';

export const ITEMS: Record<ItemId, ItemDefinition> = {
  // === Legacy Preserved Items ===
  pickaxe: {
    id: 'pickaxe',
    name: 'Field pickaxe',
    icon: '⛏️',
    stack: 1,
    description: 'Starter pickaxe. Mines exposed soil and stone within 5 tiles.',
    category: 'tool',
    value: 0,
    tier: 0,
  },
  blaster: {
    id: 'blaster',
    name: 'Pulse blaster',
    icon: '🔫',
    stack: 1,
    description: 'Reliable energy shots. No ammunition needed.',
    category: 'weapon',
    value: 0,
    tier: 0,
  },
  sword: {
    id: 'sword',
    name: 'Arc sabre',
    icon: '⚔️',
    stack: 1,
    description: 'Close-range sweep. Each target is struck once.',
    category: 'weapon',
    value: 30,
    tier: 1,
  },
  staff: {
    id: 'staff',
    name: 'Prism staff',
    icon: '🪄',
    stack: 1,
    description: 'Powerful magic bolts. Costs 15 mana.',
    category: 'weapon',
    value: 40,
    tier: 2,
  },
  drill: {
    id: 'drill',
    name: 'Resonant pickaxe',
    icon: '⛏️',
    stack: 1,
    description: 'Iron-grade pickaxe. Mines twice as fast as the field pickaxe.',
    category: 'tool',
    value: 40,
    tier: 2,
  },
  carbine: {
    id: 'carbine',
    name: 'Coil carbine',
    icon: '🔫',
    stack: 1,
    description: 'Faster, stronger pulse shots with high accuracy.',
    category: 'weapon',
    value: 40,
    tier: 2,
  },
  dirt: {
    id: 'dirt',
    name: 'Soil',
    icon: '🟫',
    stack: 99,
    description: 'Basic terrain block. Place to build steps and bridges.',
    category: 'building',
    value: 1,
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    icon: '🪨',
    stack: 99,
    description: 'Standard rock. Craft building blocks or furnace equipment.',
    category: 'resource',
    value: 2,
  },
  wood: {
    id: 'wood',
    name: 'Timber',
    icon: '🪵',
    stack: 99,
    description: 'Harvested from trees. Fundamental building material and workbench fuel.',
    category: 'resource',
    value: 1,
  },
  iron: {
    id: 'iron',
    name: 'Iron ore',
    icon: '🟤',
    stack: 99,
    description: 'Common underground ore. Smelt into iron bars at the furnace.',
    category: 'resource',
    value: 4,
    tier: 2,
  },
  bar: {
    id: 'bar',
    name: 'Iron bar',
    icon: '▮',
    stack: 99,
    description: 'Refined iron metal for dependable weapons, armor, and tools.',
    category: 'resource',
    value: 8,
    tier: 2,
  },
  scrap: {
    id: 'scrap',
    name: 'Scrap metal',
    icon: '⚙️',
    stack: 99,
    description: 'Recovered from wasteland wreckage, machines, and robotic drones.',
    category: 'resource',
    value: 5,
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal shard',
    icon: '💜',
    stack: 99,
    description: 'Found in luminous subterranean deposits. Powers magic equipment.',
    category: 'resource',
    value: 6,
  },
  herb: {
    id: 'herb',
    name: 'Healing herb',
    icon: '🌿',
    stack: 99,
    description: 'Gather wild flora with E. Brew into field tonics and potions.',
    category: 'resource',
    value: 3,
  },
  tonic: {
    id: 'tonic',
    name: 'Field tonic',
    icon: '🧪',
    stack: 20,
    description: 'Use from the hotbar to restore 40 health.',
    category: 'consumable',
    value: 9,
  },
  torch: {
    id: 'torch',
    name: 'Lumen torch',
    icon: '🔦',
    stack: 99,
    description: 'Place on walls or terrain to illuminate dark caves and ruins.',
    category: 'building',
    value: 2,
  },
  brick: {
    id: 'brick',
    name: 'Outpost block',
    icon: '🧱',
    stack: 99,
    description: 'Crafted reinforced masonry block for durable structures.',
    category: 'building',
    value: 3,
  },

  // === Expanded Ores & Materials (Section 4) ===
  copper_ore: {
    id: 'copper_ore',
    name: 'Copper ore',
    icon: '🟠',
    stack: 99,
    description: 'Common near the surface. Smelt into copper bars for early tools and wiring.',
    category: 'resource',
    value: 3,
    tier: 1,
  },
  copper_bar: {
    id: 'copper_bar',
    name: 'Copper bar',
    icon: '🟧',
    stack: 99,
    description: 'Refined copper ingot. Used in entry-level metal equipment.',
    category: 'resource',
    value: 6,
    tier: 1,
  },
  coal: {
    id: 'coal',
    name: 'Coal',
    icon: '⬛',
    stack: 99,
    description: 'High-efficiency thermal fuel for smelting ores and cooking meals.',
    category: 'resource',
    value: 2,
  },
  silver_ore: {
    id: 'silver_ore',
    name: 'Silver ore',
    icon: '⚪',
    stack: 99,
    description: 'Uncommon underground deposit. Required for magical foci and precision gear.',
    category: 'resource',
    value: 7,
    tier: 2,
  },
  silver_bar: {
    id: 'silver_bar',
    name: 'Silver bar',
    icon: '⬜',
    stack: 99,
    description: 'Refined silver ingot with high arcane and electric conductivity.',
    category: 'resource',
    value: 14,
    tier: 2,
  },
  gold_ore: {
    id: 'gold_ore',
    name: 'Gold ore',
    icon: '🟡',
    stack: 99,
    description: 'Deep subterranean deposit. Raw crafting material (separate from currency coins).',
    category: 'resource',
    value: 12,
    tier: 3,
  },
  gold_bar: {
    id: 'gold_bar',
    name: 'Gold bar',
    icon: '🟨',
    stack: 99,
    description: 'Smelted gold bullion. Used in advanced electronics and ornate totems.',
    category: 'resource',
    value: 24,
    tier: 3,
  },
  cobalt_ore: {
    id: 'cobalt_ore',
    name: 'Cobalt ore',
    icon: '🔵',
    stack: 99,
    description: 'Rare deep blue ore deposit. Used for high-tier cybernetic technology.',
    category: 'resource',
    value: 18,
    tier: 3,
  },
  cobalt_bar: {
    id: 'cobalt_bar',
    name: 'Cobalt bar',
    icon: '🟦',
    stack: 99,
    description: 'High-strength structural alloy for advanced mining and weaponry.',
    category: 'resource',
    value: 36,
    tier: 3,
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    icon: '🟪',
    stack: 99,
    description: 'Dense volcanic glass from ashen depths. Resists extreme temperatures.',
    category: 'resource',
    value: 20,
    tier: 3,
  },
  aether_crystal: {
    id: 'aether_crystal',
    name: 'Aether crystal',
    icon: '💎',
    stack: 99,
    description: 'Radiant crystal from crystal depths. Required for pinnacle endgame gear.',
    category: 'resource',
    value: 30,
    tier: 4,
  },

  // === Tool Upgrades (Section 5) ===
  pickaxe_copper: {
    id: 'pickaxe_copper',
    name: 'Copper pickaxe',
    icon: '⛏️',
    stack: 1,
    description: 'Mines 30% faster than field pickaxe. Extracts iron and coal veins.',
    category: 'tool',
    value: 20,
    tier: 1,
  },
  pickaxe_iron: {
    id: 'pickaxe_iron',
    name: 'Iron pickaxe',
    icon: '⛏️',
    stack: 1,
    description: 'Dependable mining pick. Capable of mining silver and gold deposits.',
    category: 'tool',
    value: 45,
    tier: 2,
  },
  pickaxe_cobalt: {
    id: 'pickaxe_cobalt',
    name: 'Cobalt pickaxe',
    icon: '⛏️',
    stack: 1,
    description: 'Heavy reinforced pick. Fractures volcanic obsidian and deep strata.',
    category: 'tool',
    value: 90,
    tier: 3,
  },
  pickaxe_aether: {
    id: 'pickaxe_aether',
    name: 'Aether mining tool',
    icon: '⛏️',
    stack: 1,
    description: 'Pinnacle mining tool. Disintegrates all materials at maximum velocity.',
    category: 'tool',
    value: 180,
    tier: 4,
  },
  axe_wood: {
    id: 'axe_wood',
    name: 'Survival axe',
    icon: '🪓',
    stack: 1,
    description: 'Efficient timber harvesting tool. Doubles yield from surface trees.',
    category: 'tool',
    value: 15,
    tier: 1,
  },
  hammer_construction: {
    id: 'hammer_construction',
    name: 'Building hammer',
    icon: '🔨',
    stack: 1,
    description: 'Specialized tool for safe removal and recovery of placed structures.',
    category: 'tool',
    value: 15,
    tier: 1,
  },
  rope: {
    id: 'rope',
    name: 'Exploration rope',
    icon: '⌇',
    stack: 99,
    description: 'Placeable climbable line for ascending cliffs and vertical shafts.',
    category: 'building',
    value: 2,
  },
  ladder: {
    id: 'ladder',
    name: 'Reinforced ladder',
    icon: '🪜',
    stack: 99,
    description: 'Sturdy wooden ladder segment for permanent vertical shafts.',
    category: 'building',
    value: 3,
  },
  grapple_hook: {
    id: 'grapple_hook',
    name: 'Grapple hook',
    icon: '⚓',
    stack: 1,
    description: 'Midgame mobility tool. Launch toward solid terrain to pull yourself forward.',
    category: 'tool',
    value: 120,
    tier: 3,
  },

  // === Expanded Weapons (Section 8) ===
  blaster_burst: {
    id: 'blaster_burst',
    name: 'Burst rifle',
    icon: '⌁',
    stack: 1,
    description: 'Fires three-round pulse bursts with high mid-range stopping power.',
    category: 'weapon',
    value: 65,
    tier: 2,
  },
  blaster_scatter: {
    id: 'blaster_scatter',
    name: 'Scattergun',
    icon: '⌁',
    stack: 1,
    description: 'Short-range kinetic spread gun. Devastating against swarms.',
    category: 'weapon',
    value: 80,
    tier: 2,
  },
  rifle_rail: {
    id: 'rifle_rail',
    name: 'Rail rifle',
    icon: '⌁',
    stack: 1,
    description: 'High-voltage magnetic accelerator. Pierces through multiple lined foes.',
    category: 'weapon',
    value: 140,
    tier: 3,
  },
  sword_long: {
    id: 'sword_long',
    name: 'Heavy longsword',
    icon: '⚔',
    stack: 1,
    description: 'Extended reach broadsword. Hits in a wide protective arc.',
    category: 'weapon',
    value: 50,
    tier: 2,
  },
  spear: {
    id: 'spear',
    name: 'Frontier spear',
    icon: '⚚',
    stack: 1,
    description: 'Narrow forward thrust with extended reach. Keeps beasts at bay.',
    category: 'weapon',
    value: 40,
    tier: 1,
  },
  hammer_heavy: {
    id: 'hammer_heavy',
    name: 'Impact maul',
    icon: '🔨',
    stack: 1,
    description: 'Massive slow strike that inflicts devastating kinetic knockback.',
    category: 'weapon',
    value: 90,
    tier: 3,
  },
  staff_ember: {
    id: 'staff_ember',
    name: 'Ember staff',
    icon: '✦',
    stack: 1,
    description: 'Hurls pyrotechnic fireballs that ignite targets for burning damage.',
    category: 'weapon',
    value: 70,
    tier: 2,
  },
  wand_frost: {
    id: 'wand_frost',
    name: 'Frost wand',
    icon: '✦',
    stack: 1,
    description: 'Projects chilling ice shards that slow enemy advance.',
    category: 'weapon',
    value: 65,
    tier: 2,
  },
  staff_arc: {
    id: 'staff_arc',
    name: 'Arc conduit',
    icon: '✦',
    stack: 1,
    description: 'Discharges lightning that leaps between up to 3 nearby hostile targets.',
    category: 'weapon',
    value: 120,
    tier: 3,
  },
  tome_crystal: {
    id: 'tome_crystal',
    name: 'Crystal tome',
    icon: '📖',
    stack: 1,
    description: 'Casts an unstable aether sphere that detonates in a localized shockwave.',
    category: 'weapon',
    value: 160,
    tier: 4,
  },

  // === Equipment & Progression (Sections 10 & 11) ===
  helmet_iron: {
    id: 'helmet_iron',
    name: 'Iron helmet',
    icon: '⛑',
    stack: 1,
    description: 'Forged combat helmet. Provides +4 defense.',
    category: 'equipment',
    value: 35,
    tier: 2,
  },
  chest_iron: {
    id: 'chest_iron',
    name: 'Iron breastplate',
    icon: '🦺',
    stack: 1,
    description: 'Sturdy iron torso armor. Provides +8 defense.',
    category: 'equipment',
    value: 60,
    tier: 2,
  },
  boots_iron: {
    id: 'boots_iron',
    name: 'Iron greaves',
    icon: '🥾',
    stack: 1,
    description: 'Iron leg protection. Provides +4 defense.',
    category: 'equipment',
    value: 35,
    tier: 2,
  },
  charm_mining: {
    id: 'charm_mining',
    name: 'Prospector talisman',
    icon: '🧿',
    stack: 1,
    description: 'Accessory: Increases block excavation speed by 25%.',
    category: 'equipment',
    value: 75,
    tier: 2,
  },
  boots_speed: {
    id: 'boots_speed',
    name: 'Sprinter servos',
    icon: '👟',
    stack: 1,
    description: 'Accessory: Enhances sprint velocity by 20%.',
    category: 'equipment',
    value: 85,
    tier: 2,
  },
  charm_mana: {
    id: 'charm_mana',
    name: 'Aether core charm',
    icon: '💎',
    stack: 1,
    description: 'Accessory: Increases maximum mana by +30.',
    category: 'equipment',
    value: 90,
    tier: 2,
  },
  charm_knockback: {
    id: 'charm_knockback',
    name: 'Anchor gyro',
    icon: '⚙',
    stack: 1,
    description: 'Accessory: Grants 50% resistance against enemy knockback.',
    category: 'equipment',
    value: 95,
    tier: 3,
  },
  vitality_core: {
    id: 'vitality_core',
    name: 'Vitality Core',
    icon: '❤️',
    stack: 10,
    description: 'Rare relic: Permanently raises maximum health by +10 (max 10 uses).',
    category: 'consumable',
    value: 150,
  },
  mana_core: {
    id: 'mana_core',
    name: 'Mana Core',
    icon: '🔷',
    stack: 10,
    description: 'Rare relic: Permanently raises maximum mana by +10 (max 10 uses).',
    category: 'consumable',
    value: 150,
  },

  // === Totems (Section 12) ===
  totem_vitality: {
    id: 'totem_vitality',
    name: 'Vitality Totem',
    icon: '🗿',
    stack: 5,
    description: 'Placeable totem: Emits soothing aura granting slow health regeneration.',
    category: 'totem',
    value: 60,
  },
  totem_warding: {
    id: 'totem_warding',
    name: 'Warding Totem',
    icon: '🗿',
    stack: 5,
    description: 'Placeable totem: Projects kinetic dampening field granting +6 defense.',
    category: 'totem',
    value: 70,
  },
  totem_prospector: {
    id: 'totem_prospector',
    name: 'Prospector Totem',
    icon: '🗿',
    stack: 5,
    description: 'Placeable totem: High-frequency resonance field boosts mining speed by 30%.',
    category: 'totem',
    value: 65,
  },
  totem_arcane: {
    id: 'totem_arcane',
    name: 'Arcane Totem',
    icon: '🗿',
    stack: 5,
    description: 'Placeable totem: Harmonic focus doubles nearby mana recovery rate.',
    category: 'totem',
    value: 80,
  },

  // === Food & Cooking (Section 15) ===
  berries: {
    id: 'berries',
    name: 'Wild berries',
    icon: '🫐',
    stack: 99,
    description: 'Foraged sweet berries. Restores 10 hunger.',
    category: 'consumable',
    value: 1,
  },
  mushroom_edible: {
    id: 'mushroom_edible',
    name: 'Cave mushroom',
    icon: '🍄',
    stack: 99,
    description: 'Underground fungus. Safe to eat raw; much tastier when grilled. Restores 12 hunger.',
    category: 'consumable',
    value: 2,
  },
  meat_raw: {
    id: 'meat_raw',
    name: 'Raw meat',
    icon: '🥩',
    stack: 99,
    description: 'Obtained from fauna. Cook at a campfire or station before consuming.',
    category: 'resource',
    value: 3,
  },
  vegetable_raw: {
    id: 'vegetable_raw',
    name: 'Harvested tuber',
    icon: '🥕',
    stack: 99,
    description: 'Hearty root vegetable found in fertile frontier soil. Restores 15 hunger.',
    category: 'consumable',
    value: 2,
  },
  seeds_crop: {
    id: 'seeds_crop',
    name: 'Crop seeds',
    icon: '🌱',
    stack: 99,
    description: 'Plant on tilled soil to grow fresh frontier produce.',
    category: 'resource',
    value: 1,
  },
  meat_cooked: {
    id: 'meat_cooked',
    name: 'Roasted cutlet',
    icon: '🍖',
    stack: 30,
    description: 'Savory flame-grilled meat. Restores 35 hunger and grants mild health regen.',
    category: 'consumable',
    value: 8,
  },
  mushrooms_grilled: {
    id: 'mushrooms_grilled',
    name: 'Grilled mushrooms',
    icon: '🍳',
    stack: 30,
    description: 'Slow-charred seasoned fungi. Restores 30 hunger and +10 max mana buff.',
    category: 'consumable',
    value: 6,
  },
  stew_vegetable: {
    id: 'stew_vegetable',
    name: 'Vegetable stew',
    icon: '🍲',
    stack: 20,
    description: 'Warm hearty soup. Restores 45 hunger and boosts defense by +3.',
    category: 'consumable',
    value: 12,
  },
  dish_berry: {
    id: 'dish_berry',
    name: 'Berry compote',
    icon: '🥣',
    stack: 30,
    description: 'Concentrated berry reduction. Restores 25 hunger and boosts movement speed.',
    category: 'consumable',
    value: 8,
  },
  meal_mixed: {
    id: 'meal_mixed',
    name: 'Hunter feast',
    icon: '🍱',
    stack: 20,
    description: 'Balanced meat and greens plate. Restores 60 hunger with lingering health regen.',
    category: 'consumable',
    value: 18,
  },
  meal_expedition: {
    id: 'meal_expedition',
    name: 'Frontier banquet',
    icon: '🥘',
    stack: 10,
    description: 'Pinnacle expedition ration. Restores 90 hunger, granting defense, speed, and regen.',
    category: 'consumable',
    value: 35,
  },
  potion_mana: {
    id: 'potion_mana',
    name: 'Aether draught',
    icon: '🧪',
    stack: 20,
    description: 'Concentrated magic elixir. Instantly restores 60 mana.',
    category: 'consumable',
    value: 15,
  },

  // === Advanced Building & Stations (Section 13) ===
  station_advanced: { id: 'station_advanced', name: 'Advanced workbench', category: 'building', stack: 99, value: 0, icon: '⚒️', description: 'Connected advanced crafting station.' },
  table_wood: { id: 'table_wood', name: 'Frontier table', category: 'building', stack: 99, value: 0, icon: '▤', description: 'A timber furnishing.' },
  chair_wood: { id: 'chair_wood', name: 'Frontier chair', category: 'building', stack: 99, value: 0, icon: '▟', description: 'A timber seat.' },
  banner: { id: 'banner', name: 'Expedition banner', category: 'building', stack: 99, value: 0, icon: '⚑', description: 'An original expedition pennant.' },
  lamp: { id: 'lamp', name: 'Prism lamp', category: 'building', stack: 99, value: 0, icon: '☼', description: 'A bright building light.' },
  block_metal: { id: 'block_metal', name: 'Alloy block', category: 'building', stack: 99, value: 0, icon: '▦', description: 'A structural metal block.' },
  block_crystal: { id: 'block_crystal', name: 'Crystal inlay', category: 'building', stack: 99, value: 0, icon: '◇', description: 'A luminous accented building block.' },
  station_workbench: {
    id: 'station_workbench',
    name: 'Field workbench',
    icon: '🛠️',
    stack: 10,
    description: 'Placeable crafting station for tools, furniture, and basic gear.',
    category: 'building',
    value: 10,
  },
  station_furnace: {
    id: 'station_furnace',
    name: 'Stone furnace',
    icon: '🔥',
    stack: 10,
    description: 'Placeable smelting furnace for refining ores into metal bars.',
    category: 'building',
    value: 15,
  },
  station_cooking: {
    id: 'station_cooking',
    name: 'Cooking station',
    icon: '🍳',
    stack: 10,
    description: 'Placeable cooking workbench. Prepare raw ingredients into nutritious meals at the spit.',
    category: 'building',
    value: 10,
  },
  chest_wood: {
    id: 'chest_wood',
    name: 'Storage crate',
    icon: '📦',
    stack: 10,
    description: 'Placeable container with 16 storage slots. Preserves stored items safely.',
    category: 'building',
    value: 15,
  },
  platform_wood: {
    id: 'platform_wood',
    name: 'Timber platform',
    icon: '▤',
    stack: 99,
    description: 'One-way platform: Walk across or press Down to descend through.',
    category: 'building',
    value: 1,
  },
  wall_wood: {
    id: 'wall_wood',
    name: 'Timber background wall',
    icon: '░',
    stack: 99,
    description: 'Decorative interior background paneling.',
    category: 'building',
    value: 1,
  },
  wall_stone: {
    id: 'wall_stone',
    name: 'Stone background wall',
    icon: '▒',
    stack: 99,
    description: 'Solid stone background wall for fortress interiors.',
    category: 'building',
    value: 1,
  },
  door_wood: {
    id: 'door_wood',
    name: 'Timber door',
    icon: '🚪',
    stack: 10,
    description: 'Place in an opening to enclose your shelter. Press E to open or close.',
    category: 'building',
    value: 4,
  },
};

export function getItem(id: string): ItemDefinition | undefined {
  return (ITEMS as Record<string, ItemDefinition | undefined>)[id];
}

export function isOre(id: string): boolean {
  return id.endsWith('_ore') || id === 'iron' || id === 'coal' || id === 'obsidian' || id === 'aether_crystal';
}

export function isTool(id: string): boolean {
  return (ITEMS as Record<string, ItemDefinition | undefined>)[id]?.category === 'tool';
}

export function isWeapon(id: string): boolean {
  return (ITEMS as Record<string, ItemDefinition | undefined>)[id]?.category === 'weapon';
}

export function isFood(id: string): boolean {
  return ['berries', 'mushroom_edible', 'meat_cooked', 'mushrooms_grilled', 'stew_vegetable', 'dish_berry', 'meal_mixed', 'meal_expedition'].includes(id);
}

export function isTotem(id: string): boolean {
  return (ITEMS as Record<string, ItemDefinition | undefined>)[id]?.category === 'totem';
}
