import { describe, it, expect } from 'vitest';
import {
  getParleyConfig,
  buildSystemPrompt,
  buildMasterGameDesignerPrompt,
  buildContextPayload,
  isGenerativePrompt,
  extractJsonString,
  formatEnginePayload,
  handleGameEdit,
  DEFAULT_PARLEY_MODEL,
  DEFAULT_HIGH_TIER_REASONING_MODEL,
  ASTRA_MODEL_NAMES,
  HIGH_TIER_REASONING_MODELS,
  isReasoningModel,
  theBouncer,
} from './parleyService';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, type GameConfig } from '../platformer/config';
import { DEFAULT_WORLD, type WorldSettings } from '../sandbox/model';

describe('Parley Service & Engine Formatter', () => {
  it('loads PARLEY_API_KEY from environment or .env and defaults to gpt-6-astra', () => {
    const config = getParleyConfig();
    expect(config.apiKey).toBe('sk-parley-v1-XDvV3a98DxDFjOBG-7xulRcxeiqwZR80XM5X_lMa6Io');
    expect(config.baseUrl).toBe('https://parley.api.mit.edu/v1');
    expect(config.model).toBe('gpt-6-astra');
    expect(DEFAULT_PARLEY_MODEL).toBe('gpt-6-astra');
    expect(DEFAULT_HIGH_TIER_REASONING_MODEL).toBe('gpt-6-astra');
    expect(ASTRA_MODEL_NAMES).toContain('gpt-6-astra');
    expect(ASTRA_MODEL_NAMES).toContain('MIT-parley/gpt-6-astra');
  });

  it('builds system prompts tailored to gameType with schema constraints', () => {
    const platformerPrompt = buildSystemPrompt('platformer');
    expect(platformerPrompt).toContain('"palette": "cyan" | "amber" | "violet"');
    expect(platformerPrompt).toContain('"movement"');
    expect(platformerPrompt).toContain('"weapon"');

    const sandboxPrompt = buildSystemPrompt('sandbox');
    expect(sandboxPrompt).toContain('"roughness"');
    expect(sandboxPrompt).toContain('"caves"');
    expect(sandboxPrompt).toContain('"abundance"');
  });

  it('extracts JSON string from markdown code blocks or raw text', () => {
    const plain = '{"theme": "cyberpunk"}';
    expect(extractJsonString(plain)).toBe('{"theme": "cyberpunk"}');

    const fenced = '```json\n{"theme": "cyberpunk"}\n```';
    expect(extractJsonString(fenced)).toBe('{"theme": "cyberpunk"}');

    const surrounded = 'Here is your configuration:\n{"theme": "cyberpunk"}\nHope you enjoy!';
    expect(extractJsonString(surrounded)).toBe('{"theme": "cyberpunk"}');
  });

  it('formats and validates platformer GameConfig payloads', () => {
    const aiProposal = {
      theme: 'Neon Ruins',
      palette: 'amber',
      movement: { speed: 320, jump: 620 },
      weapon: { cooldown: 120, damage: 3 },
      enemies: {
        walker: { speed: 80, damage: 20 },
      },
    };

    const result = formatEnginePayload(aiProposal, 'platformer', DEFAULT_CONFIG) as GameConfig;
    expect(result.theme).toBe('Neon Ruins');
    expect(result.palette).toBe('amber');
    expect(result.movement.speed).toBe(320);
    expect(result.movement.jump).toBe(620);
    expect(result.weapon.cooldown).toBe(120);
    expect(result.weapon.damage).toBe(3);
    expect(result.enemies.walker.speed).toBe(80);
    // Preserves defaults for unmentioned fields
    expect(result.weapon.speed).toBe(DEFAULT_CONFIG.weapon.speed);
  });

  it('rejects platformer payloads exceeding validated limits', () => {
    const invalidProposal = {
      movement: { speed: 9999 }, // limit is 400
    };
    expect(() => formatEnginePayload(invalidProposal, 'platformer', DEFAULT_CONFIG)).toThrow(
      'Movement outside validated limits'
    );
  });

  it('formats and validates sandbox WorldSettings payloads', () => {
    const aiProposal = {
      seed: 'PARLEY-VOID-99',
      difficulty: 'standard',
      roughness: 1.3,
      caves: 0.8,
      abundance: 1.1,
    };

    const result = formatEnginePayload(aiProposal, 'sandbox', DEFAULT_WORLD) as WorldSettings;
    expect(result.seed).toBe('PARLEY-VOID-99');
    expect(result.difficulty).toBe('standard');
    expect(result.roughness).toBe(1.3);
    expect(result.caves).toBe(0.8);
    expect(result.abundance).toBe(1.1);
  });

  it('rejects empty prompts with 400', async () => {
    const res = await handleGameEdit({ prompt: '   ' });
    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain('provide a prompt');
  });

  it('returns 401 if PARLEY_API_KEY is missing', async () => {
    const res = await handleGameEdit(
      { prompt: 'make everything faster' },
      { apiKey: '' }
    );
    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toContain('PARLEY_API_KEY is not configured');
  });

  it('handles Parley API rate-limiting (429) gracefully without crashing', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Too Many Requests' } }), {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Content-Type': 'application/json' },
      });

    const res = await handleGameEdit(
      { prompt: 'change palette to violet' },
      { apiKey: 'test-key' },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.error).toContain('Parley API rate limit reached');
  });

  it('handles Parley API authentication failure (401) gracefully', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API Key' } }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      });

    const res = await handleGameEdit(
      { prompt: 'change palette to violet' },
      { apiKey: 'invalid-key' },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.error).toContain('Parley API authentication failed');
  });

  it('handles network connection error gracefully without throwing', async () => {
    const mockFetch = async () => {
      throw new Error('ENOTFOUND parley.api.mit.edu');
    };

    const res = await handleGameEdit(
      { prompt: 'increase gravity' },
      { apiKey: 'test-key' },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(502);
    expect(res.error).toContain('Failed to connect to Parley API');
  });

  it('handles malformed non-JSON output from AI model', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Sorry, I cannot help with that.' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const res = await handleGameEdit(
      { prompt: 'turn into space theme', gameType: 'platformer' },
      { apiKey: 'test-key' },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(422);
    expect(res.error).toContain('could not be parsed as JSON');
  });

  it('sends correct HTTP POST request and parses successful response into GameForge structure', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse(String(init?.body || '{}'));

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  theme: 'Solar Sanctuary',
                  palette: 'amber',
                  movement: { speed: 310, jump: 610 },
                  weapon: { damage: 4, cooldown: 150 },
                  objective: 'Defeat 5 sentinels and clear the solar vault',
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await handleGameEdit(
      {
        prompt: 'Change palette to amber and boost blaster damage',
        currentState: DEFAULT_CONFIG,
        gameType: 'platformer',
      },
      { apiKey: 'test-key', model: 'google/gemini-3.8-flash' },
      mockFetch as unknown as typeof fetch
    );

    expect(capturedUrl).toBe('https://parley.api.mit.edu/v1/chat/completions');
    expect(capturedHeaders['Authorization']).toBe('Bearer test-key');
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedBody.model).toBe('google/gemini-3.8-flash');
    expect(capturedBody.messages[0].role).toBe('system');
    expect(capturedBody.messages[1].role).toBe('user');

    expect(res.ok).toBe(true);
    expect(res.statusCode).toBe(200);
    const data = res.data as GameConfig;
    expect(data.theme).toBe('Solar Sanctuary');
    expect(data.palette).toBe('amber');
    expect(data.movement.speed).toBe(310);
    expect(data.weapon.damage).toBe(4);
    expect(data.objective).toBe('Defeat 5 sentinels and clear the solar vault');
  });

  it('builds Master Game Designer prompt establishing Lead Engine Architect & Systems Designer', () => {
    const prompt = buildMasterGameDesignerPrompt();
    expect(prompt).toContain('Lead Engine Architect & Systems Designer');
    expect(prompt).toContain('deriving entities from physics-stable base classes rather than raw primitives');
    expect(prompt).toContain('creatively fill in the blanks');
    expect(prompt).toContain('"entityType": "boss" | "enemy"');
    expect(prompt).toContain('"entityType": "biome"');
    expect(prompt).toContain('"entityType": "weapon"');
    expect(prompt).toContain('"entityType": "mechanic"');
    expect(prompt).toContain('beast');
    expect(prompt).toContain('dragon');
  });

  it('correctly classifies open-ended prompts vs standard world generation', () => {
    expect(isGenerativePrompt('Add a new boss', 'sandbox')).toBe(true);
    expect(isGenerativePrompt('Create a toxic biome', 'sandbox')).toBe(true);
    expect(isGenerativePrompt('Give me a plasma rifle weapon', 'sandbox')).toBe(true);
    expect(isGenerativePrompt('Tune mechanics: add double jump and high speed', 'sandbox')).toBe(true);
    expect(isGenerativePrompt('Any prompt', 'open-ended')).toBe(true);
    expect(isGenerativePrompt('Any prompt', 'generative')).toBe(true);

    // Standard world settings
    expect(isGenerativePrompt('Change world seed to 12345, roughness 1.1, caves 0.9', 'sandbox')).toBe(false);
    expect(isGenerativePrompt('More caves and abundant ores', 'sandbox')).toBe(false);
    // Platformer always uses platformer config
    expect(isGenerativePrompt('Add a boss', 'platformer')).toBe(false);
  });

  it('packages game state context with player level, vitals, active biome, and templates', () => {
    const payloadStr = buildContextPayload(
      'Add an ancient titan boss',
      {
        playerLevel: 4,
        health: 85,
        mana: 90,
        activeBiome: 'Crystal depths',
        depth: 35,
        equippedSkin: 'knight',
        coins: 240,
      }
    );

    const parsed = JSON.parse(payloadStr);
    expect(parsed.userPrompt).toBe('Add an ancient titan boss');
    expect(parsed.playerContext.progressionLevel).toBe(4);
    expect(parsed.playerContext.vitals.health).toBe(85);
    expect(parsed.playerContext.activeBiome).toBe('Crystal depths');
    expect(parsed.playerContext.depthMeters).toBe(35);
    expect(parsed.playerContext.equippedSkin).toBe('knight');
    expect(parsed.playerContext.coins).toBe(240);
    expect(parsed.catalogue.enemyArchetypes).toContain('sentinel');
    expect(parsed.catalogue.biomes).toContain('Crystal depths');
  });

  it('executes generative boss request, writes custom entity and texture files, and updates registry', async () => {
    const testBaseDir = path.join(process.cwd(), 'test-fixtures', 'parley-service-gen-test');
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }

    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entityType: 'boss',
                  explanation: 'Forged an obsidian dreadnought boss to challenge the explorer.',
                  entity: {
                    id: 'obsidian-dreadnought',
                    name: 'Obsidian Dreadnought',
                    category: 'boss',
                    baseType: 'sentinel',
                    hp: 1400,
                    damage: 55,
                    speed: 45,
                    range: 450,
                    reward: 800,
                    scale: 2.8,
                    hitbox: { width: 90, height: 90 },
                    attackPattern: {
                      type: 'burst',
                      interval: 2200,
                      burstCount: 4,
                      projectileColor: '#ef4444',
                      warningTimeMs: 800,
                    },
                    textureTheme: {
                      primaryColor: '#18181b',
                      secondaryColor: '#dc2626',
                      accentColor: '#f97316',
                      shape: 'mech',
                    },
                    lore: 'A war automaton left behind from the ancient excavation.',
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const res = await handleGameEdit(
      {
        prompt: 'Add a terrifying mechanical dreadnought boss',
        gameType: 'open-ended',
        context: { playerLevel: 5, activeBiome: 'Rust wastes' },
      },
      { apiKey: 'test-key', baseDir: testBaseDir },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.message).toContain('Obsidian Dreadnought');
    const data = res.data as any;
    expect(data.entityType).toBe('boss');
    expect(data.entity.id).toBe('obsidian-dreadnought');

    // Verify files were generated on disk
    expect(fs.existsSync(data.files.json)).toBe(true);
    expect(fs.existsSync(data.files.texture)).toBe(true);
    const savedJson = JSON.parse(fs.readFileSync(data.files.json, 'utf-8'));
    expect(savedJson.name).toBe('Obsidian Dreadnought');
    const savedSvg = fs.readFileSync(data.files.texture, 'utf-8');
    expect(savedSvg).toContain('<svg');
    expect(savedSvg).toContain('viewBox="0 0 90 90"');

    // Clean up test files
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  });

  it('rejects hallucinated schema in generative mode and does NOT write any files', async () => {
    const testBaseDir = path.join(process.cwd(), 'test-fixtures', 'parley-service-bad-test');
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }

    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entityType: 'boss',
                  explanation: 'Hallucinated bad boss',
                  entity: {
                    id: 'bad-boss',
                    name: 'Bad Boss',
                    hp: 999999, // exceeds validated 5000 limit
                    damage: 9999, // exceeds validated 150 limit
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    const res = await handleGameEdit(
      {
        prompt: 'Add an overpowered god boss',
        gameType: 'open-ended',
      },
      { apiKey: 'test-key', baseDir: testBaseDir },
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(false);
    expect(res.statusCode).toBe(422);
    expect(res.error).toContain('Schema validation failed');

    // Verify NO files were created on disk!
    const entitiesDir = path.join(testBaseDir, 'src', 'custom', 'entities');
    expect(fs.existsSync(entitiesDir)).toBe(false);
  });

  it('completely removes temperature for gpt-6-astra (reasoning model) and keeps 0.2 for non-reasoning models', async () => {
    let capturedBody: any = null;

    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entityType: 'enemy',
                  explanation: 'Created high-tier reasoning enemy',
                  entity: {
                    id: 'void-crawler',
                    name: 'Void Crawler',
                    category: 'crawler',
                    baseClass: 'BaseAgileCrawler',
                    hp: 80,
                    damage: 15,
                    speed: 65,
                    range: 280,
                    reward: 20,
                    scale: 1.0,
                    hasCollider: true,
                    mass: 1.0,
                    logicController: 'PatrolAndAttack',
                    collider: { width: 24, height: 24, isTrigger: false },
                  },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    // gpt-6-astra (default) must completely omit temperature to fix 400 error
    const resAstra = await handleGameEdit(
      {
        prompt: 'Create a fast void crawler',
        gameType: 'open-ended',
      },
      { apiKey: 'test-key', model: 'gpt-6-astra' },
      mockFetch as unknown as typeof fetch
    );

    expect(resAstra.ok).toBe(true);
    expect(capturedBody.model).toBe('gpt-6-astra');
    expect(capturedBody.temperature).toBeUndefined();
    expect(capturedBody.max_tokens).toBeUndefined();

    // Standard non-reasoning model retains temperature
    const resStandard = await handleGameEdit(
      {
        prompt: 'Create a fast void crawler',
        gameType: 'open-ended',
      },
      { apiKey: 'test-key', model: 'openai/gpt-4' },
      mockFetch as unknown as typeof fetch
    );

    expect(resStandard.ok).toBe(true);
    expect(capturedBody.model).toBe('openai/gpt-4');
    expect(capturedBody.temperature).toBe(0.2);
  });

  it('isReasoningModel correctly identifies models that reject temperature parameters', () => {
    expect(isReasoningModel('gpt-6-astra')).toBe(true);
    expect(isReasoningModel('MIT-parley/gpt-6-astra')).toBe(true);
    expect(isReasoningModel('o1-mini')).toBe(true);
    expect(isReasoningModel('o3-preview')).toBe(true);
    expect(isReasoningModel('deepseek-reasoning')).toBe(true);
    expect(isReasoningModel('openai/gpt-4o')).toBe(false);
    expect(isReasoningModel('openai/gpt-4')).toBe(false);
    expect(isReasoningModel('anthropic/claude-3-opus')).toBe(false);
    expect(HIGH_TIER_REASONING_MODELS).toContain('gpt-6-astra');
    expect(typeof theBouncer).toBe('function');
  });

  it('Master Game Designer prompt modularizes behaviors and grants creative freedom', () => {
    const prompt = buildMasterGameDesignerPrompt();
    // Creative freedom
    expect(prompt).toContain('CREATIVE FREEDOM & ART DIRECTION');
    expect(prompt).toContain('narrative lore');
    expect(prompt).toContain('visual tinting');

    // Modular behaviors
    expect(prompt).toContain('MODULAR COMBAT BEHAVIORS');
    expect(prompt).toContain('ProjectileBurst');
    expect(prompt).toContain('MeleeSwipe');
    expect(prompt).toContain('SummonMinion');
    expect(prompt).toContain('Dash');
    expect(prompt).toContain('AreaOfEffectHazard');

    // Template inheritance
    expect(prompt).toContain('TEMPLATE INHERITANCE');
    expect(prompt).toContain('BaseGroundBoss');
    expect(prompt).toContain('BaseFlyingEnemy');
    expect(prompt).toContain('BaseAgileCrawler');
    expect(prompt).toContain('BaseRangedTurret');
    expect(prompt).toContain('BaseMeleeWeapon');

    // Collision and Hitbox enforcement
    expect(prompt).toContain('COLLISION & HITBOX ENFORCEMENT');
    expect(prompt).toContain('collider');

    // Behavior Controller
    expect(prompt).toContain('BEHAVIOR CONTROLLER ATTACHMENT');
    expect(prompt).toContain('AggressiveBoss');
    expect(prompt).toContain('HoverAndStrafe');
    expect(prompt).toContain('StationaryTurret');
    expect(prompt).toContain('PatrolAndAttack');
  });

  it('automatically performs self-healing retry when Parley output initially fails schema validation', async () => {
    const testBaseDir = path.join(process.cwd(), 'test-fixtures', 'parley-retry-test');
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }

    let attempt = 0;
    let secondCallBody: any = null;

    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      attempt++;
      if (attempt === 1) {
        // First attempt: out-of-bounds HP
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    entityType: 'boss',
                    explanation: 'Initial invalid boss',
                    entity: {
                      id: 'overtuned-boss',
                      name: 'Overtuned Boss',
                      category: 'boss',
                      hp: 99999, // Exceeds 5000 max!
                      damage: 50,
                      speed: 40,
                      range: 300,
                      reward: 300,
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Second attempt: Parley self-corrects based on error prompt!
        secondCallBody = JSON.parse(String(init?.body || '{}'));
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    entityType: 'boss',
                    explanation: 'Corrected boss with safe stats',
                    entity: {
                      id: 'rebalanced-boss',
                      name: 'Rebalanced Boss',
                      category: 'boss',
                      baseClass: 'BaseGroundBoss',
                      hp: 2500, // Valid!
                      damage: 50,
                      speed: 40,
                      range: 300,
                      reward: 300,
                      scale: 2.0,
                      hasCollider: true,
                      mass: 5.0,
                      logicController: 'AggressiveBoss',
                      collider: { width: 96, height: 96, isTrigger: false },
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    };

    const res = await handleGameEdit(
      {
        prompt: 'Add an ancient mountain boss',
        gameType: 'open-ended',
      },
      { apiKey: 'test-key', baseDir: testBaseDir },
      mockFetch as unknown as typeof fetch
    );

    expect(attempt).toBe(2);
    expect(res.ok).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.data).toBeDefined();
    expect((res.data as any).entity.name).toBe('Rebalanced Boss');
    expect((res.data as any).autoCorrected).toBe(true);
    // Ensure second call included validation error in user prompt
    expect(secondCallBody.messages[3].content).toContain('failed internal engine validation');
    // Ensure second call for gpt-6-astra also completely omits temperature to prevent 400 errors
    expect(secondCallBody.temperature).toBeUndefined();
    expect(secondCallBody.max_tokens).toBeUndefined();

    // Clean up
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  });

  it('explicitly targets gpt-6-astra by default and supports PARLEY_MODEL / platform routing override', async () => {
    let capturedBody: any = null;

    const mockFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  theme: 'Astra Citadel',
                  palette: 'violet',
                  movement: { speed: 300, jump: 600 },
                  weapon: { damage: 5, cooldown: 200 },
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    // Default configuration uses gpt-6-astra
    const resDefault = await handleGameEdit(
      { prompt: 'Set violet theme', gameType: 'platformer' },
      { apiKey: 'test-key' },
      mockFetch as unknown as typeof fetch
    );
    expect(resDefault.ok).toBe(true);
    expect(capturedBody.model).toBe('gpt-6-astra');

    // Platform routing schema override (e.g. MIT-parley/gpt-6-astra)
    const resOverride = await handleGameEdit(
      { prompt: 'Set violet theme', gameType: 'platformer' },
      { apiKey: 'test-key', model: 'MIT-parley/gpt-6-astra' },
      mockFetch as unknown as typeof fetch
    );
    expect(resOverride.ok).toBe(true);
    expect(capturedBody.model).toBe('MIT-parley/gpt-6-astra');
  });
});
