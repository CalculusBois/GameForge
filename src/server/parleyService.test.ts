import { exampleSpec } from '../creator/example';
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

  it('generates a validated session specification without source files', async () => {
    const dir=path.join(process.cwd(),'test-fixtures','session-only');
    const res=await handleGameEdit({prompt:'Create a crystal guardian',gameType:'generative'},{apiKey:'test-key',baseDir:dir},async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(exampleSpec)}}]})));
    expect(res.ok).toBe(true);expect(res.data).toEqual(exampleSpec);expect(fs.existsSync(dir)).toBe(false);
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
    expect(res.error).toContain('unsupported capability');

    // Verify NO files were created on disk!
    const entitiesDir = path.join(testBaseDir, 'src', 'custom', 'entities');
    expect(fs.existsSync(entitiesDir)).toBe(false);
  });

  it('omits temperature for reasoning models and sends only bounded JSON requests', async () => {
    for(const model of ['gpt-6-astra','openai/gpt-4']) {
      let body:any;
      const result=await handleGameEdit({prompt:'Create a crystal guardian',gameType:'generative'},{apiKey:'test-key',model},async(_url,init)=>{body=JSON.parse(String(init?.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(exampleSpec)}}]}));});
      expect(result.ok).toBe(true);expect(body.model).toBe(model);expect(body.temperature).toBe(model==='gpt-6-astra'?undefined:.3);expect(body.max_tokens).toBeUndefined();
    }
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

  it('retries invalid specifications once with the validation error', async () => {
    let attempt=0,body:any;
    const result=await handleGameEdit({prompt:'Create a prism guardian',gameType:'generative'},{apiKey:'test-key'},async(_url,init)=>{body=JSON.parse(String(init?.body));attempt++;const spec=structuredClone(exampleSpec);if(attempt===1)spec.stats.health=99999;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(spec)}}]}));});
    expect(result.ok).toBe(true);expect(attempt).toBe(2);expect(body.messages[3].content).toContain('Validation failed: health');expect(body.temperature).toBeUndefined();
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
