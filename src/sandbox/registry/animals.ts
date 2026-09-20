/**
 * Passive and Neutral Animals Registry for GameForge.
 * Defines 4 distinct wildlife species with dynamic behavior routines
 * (grazing, scurrying, pecking, defensive retaliation) and resource drops.
 */

import type { ItemId } from './items';

export type AnimalBehavior = 'flee' | 'graze' | 'peck' | 'defend' | 'wander';

export interface AnimalDefinition {
  id: string;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  passive: boolean; // True if never attacks back
  retaliateDamage?: number; // Damage dealt if neutral animal is provoked
  hitbox: { width: number; height: number };
  collider: { width: number; height: number };
  behaviors: AnimalBehavior[];
  fleeSpeedMultiplier: number;
  detectPlayerRadius: number;
  preferredBiomes: string[];
  drops: {
    item: ItemId;
    chance: number;
    min: number;
    max: number;
  }[];
}

export const ANIMAL_REGISTRY: Record<string, AnimalDefinition> = {
  burrowing_mammal: {
    id: 'burrowing_mammal',
    name: 'Mound Mole',
    texture: 'mole',
    hp: 18,
    speed: 35,
    passive: true,
    hitbox: { width: 16, height: 12 },
    collider: { width: 14, height: 10 },
    behaviors: ['wander', 'flee'],
    fleeSpeedMultiplier: 2.2,
    detectPlayerRadius: 120,
    preferredBiomes: ['Verdant frontier', 'Rust wastes'],
    drops: [
      { item: 'meat_raw', chance: 0.9, min: 1, max: 2 },
      { item: 'dirt', chance: 0.5, min: 2, max: 4 },
    ],
  },

  forest_grazer: {
    id: 'forest_grazer',
    name: 'Grove Strider',
    texture: 'grazer',
    hp: 35,
    speed: 45,
    passive: true,
    hitbox: { width: 24, height: 20 },
    collider: { width: 22, height: 18 },
    behaviors: ['graze', 'wander', 'flee'],
    fleeSpeedMultiplier: 2.5,
    detectPlayerRadius: 160,
    preferredBiomes: ['Verdant frontier'],
    drops: [
      { item: 'meat_raw', chance: 1.0, min: 2, max: 3 },
      { item: 'herb', chance: 0.7, min: 1, max: 3 },
    ],
  },

  ground_bird: {
    id: 'ground_bird',
    name: 'Dusk Quail',
    texture: 'quail',
    hp: 12,
    speed: 50,
    passive: true,
    hitbox: { width: 14, height: 14 },
    collider: { width: 12, height: 12 },
    behaviors: ['peck', 'wander', 'flee'],
    fleeSpeedMultiplier: 2.0,
    detectPlayerRadius: 140,
    preferredBiomes: ['Verdant frontier', 'Frost highlands'],
    drops: [
      { item: 'meat_raw', chance: 0.85, min: 1, max: 1 },
      { item: 'seeds_crop', chance: 0.75, min: 1, max: 2 },
    ],
  },

  cave_beetle: {
    id: 'cave_beetle',
    name: 'Chitin Scuttler',
    texture: 'beetle',
    hp: 45,
    speed: 30,
    passive: false, // Neutral: attacks back if harmed
    retaliateDamage: 12,
    hitbox: { width: 18, height: 14 },
    collider: { width: 16, height: 12 },
    behaviors: ['wander', 'defend'],
    fleeSpeedMultiplier: 1.4,
    detectPlayerRadius: 80,
    preferredBiomes: ['Rust wastes', 'Fungal hollows', 'Crystal depths'],
    drops: [
      { item: 'scrap', chance: 0.65, min: 1, max: 2 },
      { item: 'stone', chance: 0.8, min: 2, max: 4 },
      { item: 'coal', chance: 0.4, min: 1, max: 2 },
    ],
  },
};

/** Lookup animal definition by key */
export function getAnimalDefinition(id: string): AnimalDefinition | undefined {
  return ANIMAL_REGISTRY[id];
}
