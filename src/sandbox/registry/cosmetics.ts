/**
 * Cosmetics and Wardrobe Registry for GameForge.
 * Preserves all legacy full-body skins while introducing modular wardrobe pieces
 * (head, torso, arms, legs in 4 themed sets) and custom weapon skins.
 */

export interface LegacySkin {
  id: string;
  name: string;
  description: string;
  price: number;
  color: string;
  detail: string;
}

export const SKINS = [
  {
    id: 'frontier',
    name: 'Frontier explorer',
    description: 'Expedition armour and a field visor.',
    price: 0,
    color: '#62dfc3',
    detail: 'visor',
  },
  {
    id: 'ranger',
    name: 'Salvage ranger',
    description: 'A broad-brim helmet and salvage pack.',
    price: 60,
    color: '#edb47b',
    detail: 'hat',
  },
  {
    id: 'wanderer',
    name: 'Crystal wanderer',
    description: 'A crystal crown and a flowing mantle.',
    price: 90,
    color: '#ad9dff',
    detail: 'crown',
  },
  {
    id: 'neon',
    name: 'Neon technician',
    description: 'Antennae, circuit strips, and a power pack.',
    price: 110,
    color: '#7fdfff',
    detail: 'antenna',
  },
  {
    id: 'knight',
    name: 'Void knight',
    description: 'Horned armour and a dark shoulder cape.',
    price: 140,
    color: '#e08db4',
    detail: 'horns',
  },
  {
    id: 'automaton',
    name: 'Ancient automaton',
    description: 'A square brass head and mechanical limbs.',
    price: 180,
    color: '#e5d58b',
    detail: 'robot',
  },
] as const;

export type SkinId = typeof SKINS[number]['id'];

// ==========================================
// --- Modular Wardrobe System ---
// ==========================================
export type WardrobeSlot = 'head' | 'torso' | 'arms' | 'legs';

export interface ModularCosmeticItem {
  id: string;
  slot: WardrobeSlot;
  setName: string;
  name: string;
  description: string;
  color: string;
  price: number;
}

export const MODULAR_WARDROBE: Record<string, ModularCosmeticItem> = {
  // Set 1: Frontier Pioneer
  frontier_helm: {
    id: 'frontier_helm',
    slot: 'head',
    setName: 'Frontier Pioneer',
    name: 'Pioneer Visor Helm',
    description: 'Sealed visor protecting against dust and radiation.',
    color: '#62dfc3',
    price: 0,
  },
  frontier_chest: {
    id: 'frontier_chest',
    slot: 'torso',
    setName: 'Frontier Pioneer',
    name: 'Pioneer Field Vest',
    description: 'Light ballistic weave with modular utility pockets.',
    color: '#4db6ac',
    price: 0,
  },
  frontier_gloves: {
    id: 'frontier_gloves',
    slot: 'arms',
    setName: 'Frontier Pioneer',
    name: 'Pioneer Work Bracers',
    description: 'Reinforced gloves for excavation and recoil control.',
    color: '#00897b',
    price: 0,
  },
  frontier_boots: {
    id: 'frontier_boots',
    slot: 'legs',
    setName: 'Frontier Pioneer',
    name: 'Pioneer Tread Boots',
    description: 'Rubberized grip soles engineered for rough rock.',
    color: '#00695c',
    price: 0,
  },

  // Set 2: Salvage Ranger
  ranger_hat: {
    id: 'ranger_hat',
    slot: 'head',
    setName: 'Salvage Ranger',
    name: 'Ranger Broad-Brim Cowl',
    description: 'Weathered brim shielding the eyes from wasteland glare.',
    color: '#edb47b',
    price: 30,
  },
  ranger_duster: {
    id: 'ranger_duster',
    slot: 'torso',
    setName: 'Salvage Ranger',
    name: 'Ranger Scrap Duster',
    description: 'Heavy coated canvas with scrap plating across the chest.',
    color: '#d39e6a',
    price: 50,
  },
  ranger_wraps: {
    id: 'ranger_wraps',
    slot: 'arms',
    setName: 'Salvage Ranger',
    name: 'Ranger Arm Wraps',
    description: 'Leather wraps bound with scavenged copper wire.',
    color: '#b87333',
    price: 25,
  },
  ranger_spurs: {
    id: 'ranger_spurs',
    slot: 'legs',
    setName: 'Salvage Ranger',
    name: 'Ranger Field Chaps',
    description: 'Heavy cowhide chaps built to resist thorny briars.',
    color: '#8b5a2b',
    price: 30,
  },

  // Set 3: Void Knight
  void_horns: {
    id: 'void_horns',
    slot: 'head',
    setName: 'Void Knight',
    name: 'Void Horned Crest',
    description: 'Obsidian horns resonant with null-space frequencies.',
    color: '#e08db4',
    price: 60,
  },
  void_cuirass: {
    id: 'void_cuirass',
    slot: 'torso',
    setName: 'Void Knight',
    name: 'Void Carapace Plate',
    description: 'Polished abyssal metal absorbing ambient illumination.',
    color: '#b06587',
    price: 80,
  },
  void_gauntlets: {
    id: 'void_gauntlets',
    slot: 'arms',
    setName: 'Void Knight',
    name: 'Void Spiked Gauntlets',
    description: 'Fluted plate gauntlets with flared strike ridges.',
    color: '#8c4866',
    price: 45,
  },
  void_greaves: {
    id: 'void_greaves',
    slot: 'legs',
    setName: 'Void Knight',
    name: 'Void Greaves',
    description: 'Jointed steel greaves trailing faint void wisps.',
    color: '#5e2b42',
    price: 50,
  },

  // Set 4: Neon Cyber-Tech
  neon_antennae: {
    id: 'neon_antennae',
    slot: 'head',
    setName: 'Neon Technician',
    name: 'Cybernetic Sensor Fin',
    description: 'High-bandwidth telemetry array pulsing cyan light.',
    color: '#7fdfff',
    price: 50,
  },
  neon_harness: {
    id: 'neon_harness',
    slot: 'torso',
    setName: 'Neon Technician',
    name: 'Optic Fiber Vest',
    description: 'Illuminated circuit strips routing auxiliary battery power.',
    color: '#4fc3f7',
    price: 70,
  },
  neon_bracers: {
    id: 'neon_bracers',
    slot: 'arms',
    setName: 'Neon Technician',
    name: 'Pulse Conduit Sleeves',
    description: 'Capacitive forearm wraps glowing with circuit pathways.',
    color: '#0288d1',
    price: 40,
  },
  neon_runners: {
    id: 'neon_runners',
    slot: 'legs',
    setName: 'Neon Technician',
    name: 'Mag-Lev Running Shins',
    description: 'Hydraulic spring chassis providing soft athletic landings.',
    color: '#01579b',
    price: 45,
  },
};

// ==========================================
// --- Gun Weapon Skins ---
// ==========================================
export interface WeaponSkin {
  id: string;
  name: string;
  description: string;
  price: number;
  palette: {
    primary: string;
    secondary: string;
    glow?: string;
  };
}

export const WEAPON_SKINS: Record<string, WeaponSkin> = {
  skin_brushed_steel: {
    id: 'skin_brushed_steel',
    name: 'Factory Brushed Steel',
    description: 'Clean machined titanium with standard manufacturer stampings.',
    price: 0,
    palette: {
      primary: '#95a5a6',
      secondary: '#7f8c8d',
    },
  },
  skin_desert_camo: {
    id: 'skin_desert_camo',
    name: 'Scorched Desert Camo',
    description: 'Matte arid camouflage for survival in dusty wastes.',
    price: 40,
    palette: {
      primary: '#d2b48c',
      secondary: '#8b4513',
    },
  },
  skin_neon_synth: {
    id: 'skin_neon_synth',
    name: 'Neon Synthwave',
    description: 'Vibrant hot magenta with glowing cyan accents.',
    price: 75,
    palette: {
      primary: '#ff007f',
      secondary: '#00f0ff',
      glow: '#00ffff',
    },
  },
  skin_obsidian_gilded: {
    id: 'skin_obsidian_gilded',
    name: 'Obsidian Gilded',
    description: 'Reflective jet-black glass chassis inlaid with pure gold leaf.',
    price: 120,
    palette: {
      primary: '#1c1c1c',
      secondary: '#ffd700',
      glow: '#ffaa00',
    },
  },
  skin_void_core: {
    id: 'skin_void_core',
    name: 'Void Core Pulsar',
    description: 'Swirling abyssal purple with pulsating dark-matter fissures.',
    price: 160,
    palette: {
      primary: '#2e0854',
      secondary: '#8e44ad',
      glow: '#c39bd3',
    },
  },
};

// Preserve starter ownership and existing full-body prices; new modular parts use economy targets.
for (const part of Object.values(MODULAR_WARDROBE)) if (part.price > 0) part.price = Math.max(75, part.price * 2);
