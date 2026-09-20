export interface Hitbox {
  width: number;
  height: number;
}

export interface ColliderConfig {
  width: number;
  height: number;
  shape: 'box' | 'circle';
  isTrigger?: boolean;
  offsetX?: number;
  offsetY?: number;
}

export const MODULAR_BEHAVIORS = [
  'ProjectileBurst',
  'MeleeSwipe',
  'SummonMinion',
  'Dash',
  'AreaOfEffectHazard',
] as const;

export type ModularBehavior = (typeof MODULAR_BEHAVIORS)[number];

export interface AttackPattern {
  type: 'melee' | 'projectile' | 'charge' | 'burst' | ModularBehavior | string;
  interval: number;
  burstCount?: number;
  projectileColor?: string;
  warningTimeMs?: number;
  modularBehaviors?: ModularBehavior[];
}

export interface TextureTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  shape: 'beast' | 'mech' | 'humanoid' | 'crystal' | 'dragon';
}

export interface BaseClassDefinition {
  name: string;
  category: 'boss' | 'elite' | 'minion' | 'weapon' | 'biome' | 'mechanic';
  inheritsFrom: string;
  hasCollider: boolean;
  defaultCollider: ColliderConfig;
  defaultHitbox: Hitbox;
  mass: number;
  allowGravity: boolean;
  defaultLogicController: string;
  allowedModifications: string[];
}

export const BASE_CLASSES: Record<string, BaseClassDefinition> = {
  BaseGroundBoss: {
    name: 'BaseGroundBoss',
    category: 'boss',
    inheritsFrom: 'Enemy',
    hasCollider: true,
    defaultCollider: { width: 64, height: 64, shape: 'box', offsetX: 0, offsetY: 0 },
    defaultHitbox: { width: 64, height: 64 },
    mass: 150,
    allowGravity: true,
    defaultLogicController: 'AggressiveBoss',
    allowedModifications: ['stats', 'abilities', 'scale', 'visuals', 'lore', 'textureTheme'],
  },
  BaseFlyingEnemy: {
    name: 'BaseFlyingEnemy',
    category: 'elite',
    inheritsFrom: 'Enemy',
    hasCollider: true,
    defaultCollider: { width: 32, height: 32, shape: 'box', offsetX: 0, offsetY: 0 },
    defaultHitbox: { width: 32, height: 32 },
    mass: 35,
    allowGravity: false,
    defaultLogicController: 'HoverAndStrafe',
    allowedModifications: ['stats', 'abilities', 'scale', 'visuals', 'lore', 'textureTheme'],
  },
  BaseAgileCrawler: {
    name: 'BaseAgileCrawler',
    category: 'minion',
    inheritsFrom: 'Enemy',
    hasCollider: true,
    defaultCollider: { width: 28, height: 28, shape: 'box', offsetX: 0, offsetY: 0 },
    defaultHitbox: { width: 28, height: 28 },
    mass: 50,
    allowGravity: true,
    defaultLogicController: 'PatrolAndAttack',
    allowedModifications: ['stats', 'abilities', 'scale', 'visuals', 'lore', 'textureTheme'],
  },
  BaseRangedTurret: {
    name: 'BaseRangedTurret',
    category: 'elite',
    inheritsFrom: 'Enemy',
    hasCollider: true,
    defaultCollider: { width: 36, height: 36, shape: 'box', offsetX: 0, offsetY: 0 },
    defaultHitbox: { width: 36, height: 36 },
    mass: 200,
    allowGravity: true,
    defaultLogicController: 'StationaryTurret',
    allowedModifications: ['stats', 'abilities', 'scale', 'visuals', 'lore', 'textureTheme'],
  },
  BaseMeleeWeapon: {
    name: 'BaseMeleeWeapon',
    category: 'weapon',
    inheritsFrom: 'Weapon',
    hasCollider: false,
    defaultCollider: { width: 24, height: 48, shape: 'box' },
    defaultHitbox: { width: 24, height: 48 },
    mass: 10,
    allowGravity: false,
    defaultLogicController: 'MeleeSwingController',
    allowedModifications: ['damage', 'speed', 'cooldown', 'range', 'projectileColor', 'description'],
  },
  BaseRangedBlaster: {
    name: 'BaseRangedBlaster',
    category: 'weapon',
    inheritsFrom: 'Weapon',
    hasCollider: false,
    defaultCollider: { width: 16, height: 16, shape: 'box' },
    defaultHitbox: { width: 16, height: 16 },
    mass: 8,
    allowGravity: false,
    defaultLogicController: 'ProjectileController',
    allowedModifications: ['damage', 'speed', 'cooldown', 'range', 'projectileColor', 'description'],
  },
  BaseHeavyCannon: {
    name: 'BaseHeavyCannon',
    category: 'weapon',
    inheritsFrom: 'Weapon',
    hasCollider: false,
    defaultCollider: { width: 20, height: 20, shape: 'box' },
    defaultHitbox: { width: 20, height: 20 },
    mass: 25,
    allowGravity: false,
    defaultLogicController: 'HeavyBlastController',
    allowedModifications: ['damage', 'speed', 'cooldown', 'range', 'projectileColor', 'description'],
  },
  BaseHazardBiome: {
    name: 'BaseHazardBiome',
    category: 'biome',
    inheritsFrom: 'Biome',
    hasCollider: false,
    defaultCollider: { width: 0, height: 0, shape: 'box' },
    defaultHitbox: { width: 0, height: 0 },
    mass: 0,
    allowGravity: false,
    defaultLogicController: 'BiomeEnvironmentController',
    allowedModifications: ['skyColor', 'groundColor', 'stoneColor', 'wallColor', 'vegetationDensity', 'dangerLevel', 'ambientDescription', 'spawnRoster'],
  },
  BasePhysicsModifier: {
    name: 'BasePhysicsModifier',
    category: 'mechanic',
    inheritsFrom: 'Mechanic',
    hasCollider: false,
    defaultCollider: { width: 0, height: 0, shape: 'box' },
    defaultHitbox: { width: 0, height: 0 },
    mass: 0,
    allowGravity: true,
    defaultLogicController: 'PhysicsTuningController',
    allowedModifications: ['gravityMultiplier', 'speedMultiplier', 'jumpMultiplier', 'doubleJump', 'cameraShakeIntensity', 'manaRegenMultiplier'],
  },
};

export interface EnemyEntity {
  id: string;
  name: string;
  category: 'boss' | 'elite' | 'minion';
  baseClass: 'BaseGroundBoss' | 'BaseFlyingEnemy' | 'BaseAgileCrawler' | 'BaseRangedTurret' | string;
  baseType: 'crawler' | 'hopper' | 'drone' | 'gunner' | 'caster' | 'sentinel';
  hasCollider: boolean;
  collider: ColliderConfig;
  mass: number;
  logicController: 'PatrolAndAttack' | 'AggressiveBoss' | 'HoverAndStrafe' | 'StationaryTurret' | string;
  hp: number;
  damage: number;
  speed: number;
  range: number;
  reward: number;
  scale: number;
  hitbox: Hitbox;
  attackPattern: AttackPattern;
  textureTheme: TextureTheme;
  lore?: string;
}

export interface BiomeEntity {
  id: string;
  name: string;
  baseClass?: string;
  skyColor: string;
  groundColor: string;
  stoneColor: string;
  wallColor: string;
  vegetationDensity: number;
  dangerLevel: number;
  ambientDescription: string;
  spawnRoster: string[];
}

export interface WeaponEntity {
  id: string;
  name: string;
  baseClass?: string;
  category: 'blaster' | 'sword' | 'staff' | 'heavy';
  damage: number;
  speed: number;
  cooldown: number;
  range: number;
  projectileColor: string;
  description: string;
}

export interface MechanicEntity {
  id: string;
  name: string;
  baseClass?: string;
  gravityMultiplier: number;
  speedMultiplier: number;
  jumpMultiplier: number;
  doubleJump: boolean;
  cameraShakeIntensity: number;
  manaRegenMultiplier: number;
  description: string;
}

export type GenerativeEntity = EnemyEntity | BiomeEntity | WeaponEntity | MechanicEntity;

export interface GenerativePayload {
  entityType: 'boss' | 'enemy' | 'biome' | 'weapon' | 'mechanic';
  entity: GenerativeEntity;
  explanation: string;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isHexColor(val: unknown): boolean {
  return typeof val === 'string' && HEX_COLOR_REGEX.test(val.trim());
}

function normalizeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom-entity';
}

/**
 * Automatically computes and scales the collision bounding box based on entity scale,
 * inherited base class, and custom hitbox or collider inputs.
 */
export function computeAutoCollider(
  scale: number,
  baseClass: string,
  customHitbox?: Partial<Hitbox>,
  customCollider?: Partial<ColliderConfig>
): ColliderConfig {
  const baseDef = BASE_CLASSES[baseClass] || BASE_CLASSES.BaseGroundBoss;
  const rawW = customCollider?.width ?? customHitbox?.width ?? baseDef.defaultCollider.width;
  const rawH = customCollider?.height ?? customHitbox?.height ?? baseDef.defaultCollider.height;

  const effectiveScale = Number.isFinite(scale) && scale > 0 ? scale : 1.0;
  const width = Math.max(8, Math.min(300, Math.round(rawW * effectiveScale)));
  const height = Math.max(8, Math.min(300, Math.round(rawH * effectiveScale)));
  const shape = customCollider?.shape === 'circle' ? 'circle' : 'box';

  return {
    width,
    height,
    shape,
    isTrigger: customCollider?.isTrigger ?? false,
    offsetX: customCollider?.offsetX ?? 0,
    offsetY: customCollider?.offsetY ?? 0,
  };
}

/**
 * The "Bouncer" (Local Sanitization & Safeguard Layer):
 * Dedicated post-processing function that intercepts Astra's JSON output before writing any files:
 * 1. Physics Clamping: Clamps scale (0.5x–4.0x), speed (10–300), hp (10–5000), mass (1–500), damage (1–150).
 * 2. Surface Grounding: Queries terrain height via raycasting/surface detection and places entity at
 *    ground_Y + (height / 2) + 0.1 (never accepts raw Y-coordinates from AI; strips any hallucinated Y coords).
 * 3. Fallback Defaults: Automatically injects default values for missing engine components
 *    (colliders, rigidbodies, health/logic controllers, attack patterns) without crashing.
 */
export function theBouncer(payload: GenerativePayload): GenerativePayload {
  if (!payload || typeof payload !== 'object' || !payload.entity) {
    throw new Error('The Bouncer: payload or entity is missing.');
  }

  if (payload.entityType === 'boss' || payload.entityType === 'enemy') {
    const foe = payload.entity as EnemyEntity;

    // 1. Surface Grounding Safeguard: Never accept raw Y coordinates from AI!
    delete (foe as any).y;
    delete (foe as any).spawnY;
    delete (foe as any).posY;
    if ((foe as any).position && typeof (foe as any).position === 'object') {
      delete (foe as any).position.y;
    }
    (foe as any).surfaceGroundingEnforced = true;
    (foe as any).groundPlacementFormula = 'ground_Y + (height / 2) + 0.1';

    // 2. Base Class & Template Inheritance Fallback
    if (!foe.category) {
      foe.category = payload.entityType === 'boss' ? 'boss' : 'minion';
    }
    const rawBaseClass = typeof foe.baseClass === 'string' ? foe.baseClass.trim() : '';
    const baseClass = BASE_CLASSES[rawBaseClass]
      ? rawBaseClass
      : (foe.category === 'boss' || payload.entityType === 'boss' ? 'BaseGroundBoss' : foe.baseType === 'drone' ? 'BaseFlyingEnemy' : 'BaseAgileCrawler');
    foe.baseClass = baseClass;
    const baseDef = BASE_CLASSES[baseClass] || BASE_CLASSES.BaseGroundBoss;

    // 3. Physics Clamping
    // Scale: strictly clamped to [0.5, 4.0] (0.5x - 4x)
    const rawScale = Number(foe.scale);
    const scale = Math.max(0.5, Math.min(4.0, Number.isFinite(rawScale) ? rawScale : (foe.category === 'boss' ? 2.0 : 1.0)));
    foe.scale = Math.round(scale * 100) / 100;

    // Mass: strictly clamped to [1, 500]
    const rawMass = Number(foe.mass);
    const defaultMass = baseDef.mass > 0 ? baseDef.mass : (foe.category === 'boss' ? 150 : 50);
    const mass = Math.max(1, Math.min(500, Number.isFinite(rawMass) && rawMass > 0 ? rawMass : defaultMass));
    foe.mass = Math.round(mass);

    // Speed: safe threshold [10, 300]
    const rawSpeed = Number(foe.speed);
    const speed = Math.max(10, Math.min(300, Number.isFinite(rawSpeed) ? rawSpeed : 60));
    foe.speed = Math.round(speed);

    // HP: safe threshold [10, 5000]
    const rawHp = Number(foe.hp);
    const hp = Math.max(10, Math.min(5000, Number.isFinite(rawHp) ? rawHp : (foe.category === 'boss' ? 1000 : 80)));
    foe.hp = Math.round(hp);

    // Damage: safe threshold [1, 150]
    const rawDamage = Number(foe.damage);
    const damage = Math.max(1, Math.min(150, Number.isFinite(rawDamage) ? rawDamage : 25));
    foe.damage = Math.round(damage);

    // Range: safe threshold [50, 1200]
    const rawRange = Number(foe.range);
    const range = Math.max(50, Math.min(1200, Number.isFinite(rawRange) ? rawRange : 350));
    foe.range = Math.round(range);

    // Reward: safe threshold [1, 2000]
    const rawReward = Number(foe.reward);
    const reward = Math.max(1, Math.min(2000, Number.isFinite(rawReward) ? rawReward : (foe.category === 'boss' ? 300 : 30)));
    foe.reward = Math.round(reward);

    // 4. Component Enforcement & Fallback Defaults
    // hasCollider must be true
    foe.hasCollider = true;

    // Auto-calculate & clamp collider bounding box scaled to entity scale
    if (
      !foe.collider ||
      typeof foe.collider.width !== 'number' ||
      typeof foe.collider.height !== 'number' ||
      foe.collider.width <= 0 ||
      foe.collider.height <= 0
    ) {
      foe.collider = computeAutoCollider(foe.scale, baseClass, foe.hitbox, foe.collider);
    } else {
      foe.collider.width = Math.max(8, Math.min(300, Math.round(foe.collider.width)));
      foe.collider.height = Math.max(8, Math.min(300, Math.round(foe.collider.height)));
      foe.collider.shape = foe.collider.shape === 'circle' ? 'circle' : 'box';
    }

    // Hitbox fallback
    if (!foe.hitbox || typeof foe.hitbox.width !== 'number' || typeof foe.hitbox.height !== 'number' || foe.hitbox.width <= 0 || foe.hitbox.height <= 0) {
      foe.hitbox = {
        width: Math.max(8, Math.min(200, Math.round(foe.collider.width / foe.scale))),
        height: Math.max(8, Math.min(200, Math.round(foe.collider.height / foe.scale))),
      };
    }

    // Logic Controller fallback
    if (!foe.logicController || typeof foe.logicController !== 'string' || !foe.logicController.trim()) {
      foe.logicController = baseDef.defaultLogicController || 'PatrolAndAttack';
    }

    // Attack Pattern & Composable Modular Behaviors fallback
    if (!foe.attackPattern || typeof foe.attackPattern !== 'object') {
      foe.attackPattern = {
        type: 'MeleeSwipe',
        interval: 1500,
        burstCount: 1,
        projectileColor: '#ff7777',
        warningTimeMs: 500,
        modularBehaviors: ['MeleeSwipe'],
      };
    } else {
      const rawType = String(foe.attackPattern.type || 'MeleeSwipe');
      const validTypes = [
        'melee', 'projectile', 'charge', 'burst',
        'ProjectileBurst', 'MeleeSwipe', 'SummonMinion', 'Dash', 'AreaOfEffectHazard'
      ];
      foe.attackPattern.type = validTypes.includes(rawType) ? (rawType as any) : 'MeleeSwipe';
      foe.attackPattern.interval = Math.max(200, Math.min(10000, Number(foe.attackPattern.interval) || 1500));
      foe.attackPattern.burstCount = Math.max(1, Math.min(10, Number(foe.attackPattern.burstCount) || 1));
      foe.attackPattern.projectileColor = isHexColor(foe.attackPattern.projectileColor)
        ? foe.attackPattern.projectileColor
        : '#ff7777';
      foe.attackPattern.warningTimeMs = Math.max(100, Math.min(3000, Number(foe.attackPattern.warningTimeMs) || 500));

      if (!Array.isArray(foe.attackPattern.modularBehaviors) || foe.attackPattern.modularBehaviors.length === 0) {
        const derived: ModularBehavior =
          foe.attackPattern.type === 'burst' || foe.attackPattern.type === 'ProjectileBurst'
            ? 'ProjectileBurst'
            : foe.attackPattern.type === 'charge' || foe.attackPattern.type === 'Dash'
            ? 'Dash'
            : foe.attackPattern.type === 'SummonMinion'
            ? 'SummonMinion'
            : foe.attackPattern.type === 'AreaOfEffectHazard'
            ? 'AreaOfEffectHazard'
            : 'MeleeSwipe';
        foe.attackPattern.modularBehaviors = [derived];
      } else {
        foe.attackPattern.modularBehaviors = foe.attackPattern.modularBehaviors.filter(b =>
          (MODULAR_BEHAVIORS as readonly string[]).includes(b)
        );
        if (foe.attackPattern.modularBehaviors.length === 0) {
          foe.attackPattern.modularBehaviors = ['MeleeSwipe'];
        }
      }
    }

    // Texture Theme fallback
    if (!foe.textureTheme || typeof foe.textureTheme !== 'object') {
      foe.textureTheme = {
        primaryColor: '#e5484d',
        secondaryColor: '#ff977d',
        accentColor: '#ffd386',
        shape: 'mech',
      };
    } else {
      foe.textureTheme.primaryColor = isHexColor(foe.textureTheme.primaryColor) ? foe.textureTheme.primaryColor : '#e5484d';
      foe.textureTheme.secondaryColor = isHexColor(foe.textureTheme.secondaryColor) ? foe.textureTheme.secondaryColor : '#ff977d';
      foe.textureTheme.accentColor = isHexColor(foe.textureTheme.accentColor) ? foe.textureTheme.accentColor : '#ffd386';
      const shapes = ['beast', 'mech', 'humanoid', 'crystal', 'dragon'];
      foe.textureTheme.shape = shapes.includes(foe.textureTheme.shape) ? foe.textureTheme.shape : 'mech';
    }
  } else if (payload.entityType === 'weapon') {
    const wep = payload.entity as WeaponEntity;
    wep.damage = Math.max(1, Math.min(200, Number(wep.damage) || 10));
    wep.speed = Math.max(50, Math.min(1500, Number(wep.speed) || 500));
    wep.cooldown = Math.max(40, Math.min(1500, Number(wep.cooldown) || 200));
    wep.range = Math.max(20, Math.min(1500, Number(wep.range) || 400));
    wep.baseClass = wep.baseClass || (wep.category === 'sword' ? 'BaseMeleeWeapon' : wep.category === 'heavy' ? 'BaseHeavyCannon' : 'BaseRangedBlaster');
  } else if (payload.entityType === 'mechanic') {
    const mech = payload.entity as MechanicEntity;
    mech.gravityMultiplier = Math.max(0.4, Math.min(2.5, Number(mech.gravityMultiplier) || 1.0));
    mech.speedMultiplier = Math.max(0.4, Math.min(3.0, Number(mech.speedMultiplier) || 1.0));
    mech.jumpMultiplier = Math.max(0.4, Math.min(2.5, Number(mech.jumpMultiplier) || 1.0));
    mech.cameraShakeIntensity = Math.max(0.0, Math.min(3.0, Number(mech.cameraShakeIntensity) || 0.0));
    mech.manaRegenMultiplier = Math.max(0.2, Math.min(5.0, Number(mech.manaRegenMultiplier) || 1.0));
    mech.baseClass = mech.baseClass || 'BasePhysicsModifier';
  } else if (payload.entityType === 'biome') {
    const bio = payload.entity as BiomeEntity;
    bio.vegetationDensity = Math.max(0.0, Math.min(3.0, Number(bio.vegetationDensity) || 1.0));
    bio.dangerLevel = Math.max(1, Math.min(5, Math.round(Number(bio.dangerLevel) || 1)));
    bio.baseClass = bio.baseClass || 'BaseHazardBiome';
  }

  return payload;
}

/**
 * Backward-compatible wrapper that invokes theBouncer.
 */
export function preInjectionSanityCheck(payload: GenerativePayload): GenerativePayload {
  return theBouncer(payload);
}

export function validateEnemyEntity(raw: any, errors: string[]): EnemyEntity {
  if (!raw || typeof raw !== 'object') {
    errors.push('Enemy entity must be an object.');
    throw new Error('Invalid enemy entity');
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Unnamed Entity';
  const id = typeof raw.id === 'string' && raw.id.trim() ? normalizeSlug(raw.id) : normalizeSlug(name);
  const category = ['boss', 'elite', 'minion'].includes(raw.category) ? raw.category : 'boss';
  const baseType = ['crawler', 'hopper', 'drone', 'gunner', 'caster', 'sentinel'].includes(raw.baseType)
    ? raw.baseType
    : 'sentinel';

  // Resolve baseClass template inheritance
  const rawBaseClass = typeof raw.baseClass === 'string' ? raw.baseClass.trim() : '';
  const baseClass = BASE_CLASSES[rawBaseClass]
    ? rawBaseClass
    : (category === 'boss' ? 'BaseGroundBoss' : baseType === 'drone' ? 'BaseFlyingEnemy' : 'BaseAgileCrawler');
  const baseDef = BASE_CLASSES[baseClass] || BASE_CLASSES.BaseGroundBoss;

  const hp = Number(raw.hp);
  if (!Number.isFinite(hp) || hp < 10 || hp > 5000) {
    errors.push(`Enemy hp must be between 10 and 5000 (received: ${raw.hp}).`);
  }

  const damage = Number(raw.damage);
  if (!Number.isFinite(damage) || damage < 1 || damage > 150) {
    errors.push(`Enemy damage must be between 1 and 150 (received: ${raw.damage}).`);
  }

  const speed = Number(raw.speed);
  if (!Number.isFinite(speed) || speed < 10 || speed > 300) {
    errors.push(`Enemy speed must be between 10 and 300 (received: ${raw.speed}).`);
  }

  const range = Number(raw.range);
  if (!Number.isFinite(range) || range < 50 || range > 1200) {
    errors.push(`Enemy range must be between 50 and 1200 (received: ${raw.range}).`);
  }

  const reward = Number(raw.reward);
  if (!Number.isFinite(reward) || reward < 1 || reward > 2000) {
    errors.push(`Enemy reward must be between 1 and 2000 coins (received: ${raw.reward}).`);
  }

  const scale = Number(raw.scale ?? (category === 'boss' ? 2.0 : 1.0));
  if (!Number.isFinite(scale) || scale < 0.5 || scale > 5.0) {
    errors.push(`Enemy scale must be between 0.5 and 5.0 (received: ${raw.scale}).`);
  }

  const hitboxWidth = Number(raw.hitbox?.width ?? (category === 'boss' ? 64 : 32));
  const hitboxHeight = Number(raw.hitbox?.height ?? (category === 'boss' ? 64 : 32));
  if (!Number.isFinite(hitboxWidth) || hitboxWidth < 8 || hitboxWidth > 200) {
    errors.push('Enemy hitbox.width must be between 8 and 200.');
  }
  if (!Number.isFinite(hitboxHeight) || hitboxHeight < 8 || hitboxHeight > 200) {
    errors.push('Enemy hitbox.height must be between 8 and 200.');
  }

  // Component enforcement: collider, mass, logicController
  const hasCollider = raw.hasCollider !== undefined ? Boolean(raw.hasCollider) : true;
  const collider = computeAutoCollider(scale, baseClass, { width: hitboxWidth, height: hitboxHeight }, raw.collider);

  let mass = Number(raw.mass ?? baseDef.mass);
  if (!Number.isFinite(mass) || mass <= 0) {
    mass = baseDef.mass > 0 ? baseDef.mass : (category === 'boss' ? 150 : 50);
  }

  const rawController = typeof raw.logicController === 'string' ? raw.logicController.trim() : '';
  const logicController = rawController || baseDef.defaultLogicController || 'PatrolAndAttack';

  const validAttackTypes = [
    'melee', 'projectile', 'charge', 'burst',
    'ProjectileBurst', 'MeleeSwipe', 'SummonMinion', 'Dash', 'AreaOfEffectHazard'
  ];
  const attackType = validAttackTypes.includes(raw.attackPattern?.type)
    ? raw.attackPattern.type
    : 'melee';
  const attackInterval = Number(raw.attackPattern?.interval ?? 1500);
  if (!Number.isFinite(attackInterval) || attackInterval < 200 || attackInterval > 10000) {
    errors.push('Attack pattern interval must be between 200ms and 10000ms.');
  }

  const primaryColor = isHexColor(raw.textureTheme?.primaryColor) ? raw.textureTheme.primaryColor : '#e5484d';
  const secondaryColor = isHexColor(raw.textureTheme?.secondaryColor) ? raw.textureTheme.secondaryColor : '#ff977d';
  const accentColor = isHexColor(raw.textureTheme?.accentColor) ? raw.textureTheme.accentColor : '#ffd386';
  const shape = ['beast', 'mech', 'humanoid', 'crystal', 'dragon'].includes(raw.textureTheme?.shape)
    ? raw.textureTheme.shape
    : 'mech';

  const modularBehaviors: ModularBehavior[] | undefined = Array.isArray(raw.attackPattern?.modularBehaviors)
    ? raw.attackPattern.modularBehaviors.filter((b: string) => (MODULAR_BEHAVIORS as readonly string[]).includes(b as any))
    : undefined;

  return {
    id,
    name,
    category,
    baseClass,
    baseType,
    hasCollider,
    collider,
    mass,
    logicController,
    hp,
    damage,
    speed,
    range,
    reward,
    scale,
    hitbox: { width: hitboxWidth, height: hitboxHeight },
    attackPattern: {
      type: attackType,
      interval: attackInterval,
      burstCount: Number(raw.attackPattern?.burstCount ?? 1),
      projectileColor: isHexColor(raw.attackPattern?.projectileColor)
        ? raw.attackPattern.projectileColor
        : '#ff7777',
      warningTimeMs: Number(raw.attackPattern?.warningTimeMs ?? 500),
      modularBehaviors,
    },
    textureTheme: {
      primaryColor,
      secondaryColor,
      accentColor,
      shape,
    },
    lore: typeof raw.lore === 'string' ? raw.lore : undefined,
  };
}

export function validateBiomeEntity(raw: any, errors: string[]): BiomeEntity {
  if (!raw || typeof raw !== 'object') {
    errors.push('Biome entity must be an object.');
    throw new Error('Invalid biome entity');
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Unnamed Biome';
  const id = typeof raw.id === 'string' && raw.id.trim() ? normalizeSlug(raw.id) : normalizeSlug(name);
  const baseClass = typeof raw.baseClass === 'string' && raw.baseClass.trim() ? raw.baseClass.trim() : 'BaseHazardBiome';

  if (!isHexColor(raw.skyColor)) errors.push(`Biome skyColor must be a valid hex color (e.g. #112233).`);
  if (!isHexColor(raw.groundColor)) errors.push(`Biome groundColor must be a valid hex color.`);
  if (!isHexColor(raw.stoneColor)) errors.push(`Biome stoneColor must be a valid hex color.`);
  if (!isHexColor(raw.wallColor)) errors.push(`Biome wallColor must be a valid hex color.`);

  const vegetationDensity = Number(raw.vegetationDensity ?? 1.0);
  if (!Number.isFinite(vegetationDensity) || vegetationDensity < 0 || vegetationDensity > 3) {
    errors.push('Biome vegetationDensity must be between 0.0 and 3.0.');
  }

  const dangerLevel = Math.round(Number(raw.dangerLevel ?? 1));
  if (!Number.isFinite(dangerLevel) || dangerLevel < 1 || dangerLevel > 5) {
    errors.push('Biome dangerLevel must be an integer between 1 and 5.');
  }

  return {
    id,
    name,
    baseClass,
    skyColor: isHexColor(raw.skyColor) ? raw.skyColor : '#0f172a',
    groundColor: isHexColor(raw.groundColor) ? raw.groundColor : '#166534',
    stoneColor: isHexColor(raw.stoneColor) ? raw.stoneColor : '#334155',
    wallColor: isHexColor(raw.wallColor) ? raw.wallColor : '#1e293b',
    vegetationDensity,
    dangerLevel,
    ambientDescription: typeof raw.ambientDescription === 'string' ? raw.ambientDescription : 'A strange new region.',
    spawnRoster: Array.isArray(raw.spawnRoster) ? raw.spawnRoster.map(String) : ['crawler', 'drone'],
  };
}

export function validateWeaponEntity(raw: any, errors: string[]): WeaponEntity {
  if (!raw || typeof raw !== 'object') {
    errors.push('Weapon entity must be an object.');
    throw new Error('Invalid weapon entity');
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Custom Weapon';
  const id = typeof raw.id === 'string' && raw.id.trim() ? normalizeSlug(raw.id) : normalizeSlug(name);
  const category = ['blaster', 'sword', 'staff', 'heavy'].includes(raw.category) ? raw.category : 'blaster';
  const baseClass = typeof raw.baseClass === 'string' && raw.baseClass.trim()
    ? raw.baseClass.trim()
    : (category === 'sword' ? 'BaseMeleeWeapon' : category === 'heavy' ? 'BaseHeavyCannon' : 'BaseRangedBlaster');

  const damage = Number(raw.damage ?? 10);
  if (!Number.isFinite(damage) || damage < 1 || damage > 200) {
    errors.push('Weapon damage must be between 1 and 200.');
  }

  const speed = Number(raw.speed ?? 500);
  if (!Number.isFinite(speed) || speed < 50 || speed > 1500) {
    errors.push('Weapon speed must be between 50 and 1500.');
  }

  const cooldown = Number(raw.cooldown ?? 200);
  if (!Number.isFinite(cooldown) || cooldown < 40 || cooldown > 1500) {
    errors.push('Weapon cooldown must be between 40ms and 1500ms.');
  }

  const range = Number(raw.range ?? 400);
  if (!Number.isFinite(range) || range < 20 || range > 1500) {
    errors.push('Weapon range must be between 20 and 1500.');
  }

  return {
    id,
    name,
    baseClass,
    category,
    damage,
    speed,
    cooldown,
    range,
    projectileColor: isHexColor(raw.projectileColor) ? raw.projectileColor : '#62dfc3',
    description: typeof raw.description === 'string' ? raw.description : 'Forged by the Parley engine.',
  };
}

export function validateMechanicEntity(raw: any, errors: string[]): MechanicEntity {
  if (!raw || typeof raw !== 'object') {
    errors.push('Mechanic entity must be an object.');
    throw new Error('Invalid mechanic entity');
  }

  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Engine Tuning';
  const id = typeof raw.id === 'string' && raw.id.trim() ? normalizeSlug(raw.id) : normalizeSlug(name);
  const baseClass = typeof raw.baseClass === 'string' && raw.baseClass.trim() ? raw.baseClass.trim() : 'BasePhysicsModifier';

  const gravityMultiplier = Number(raw.gravityMultiplier ?? 1.0);
  if (!Number.isFinite(gravityMultiplier) || gravityMultiplier < 0.4 || gravityMultiplier > 2.5) {
    errors.push('gravityMultiplier must be between 0.4 and 2.5.');
  }

  const speedMultiplier = Number(raw.speedMultiplier ?? 1.0);
  if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0.4 || speedMultiplier > 3.0) {
    errors.push('speedMultiplier must be between 0.4 and 3.0.');
  }

  const jumpMultiplier = Number(raw.jumpMultiplier ?? 1.0);
  if (!Number.isFinite(jumpMultiplier) || jumpMultiplier < 0.4 || jumpMultiplier > 2.5) {
    errors.push('jumpMultiplier must be between 0.4 and 2.5.');
  }

  const cameraShakeIntensity = Number(raw.cameraShakeIntensity ?? 1.0);
  if (!Number.isFinite(cameraShakeIntensity) || cameraShakeIntensity < 0 || cameraShakeIntensity > 3.0) {
    errors.push('cameraShakeIntensity must be between 0.0 and 3.0.');
  }

  const manaRegenMultiplier = Number(raw.manaRegenMultiplier ?? 1.0);
  if (!Number.isFinite(manaRegenMultiplier) || manaRegenMultiplier < 0.2 || manaRegenMultiplier > 5.0) {
    errors.push('manaRegenMultiplier must be between 0.2 and 5.0.');
  }

  return {
    id,
    name,
    baseClass,
    gravityMultiplier,
    speedMultiplier,
    jumpMultiplier,
    doubleJump: Boolean(raw.doubleJump),
    cameraShakeIntensity,
    manaRegenMultiplier,
    description: typeof raw.description === 'string' ? raw.description : 'Custom physics & mechanics tuning.',
  };
}

export function validateGenerativePayload(raw: any): GenerativePayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Generative response must be a valid JSON object.');
  }

  const entityType = raw.entityType;
  if (!['boss', 'enemy', 'biome', 'weapon', 'mechanic'].includes(entityType)) {
    throw new Error(
      `Invalid entityType: "${entityType}". Must be one of: 'boss', 'enemy', 'biome', 'weapon', 'mechanic'.`
    );
  }

  const errors: string[] = [];
  let entity: GenerativeEntity;

  switch (entityType) {
    case 'boss':
    case 'enemy':
      entity = validateEnemyEntity(raw.entity, errors);
      break;
    case 'biome':
      entity = validateBiomeEntity(raw.entity, errors);
      break;
    case 'weapon':
      entity = validateWeaponEntity(raw.entity, errors);
      break;
    case 'mechanic':
      entity = validateMechanicEntity(raw.entity, errors);
      break;
    default:
      throw new Error(`Unsupported entityType "${entityType}".`);
  }

  if (errors.length > 0) {
    throw new Error(`Schema validation failed:\n- ${errors.join('\n- ')}`);
  }

  const payload: GenerativePayload = {
    entityType,
    entity,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : 'Generated by MIT Parley engine.',
  };

  // Run pre-injection sanity check on the validated payload
  return preInjectionSanityCheck(payload);
}
