/**
 * Deployable Support Totems Registry for GameForge.
 * Defines player-placeable beacon totems that project area-of-effect
 * defensive, restorative, mining, and arcane buffs.
 */

export interface TotemDefinition {
  id: string;
  name: string;
  description: string;
  radiusTiles: number; // Effective area radius in 24px tiles
  icon: string;
  color: string;
  effect: {
    type: 'vitality' | 'warding' | 'prospector' | 'arcane';
    magnitude: number;
    description: string;
  };
}

export const TOTEM_REGISTRY: Record<string, TotemDefinition> = {
  totem_vitality: {
    id: 'totem_vitality',
    name: 'Vitality Totem',
    description: 'Emits a restorative aura that heals the player (+3 HP/sec) while within 8 tiles.',
    radiusTiles: 8,
    icon: '💚',
    color: '#2ecc71',
    effect: {
      type: 'vitality',
      magnitude: 3,
      description: 'Restores 3 HP every second inside the aura',
    },
  },

  totem_warding: {
    id: 'totem_warding',
    name: 'Warding Totem',
    description: 'Projects a kinetic deflection field reducing all incoming damage by 30% within 8 tiles.',
    radiusTiles: 8,
    icon: '🛡️',
    color: '#3498db',
    effect: {
      type: 'warding',
      magnitude: 0.3,
      description: 'Dampens incoming damage by 30%',
    },
  },

  totem_prospector: {
    id: 'totem_prospector',
    name: 'Prospector Totem',
    description: 'Resonates with mineral veins, illuminating nearby ores and boosting mining speed by 35% within 10 tiles.',
    radiusTiles: 10,
    icon: '⛏️',
    color: '#f39c12',
    effect: {
      type: 'prospector',
      magnitude: 0.35,
      description: 'Increases mining speed by 35% and highlights subterranean veins',
    },
  },

  totem_arcane: {
    id: 'totem_arcane',
    name: 'Arcane Totem',
    description: 'Channels prismatic aether, accelerating mana recovery (+10 mana/sec) within 8 tiles.',
    radiusTiles: 8,
    icon: '✦',
    color: '#9b59b6',
    effect: {
      type: 'arcane',
      magnitude: 10,
      description: 'Restores 10 mana every second',
    },
  },
};

/** Lookup totem definition */
export function getTotemDefinition(id: string): TotemDefinition | undefined {
  return TOTEM_REGISTRY[id];
}
