/**
 * Status Effects Registry and Computation Engine for GameForge.
 * Defines harmful conditions (burning, slowing, poison) and
 * beneficial buffs (regeneration, defense, speed, well-fed).
 */

export type StatusEffectType =
  | 'burning'
  | 'slowing'
  | 'poison'
  | 'regeneration'
  | 'defense'
  | 'speed'
  | 'well_fed'
  | 'starvation';

export interface ActiveStatusEffect {
  type: StatusEffectType;
  name: string;
  remainingMs: number;
  maxDurationMs: number;
  magnitude: number; // e.g. tick damage per second or fractional speed multiplier
  color: string;
  icon: string;
}

export interface StatusEffectDefinition {
  type: StatusEffectType;
  name: string;
  description: string;
  isHarmful: boolean;
  defaultDurationMs: number;
  color: string;
  icon: string;
}

export const STATUS_EFFECTS: Record<StatusEffectType, StatusEffectDefinition> = {
  burning: {
    type: 'burning',
    name: 'Burning',
    description: 'Blazing heat inflicts continuous thermal damage.',
    isHarmful: true,
    defaultDurationMs: 3000,
    color: '#e67e22',
    icon: '🔥',
  },
  slowing: {
    type: 'slowing',
    name: 'Chilled Slow',
    description: 'Frigid frost impedes locomotion and jump velocity.',
    isHarmful: true,
    defaultDurationMs: 2500,
    color: '#3498db',
    icon: '❄️',
  },
  poison: {
    type: 'poison',
    name: 'Toxic Poison',
    description: 'Corrosive venom steadily degrades vital signs.',
    isHarmful: true,
    defaultDurationMs: 4000,
    color: '#2ecc71',
    icon: '☣️',
  },
  regeneration: {
    type: 'regeneration',
    name: 'Cellular Regen',
    description: 'Rapid tissue restoration steadily repairs health.',
    isHarmful: false,
    defaultDurationMs: 5000,
    color: '#27ae60',
    icon: '💚',
  },
  defense: {
    type: 'defense',
    name: 'Hardened Aegis',
    description: 'Reinforced kinetic shielding dampens incoming damage.',
    isHarmful: false,
    defaultDurationMs: 10000,
    color: '#95a5a6',
    icon: '🛡️',
  },
  speed: {
    type: 'speed',
    name: 'Adrenaline Rush',
    description: 'Enhanced neuromuscular response boosts sprint velocity.',
    isHarmful: false,
    defaultDurationMs: 8000,
    color: '#f1c40f',
    icon: '⚡',
  },
  well_fed: {
    type: 'well_fed',
    name: 'Well Nourished',
    description: 'Full satiety provides passive health recovery and stamina resilience.',
    isHarmful: false,
    defaultDurationMs: 60000,
    color: '#e67e22',
    icon: '🍖',
  },
  starvation: {
    type: 'starvation',
    name: 'Starving',
    description: 'Empty hunger disables passive food regeneration; no starvation damage.',
    isHarmful: true,
    defaultDurationMs: Infinity,
    color: '#c0392b',
    icon: '💀',
  },
};

/** Instantiate an active status effect */
export function createStatusEffect(
  type: StatusEffectType,
  durationMs?: number,
  magnitude: number = 1
): ActiveStatusEffect {
  const def = STATUS_EFFECTS[type];
  const maxDurationMs = durationMs ?? def.defaultDurationMs;
  return {
    type,
    name: def.name,
    remainingMs: maxDurationMs,
    maxDurationMs,
    magnitude,
    color: def.color,
    icon: def.icon,
  };
}

/** Ticks an array of active effects by delta time, returning damage dealt and alive effects */
export function tickStatusEffects(
  effects: ActiveStatusEffect[],
  deltaMs: number
): { remainingEffects: ActiveStatusEffect[]; hpDelta: number; speedMultiplier: number } {
  let hpDelta = 0;
  let speedMultiplier = 1.0;
  const remainingEffects: ActiveStatusEffect[] = [];

  for (const eff of effects) {
    const seconds = Math.max(0, Math.min(deltaMs, eff.remainingMs)) / 1000;
    eff.remainingMs -= Math.max(0, deltaMs);
    if (eff.type === 'burning') {
      hpDelta -= eff.magnitude * seconds;
    } else if (eff.type === 'poison') {
      hpDelta -= eff.magnitude * 1.2 * seconds;
    } else if (eff.type === 'regeneration' || eff.type === 'well_fed') {
      hpDelta += eff.magnitude * seconds;
    } else if (eff.type === 'starvation') {
      hpDelta += 0;
    } else if (eff.type === 'slowing') {
      speedMultiplier *= Math.max(0.2, 1 - eff.magnitude);
    } else if (eff.type === 'speed') {
      speedMultiplier *= 1 + eff.magnitude;
    }

    if (eff.remainingMs > 0) {
      remainingEffects.push(eff);
    }
  }

  return { remainingEffects, hpDelta, speedMultiplier };
}
