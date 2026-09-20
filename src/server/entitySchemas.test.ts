import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateGenerativePayload,
  validateEnemyEntity,
  validateBiomeEntity,
  validateWeaponEntity,
  validateMechanicEntity,
  BASE_CLASSES,
  computeAutoCollider,
  preInjectionSanityCheck,
  theBouncer,
  MODULAR_BEHAVIORS,
} from './entitySchemas';
import {
  saveCustomEntity,
  generateTextureFile,
  updateRegistry,
  loadRegistry,
  generateSvgTexture,
  getCustomPaths,
} from './entityFileManager';

const TEST_DIR = path.join(process.cwd(), 'test-fixtures', 'custom-test');

describe('Generative Entity Schemas & Validation', () => {
  it('validates a well-formed boss entity', () => {
    const raw = {
      entityType: 'boss',
      explanation: 'A cosmic dragon lurking in the crystal depths.',
      entity: {
        id: 'void-dragon',
        name: 'Void Dragon',
        category: 'boss',
        baseType: 'sentinel',
        hp: 1200,
        damage: 45,
        speed: 60,
        range: 500,
        reward: 500,
        scale: 2.5,
        hitbox: { width: 80, height: 80 },
        attackPattern: {
          type: 'burst',
          interval: 1800,
          burstCount: 3,
          projectileColor: '#b794f4',
          warningTimeMs: 600,
        },
        textureTheme: {
          primaryColor: '#553c9a',
          secondaryColor: '#9f7aea',
          accentColor: '#faf089',
          shape: 'dragon',
        },
        lore: 'Guardian of the forgotten void rifts.',
      },
    };

    const result = validateGenerativePayload(raw);
    expect(result.entityType).toBe('boss');
    expect(result.entity.id).toBe('void-dragon');
    expect(result.entity.name).toBe('Void Dragon');
    const foe = result.entity as any;
    expect(foe.hp).toBe(1200);
    expect(foe.damage).toBe(45);
    expect(foe.scale).toBe(2.5);
    expect(foe.attackPattern.type).toBe('burst');
    expect(foe.textureTheme.shape).toBe('dragon');
  });

  it('validates a well-formed biome entity', () => {
    const raw = {
      entityType: 'biome',
      explanation: 'A radioactive zone.',
      entity: {
        id: 'toxic-hollows',
        name: 'Toxic Hollows',
        skyColor: '#052e16',
        groundColor: '#16a34a',
        stoneColor: '#15803d',
        wallColor: '#14532d',
        vegetationDensity: 2.1,
        dangerLevel: 4,
        ambientDescription: 'Acidic fog drifts across luminous moss.',
        spawnRoster: ['crawler', 'gunner', 'drone'],
      },
    };

    const result = validateGenerativePayload(raw);
    expect(result.entityType).toBe('biome');
    const biome = result.entity as any;
    expect(biome.skyColor).toBe('#052e16');
    expect(biome.dangerLevel).toBe(4);
    expect(biome.spawnRoster).toEqual(['crawler', 'gunner', 'drone']);
  });

  it('validates a well-formed weapon entity', () => {
    const raw = {
      entityType: 'weapon',
      explanation: 'High-tech plasma cannon.',
      entity: {
        id: 'plasma-lance',
        name: 'Plasma Lance',
        category: 'heavy',
        damage: 65,
        speed: 800,
        cooldown: 350,
        range: 650,
        projectileColor: '#38bdf8',
        description: 'Pierces through solid bedrock.',
      },
    };

    const result = validateGenerativePayload(raw);
    expect(result.entityType).toBe('weapon');
    const weapon = result.entity as any;
    expect(weapon.damage).toBe(65);
    expect(weapon.category).toBe('heavy');
    expect(weapon.projectileColor).toBe('#38bdf8');
  });

  it('validates a well-formed mechanic entity', () => {
    const raw = {
      entityType: 'mechanic',
      explanation: 'Lunar gravity with agile double jump.',
      entity: {
        id: 'lunar-leaper',
        name: 'Lunar Leaper',
        gravityMultiplier: 0.6,
        speedMultiplier: 1.4,
        jumpMultiplier: 1.3,
        doubleJump: true,
        cameraShakeIntensity: 0.5,
        manaRegenMultiplier: 1.8,
        description: 'Low-gravity lunar exploration tuning.',
      },
    };

    const result = validateGenerativePayload(raw);
    expect(result.entityType).toBe('mechanic');
    const mech = result.entity as any;
    expect(mech.gravityMultiplier).toBe(0.6);
    expect(mech.doubleJump).toBe(true);
  });

  it('rejects hallucinated or invalid entityType', () => {
    const raw = {
      entityType: 'spaceship',
      entity: {},
    };
    expect(() => validateGenerativePayload(raw)).toThrow("Invalid entityType: \"spaceship\"");
  });

  it('rejects enemy with out-of-bounds HP and damage', () => {
    const raw = {
      name: 'Broken Boss',
      hp: 999999, // limit is 5000
      damage: -10, // min is 1
    };
    const errors: string[] = [];
    validateEnemyEntity(raw, errors);
    expect(errors.some(e => e.includes('Enemy hp must be between 10 and 5000'))).toBe(true);
    expect(errors.some(e => e.includes('Enemy damage must be between 1 and 150'))).toBe(true);
  });

  it('rejects biome with invalid hex color', () => {
    const raw = {
      name: 'Bad Color Biome',
      skyColor: 'blue', // not a hex color
      groundColor: '#123456',
      stoneColor: '#abcdef',
      wallColor: '#000000',
    };
    const errors: string[] = [];
    validateBiomeEntity(raw, errors);
    expect(errors.some(e => e.includes('Biome skyColor must be a valid hex color'))).toBe(true);
  });

  it('rejects mechanic with out-of-bounds gravityMultiplier', () => {
    const raw = {
      name: 'Zero Gravity',
      gravityMultiplier: 0.05, // min is 0.4
    };
    const errors: string[] = [];
    validateMechanicEntity(raw, errors);
    expect(errors.some(e => e.includes('gravityMultiplier must be between 0.4 and 2.5'))).toBe(true);
  });

  it('validates weapon entity directly and checks custom paths', () => {
    const errors: string[] = [];
    const wep = validateWeaponEntity({
      name: 'Laser Blade',
      category: 'sword',
      damage: 40,
      speed: 600,
    }, errors);
    expect(wep.id).toBe('laser-blade');
    expect(wep.category).toBe('sword');
    expect(errors).toHaveLength(0);

    const paths = getCustomPaths('/fake/root');
    expect(paths.entitiesDir).toBe(path.join('/fake/root', 'src', 'custom', 'entities'));
    expect(paths.texturesDir).toBe(path.join('/fake/root', 'src', 'custom', 'textures'));
    expect(paths.registryFile).toBe(path.join('/fake/root', 'src', 'custom', 'registry.json'));
  });

  describe('Component Enforcement & Physics Stability', () => {
    it('defines physics-locked base classes in BASE_CLASSES catalog', () => {
      expect(BASE_CLASSES.BaseGroundBoss.allowGravity).toBe(true);
      expect(BASE_CLASSES.BaseGroundBoss.hasCollider).toBe(true);
      expect(BASE_CLASSES.BaseGroundBoss.mass).toBe(150);
      expect(BASE_CLASSES.BaseGroundBoss.defaultLogicController).toBe('AggressiveBoss');

      expect(BASE_CLASSES.BaseFlyingEnemy.allowGravity).toBe(false);
      expect(BASE_CLASSES.BaseFlyingEnemy.hasCollider).toBe(true);
      expect(BASE_CLASSES.BaseFlyingEnemy.mass).toBe(35);
      expect(BASE_CLASSES.BaseFlyingEnemy.defaultLogicController).toBe('HoverAndStrafe');

      expect(BASE_CLASSES.BaseRangedTurret.defaultLogicController).toBe('StationaryTurret');
      expect(BASE_CLASSES.BaseAgileCrawler.defaultLogicController).toBe('PatrolAndAttack');
    });

    it('computeAutoCollider computes bounding box scaled to entity scale', () => {
      // BaseGroundBoss default collider is 64x64
      const col1 = computeAutoCollider(2.0, 'BaseGroundBoss');
      expect(col1.width).toBe(128);
      expect(col1.height).toBe(128);
      expect(col1.isTrigger).toBe(false);

      // Scale custom hitbox
      const col2 = computeAutoCollider(1.5, 'BaseAgileCrawler', { width: 30, height: 40 });
      expect(col2.width).toBe(45);
      expect(col2.height).toBe(60);

      // Custom collider overrides
      const col3 = computeAutoCollider(1.0, 'BaseFlyingEnemy', undefined, {
        width: 50,
        height: 50,
        offsetX: 2,
        offsetY: 4,
        isTrigger: false,
      });
      expect(col3.width).toBe(50);
      expect(col3.height).toBe(50);
      expect(col3.offsetX).toBe(2);
      expect(col3.offsetY).toBe(4);
    });

    it('preInjectionSanityCheck auto-heals missing collider, mass, and logicController from base class', () => {
      const incompletePayload = {
        entityType: 'boss' as const,
        explanation: 'Incomplete boss with missing physics components',
        entity: {
          id: 'magma-golem',
          name: 'Magma Golem',
          category: 'boss' as const,
          hp: 1500,
          damage: 50,
          speed: 40,
          range: 300,
          reward: 400,
          scale: 2.0,
          // Notice missing: hasCollider, mass, logicController, collider
          baseClass: 'BaseGroundBoss',
        },
      };

      const result = preInjectionSanityCheck(incompletePayload as any);
      expect(result.entityType).toBe('boss');
      const foe = result.entity as any;
      expect(foe.hasCollider).toBe(true);
      expect(foe.mass).toBe(150);
      expect(foe.logicController).toBe('AggressiveBoss');
      expect(foe.collider).toBeDefined();
      expect(foe.collider.width).toBe(128); // 64 * 2.0
      expect(foe.collider.height).toBe(128);
    });

    it('preInjectionSanityCheck throws error when entity or payload is missing', () => {
      expect(() => preInjectionSanityCheck(null as any)).toThrow('missing');
      expect(() => preInjectionSanityCheck({ entityType: 'boss' } as any)).toThrow('missing');
    });

    describe('The Bouncer (Local Sanitization & Safeguard Layer)', () => {
      it('clamps physics properties (scale 0.5x-4x, mass 1-500, hp, speed, damage) within safe thresholds', () => {
        const payload = {
          entityType: 'boss' as const,
          explanation: 'Overtuned physics test boss',
          entity: {
            id: 'overtuned-titan',
            name: 'Overtuned Titan',
            category: 'boss' as const,
            scale: 9.5, // should clamp to 4.0
            mass: 99999, // should clamp to 500
            speed: 800, // should clamp to 300
            hp: 99999, // should clamp to 5000
            damage: 999, // should clamp to 150
            range: 5000, // should clamp to 1200
            reward: 50000, // should clamp to 2000
            baseClass: 'BaseGroundBoss',
          },
        };

        const result = theBouncer(payload as any);
        const foe = result.entity as any;
        expect(foe.scale).toBe(4.0);
        expect(foe.mass).toBe(500);
        expect(foe.speed).toBe(300);
        expect(foe.hp).toBe(5000);
        expect(foe.damage).toBe(150);
        expect(foe.range).toBe(1200);
        expect(foe.reward).toBe(2000);

        // Low bounds clamping
        const lowPayload = {
          entityType: 'enemy' as const,
          explanation: 'Undertuned physics test enemy',
          entity: {
            id: 'tiny-mite',
            name: 'Tiny Mite',
            category: 'minion' as const,
            scale: 0.1, // should clamp to 0.5
            mass: -50, // should clamp to baseDef.mass (50)
            speed: 1, // should clamp to 10
            hp: 2, // should clamp to 10
            damage: 0, // should clamp to 1
            baseClass: 'BaseAgileCrawler',
          },
        };
        const lowResult = theBouncer(lowPayload as any);
        const lowFoe = lowResult.entity as any;
        expect(lowFoe.scale).toBe(0.5);
        expect(lowFoe.mass).toBe(50);
        expect(lowFoe.speed).toBe(10);
        expect(lowFoe.hp).toBe(10);
        expect(lowFoe.damage).toBe(1);
      });

      it('enforces surface grounding by stripping raw Y coordinates from AI', () => {
        const payloadWithRawY = {
          entityType: 'boss' as const,
          explanation: 'Boss trying to set its own Y coordinate',
          entity: {
            id: 'sky-intruder',
            name: 'Sky Intruder',
            category: 'boss' as const,
            baseClass: 'BaseGroundBoss',
            y: 42,
            spawnY: 100,
            posY: 200,
            position: { x: 50, y: 75 },
          },
        };

        const result = theBouncer(payloadWithRawY as any);
        const foe = result.entity as any;
        expect(foe.y).toBeUndefined();
        expect(foe.spawnY).toBeUndefined();
        expect(foe.posY).toBeUndefined();
        expect(foe.position?.y).toBeUndefined();
        expect(foe.surfaceGroundingEnforced).toBe(true);
        expect(foe.groundPlacementFormula).toBe('ground_Y + (height / 2) + 0.1');
      });

      it('injects fallback defaults for all missing engine components including composable modular behaviors', () => {
        const minimalPayload = {
          entityType: 'boss' as const,
          explanation: 'Completely barebones boss payload',
          entity: {
            name: 'Barebones Entity',
          },
        };

        const result = theBouncer(minimalPayload as any);
        const foe = result.entity as any;
        expect(foe.hasCollider).toBe(true);
        expect(foe.baseClass).toBe('BaseGroundBoss');
        expect(foe.collider).toBeDefined();
        expect(foe.collider.width).toBeGreaterThan(0);
        expect(foe.collider.height).toBeGreaterThan(0);
        expect(foe.collider.shape).toBe('box');
        expect(foe.mass).toBe(150);
        expect(foe.logicController).toBe('AggressiveBoss');
        expect(foe.attackPattern).toBeDefined();
        expect(foe.attackPattern.type).toBe('MeleeSwipe');
        expect(foe.attackPattern.modularBehaviors).toContain('MeleeSwipe');
        expect(foe.textureTheme).toBeDefined();
        expect(foe.textureTheme.primaryColor).toBe('#e5484d');
      });

      it('supports and validates all five modular combat behaviors', () => {
        expect(MODULAR_BEHAVIORS).toEqual([
          'ProjectileBurst',
          'MeleeSwipe',
          'SummonMinion',
          'Dash',
          'AreaOfEffectHazard',
        ]);

        const modularPayload = {
          entityType: 'boss' as const,
          explanation: 'Modular boss with multiple behaviors',
          entity: {
            id: 'storm-colossus',
            name: 'Storm Colossus',
            category: 'boss' as const,
            baseClass: 'BaseGroundBoss',
            scale: 2.5,
            hp: 2500,
            attackPattern: {
              type: 'ProjectileBurst',
              burstCount: 5,
              projectileColor: '#38bdf8',
              modularBehaviors: ['ProjectileBurst', 'Dash', 'AreaOfEffectHazard'],
            },
          },
        };

        const result = theBouncer(modularPayload as any);
        const foe = result.entity as any;
        expect(foe.attackPattern.type).toBe('ProjectileBurst');
        expect(foe.attackPattern.burstCount).toBe(5);
        expect(foe.attackPattern.projectileColor).toBe('#38bdf8');
        expect(foe.attackPattern.modularBehaviors).toEqual([
          'ProjectileBurst',
          'Dash',
          'AreaOfEffectHazard',
        ]);
      });
    });
  });
});

describe('Entity File Manager & Persistence', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('generates SVG textures with correct viewBox and theme colors for all shapes', () => {
    const shapes = ['dragon', 'beast', 'crystal', 'humanoid', 'mech'] as const;
    for (const shape of shapes) {
      const foe = {
        id: `test-${shape}`,
        name: `Test ${shape}`,
        category: 'boss' as const,
        baseClass: 'BaseGroundBoss',
        baseType: 'sentinel' as const,
        hasCollider: true,
        collider: { width: 128, height: 128, shape: 'box' as const },
        mass: 150,
        logicController: 'AggressiveBoss',
        hp: 1000,
        damage: 50,
        speed: 80,
        range: 400,
        reward: 300,
        scale: 2,
        hitbox: { width: 64, height: 64 },
        attackPattern: { type: 'melee' as const, interval: 1000 },
        textureTheme: {
          primaryColor: '#e5484d',
          secondaryColor: '#ff977d',
          accentColor: '#ffd386',
          shape,
        },
      };
      const svg = generateSvgTexture(foe, 'boss');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 64 64"');
      expect(svg).toContain('#e5484d');
    }
  });

  it('saves custom entity JSON, generates SVG texture, and updates registry on disk', () => {
    const entity = {
      id: 'iron-colossus',
      name: 'Iron Colossus',
      category: 'boss' as const,
      baseClass: 'BaseGroundBoss',
      baseType: 'sentinel' as const,
      hasCollider: true,
      collider: { width: 192, height: 192, shape: 'box' as const },
      mass: 150,
      logicController: 'AggressiveBoss',
      hp: 1500,
      damage: 55,
      speed: 40,
      range: 350,
      reward: 600,
      scale: 3.0,
      hitbox: { width: 96, height: 96 },
      attackPattern: { type: 'charge' as const, interval: 2500 },
      textureTheme: {
        primaryColor: '#475569',
        secondaryColor: '#94a3b8',
        accentColor: '#f59e0b',
        shape: 'mech' as const,
      },
      lore: 'Ancient mechanoid unearthed from the deep mines.',
    };

    const { jsonPath } = saveCustomEntity(entity, TEST_DIR);
    expect(fs.existsSync(jsonPath)).toBe(true);
    const parsedJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(parsedJson.name).toBe('Iron Colossus');

    const { svgPath } = generateTextureFile(entity, 'boss', TEST_DIR);
    expect(fs.existsSync(svgPath)).toBe(true);
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    expect(svgContent).toContain('<svg');
    expect(svgContent).toContain('Iron Colossus');

    const registry = updateRegistry(entity, 'boss', 'Forged by Parley AI test', TEST_DIR);
    expect(registry.entities).toHaveLength(1);
    expect(registry.entities[0].id).toBe('iron-colossus');
    expect(registry.entities[0].name).toBe('Iron Colossus');

    const loaded = loadRegistry(TEST_DIR);
    expect(loaded.entities).toHaveLength(1);
    expect(loaded.entities[0].filePath).toContain('iron-colossus.json');
    expect(loaded.entities[0].texturePath).toContain('iron-colossus.svg');
  });
});
