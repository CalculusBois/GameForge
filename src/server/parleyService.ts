import { loadEnv } from 'vite';
import { validateConfig, DEFAULT_CONFIG, type GameConfig } from '../platformer/config';
import { validateSettings, DEFAULT_WORLD, type WorldSettings } from '../sandbox/model';
import { preInjectionSanityCheck, theBouncer, type GenerativeEntity } from './entitySchemas';
export { theBouncer, preInjectionSanityCheck };

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};

export interface ParleyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoningModel?: string;
  baseDir?: string;
}

export interface GameStateContext {
  playerLevel?: number;
  health?: number;
  mana?: number;
  activeBiome?: string;
  depth?: number;
  equippedSkin?: string;
  coins?: number;
  availableTemplates?: {
    enemyArchetypes: string[];
    weaponCategories: string[];
    biomes: string[];
  };
  existingCustomEntities?: string[];
}

export interface GameEditRequest {
  prompt: string;
  currentState?: Record<string, unknown> | GameConfig | WorldSettings;
  gameType?: 'platformer' | 'sandbox' | 'generative' | 'open-ended';
  context?: GameStateContext;
}

export interface GenerativeResponseData {
  entityType: 'boss' | 'enemy' | 'biome' | 'weapon' | 'mechanic';
  entity: GenerativeEntity;
  explanation: string;
  files: {
    json: string;
    texture: string;
    registry: string;
  };
  registryCount?: number;
}

export interface GameEditResponse {
  ok: boolean;
  data?: GameConfig | WorldSettings | GenerativeResponseData | Record<string, unknown>;
  error?: string;
  message?: string;
  statusCode?: number;
}

const DEFAULT_PARLEY_BASE_URL = 'https://parley.api.mit.edu/v1';
export const DEFAULT_PARLEY_MODEL = 'gpt-6-astra';
export const DEFAULT_HIGH_TIER_REASONING_MODEL = 'gpt-6-astra';
export const ASTRA_MODEL_NAMES = ['gpt-6-astra', 'MIT-parley/gpt-6-astra'];
export const HIGH_TIER_REASONING_MODELS = [
  'gpt-6-astra',
  'MIT-parley/gpt-6-astra',
  'openai/gpt-4o',
  'anthropic/claude-3-opus',
  'google/gemini-1.5-pro',
  'anthropic/claude-3.7-sonnet',
  'openai/gpt-4',
];

/**
 * Checks whether a model is a reasoning model (such as GPT-6 Astra, o1, o3)
 * that rejects custom temperature values with an HTTP 400 error.
 */
export function isReasoningModel(modelName: string): boolean {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();
  return (
    lower.includes('astra') ||
    lower.includes('o1') ||
    lower.includes('o3') ||
    lower.includes('reasoning')
  );
}

const PARLEY_API_KEY_ENV_VARS = [
  'PARLEY_API_KEY',
  'MIT_PARLEY_API_KEY',
  'MY_MIT_PARLEY_API_KEY',
];

const PARLEY_BASE_URL_ENV_VARS = [
  'PARLEY_BASE_URL',
  'MIT_PARLEY_BASE_URL',
  'MIT-PARLEY_BASE_URL',
  'MY_MIT_PARLEY_BASE_URL',
];

const PARLEY_REASONING_MODEL_ENV_VARS = [
  'PARLEY_REASONING_MODEL',
  'PARLEY_HIGH_TIER_MODEL',
  'HIGH_TIER_MODEL',
];

/**
 * Loads the Parley configuration from environment variables and local .env file.
 */
export function getParleyConfig(envDir: string = process.cwd()): ParleyConfig {
  let loadedEnv: Record<string, string> = {};
  try {
    loadedEnv = loadEnv('', envDir, '');
  } catch {
    // If loadEnv fails in certain environments, fallback to process.env
  }

  let apiKey = '';
  for (const key of PARLEY_API_KEY_ENV_VARS) {
    const val = process.env[key]?.trim() || loadedEnv[key]?.trim();
    if (val) {
      apiKey = val;
      break;
    }
  }

  let baseUrl = DEFAULT_PARLEY_BASE_URL;
  for (const key of PARLEY_BASE_URL_ENV_VARS) {
    const val = process.env[key]?.trim() || loadedEnv[key]?.trim();
    if (val) {
      baseUrl = val.replace(/\/+$/, '');
      break;
    }
  }

  const model = process.env.PARLEY_MODEL?.trim() || loadedEnv.PARLEY_MODEL?.trim() || DEFAULT_PARLEY_MODEL;

  let reasoningModel = process.env.PARLEY_MODEL?.trim() || loadedEnv.PARLEY_MODEL?.trim() || DEFAULT_HIGH_TIER_REASONING_MODEL;
  for (const key of PARLEY_REASONING_MODEL_ENV_VARS) {
    const val = process.env[key]?.trim() || loadedEnv[key]?.trim();
    if (val) {
      reasoningModel = val;
      break;
    }
  }

  return { apiKey, baseUrl, model, reasoningModel };
}

/**
 * Builds the Lead Engine Architect & Systems Designer system prompt for open-ended requests.
 * Enforces Template Inheritance from physics-stable base classes, modular behaviors, and strict JSON generation.
 */
export function buildMasterGameDesignerPrompt(): string {
  return `You are the Lead Engine Architect & Systems Designer for GameForge (Lumen Frontier).
Your role is to bridge the gap between open-ended player requests and concrete, balanced game engine modifications using strict TEMPLATE INHERITANCE.
When processing open-ended player requests, you must generate complete, syntactically strict JSON matching our game data schemas, deriving entities from physics-stable base classes rather than raw primitives.
If you receive a vague user request, you must creatively fill in the blanks (e.g. inventing boss names, health stats, attack patterns, hitboxes, and texture themes).

CREATIVE FREEDOM & ART DIRECTION:
You have extensive creative freedom over narrative lore, atmospheric themes, visual tinting (custom primary, secondary, and accent hex colors with shape silhouettes), thematic naming, attack choreography, and stat balancing. Bring player ideas to life with rich, vivid personality!

CRITICAL RULE: DO NOT generate entities entirely from scratch or from raw primitives!
You MUST inherit from and extend existing, physics-stable base classes:
- For Ground Bosses: "BaseGroundBoss" (hasRigidbody: true, allowGravity: true, mass: 150, logicController: "AggressiveBoss")
- For Flying Enemies/Bosses: "BaseFlyingEnemy" (hasRigidbody: true, allowGravity: false, mass: 35, logicController: "HoverAndStrafe")
- For Ground Minions/Crawlers: "BaseAgileCrawler" (hasRigidbody: true, allowGravity: true, mass: 50, logicController: "PatrolAndAttack")
- For Stationary Turrets: "BaseRangedTurret" (hasRigidbody: true, allowGravity: true, mass: 200, logicController: "StationaryTurret")
- For Melee Weapons: "BaseMeleeWeapon" (inheritsFrom: "Weapon", logicController: "MeleeSwingController")
- For Ranged Blasters: "BaseRangedBlaster" (inheritsFrom: "Weapon", logicController: "ProjectileController")
- For Heavy Weapons: "BaseHeavyCannon" (inheritsFrom: "Weapon", logicController: "HeavyBlastController")
- For Biomes: "BaseHazardBiome"
- For Mechanics: "BasePhysicsModifier"

The base class guarantees core physics (rigidbodies, gravity settings, collision foundations) are perfectly intact.
You are ONLY allowed to modify stats, abilities, scale, and visuals.

MODULAR COMBAT BEHAVIORS:
Assemble entity attack choreography using composable modular behaviors:
- "ProjectileBurst": Salvo of projectiles fired toward player (specify burstCount: 2-8, interval, projectileColor).
- "MeleeSwipe": Close-range telegraphed cleave/strike applying kinetic damage.
- "SummonMinion": Spawns combat reinforcement minions (e.g. crawler or drone) during battle.
- "Dash": Sudden high-velocity lunge or charge closing distance to player.
- "AreaOfEffectHazard": Radial 360-degree shockwave or explosive energy burst centered on entity.

COMPONENT ENFORCEMENT REQUIREMENTS:
1. "baseClass": Must be one of the base classes above (TEMPLATE INHERITANCE).
2. "hasCollider": Must be true.
3. COLLISION & HITBOX ENFORCEMENT: Explicit collider bounding box data:
   { "width": number (8 - 300), "height": number (8 - 300), "shape": "box" | "circle" }
   NOTE: If you modify the scale of the entity, you MUST scale the collider width and height accordingly!
4. "mass": Must be a positive number (> 0).
5. BEHAVIOR CONTROLLER ATTACHMENT: Must attach an active behavior controller:
   - "AggressiveBoss" (charges, bursts, and hunts the player)
   - "HoverAndStrafe" (flies above ground, strafes, and shoots)
   - "PatrolAndAttack" (patrols, leaps or shoots on sight)
   - "StationaryTurret" (tracks player from fixed position)

You MUST return ONLY a single valid JSON object matching EXACTLY one of the following schemas:

For Boss or Enemy:
{
  "entityType": "boss" | "enemy",
  "explanation": string,
  "entity": {
    "id": string (lowercase-kebab-case),
    "name": string,
    "baseClass": "BaseGroundBoss" | "BaseFlyingEnemy" | "BaseAgileCrawler" | "BaseRangedTurret",
    "category": "boss" | "elite" | "minion",
    "baseType": "crawler" | "hopper" | "drone" | "gunner" | "caster" | "sentinel",
    "hasCollider": true,
    "collider": { "width": number, "height": number, "shape": "box" | "circle" },
    "mass": number,
    "logicController": "AggressiveBoss" | "HoverAndStrafe" | "PatrolAndAttack" | "StationaryTurret",
    "hp": number (10 - 5000),
    "damage": number (1 - 150),
    "speed": number (10 - 300),
    "range": number (50 - 1200),
    "reward": number (1 - 2000),
    "scale": number (0.5 - 4.0),
    "hitbox": { "width": number, "height": number },
    "attackPattern": {
      "type": "ProjectileBurst" | "MeleeSwipe" | "SummonMinion" | "Dash" | "AreaOfEffectHazard" | "melee" | "projectile" | "charge" | "burst",
      "modularBehaviors": ["ProjectileBurst" | "MeleeSwipe" | "SummonMinion" | "Dash" | "AreaOfEffectHazard"],
      "interval": number (200 - 10000),
      "burstCount": number (1 - 10),
      "projectileColor": string (hex color),
      "warningTimeMs": number (100 - 3000)
    },
    "textureTheme": {
      "primaryColor": string (hex color),
      "secondaryColor": string (hex color),
      "accentColor": string (hex color),
      "shape": "beast" | "mech" | "humanoid" | "crystal" | "dragon"
    },
    "lore": string
  }
}

For Weapon:
{
  "entityType": "weapon",
  "explanation": string,
  "entity": {
    "id": string,
    "name": string,
    "baseClass": "BaseMeleeWeapon" | "BaseRangedBlaster" | "BaseHeavyCannon",
    "category": "blaster" | "sword" | "staff" | "heavy",
    "damage": number (1 - 200),
    "speed": number (50 - 1500),
    "cooldown": number (40 - 1500),
    "range": number (20 - 1500),
    "projectileColor": string (hex color),
    "description": string
  }
}

For Biome:
{
  "entityType": "biome",
  "explanation": string,
  "entity": {
    "id": string,
    "name": string,
    "baseClass": "BaseHazardBiome",
    "skyColor": string (hex color),
    "groundColor": string (hex color),
    "stoneColor": string (hex color),
    "wallColor": string (hex color),
    "vegetationDensity": number (0.0 - 3.0),
    "dangerLevel": number (1 - 5),
    "ambientDescription": string,
    "spawnRoster": string[]
  }
}

For Mechanic:
{
  "entityType": "mechanic",
  "explanation": string,
  "entity": {
    "id": string,
    "name": string,
    "baseClass": "BasePhysicsModifier",
    "gravityMultiplier": number (0.4 - 2.5),
    "speedMultiplier": number (0.4 - 3.0),
    "jumpMultiplier": number (0.4 - 2.5),
    "doubleJump": boolean,
    "cameraShakeIntensity": number (0.0 - 3.0),
    "manaRegenMultiplier": number (0.2 - 5.0),
    "description": string
  }
}

OUTPUT RULES:
- Output NO text before or after the JSON.
- Do NOT wrap in markdown commentary.
- Strictly adhere to the numeric ranges and enums.`;
}

/**
 * Builds the system instructions for Parley's generative AI model for standard game config tweaks.
 */
export function buildSystemPrompt(gameType: 'platformer' | 'sandbox'): string {
  if (gameType === 'platformer') {
    return `You are the GameForge generative engine. Your job is to modify game state, mechanics, and textures/palette for a 2D action platformer based on player prompts while the game is paused.
You must return ONLY a single valid JSON object matching this schema (no markdown, no backticks, no explanations):
{
  "theme": string (name/theme description),
  "palette": "cyan" | "amber" | "violet" (controls tile, hero, and visual textures),
  "movement": {
    "gravity": number (1200 - 1800),
    "acceleration": number (1500 - 4000),
    "deceleration": number (2000 - 3500),
    "speed": number (200 - 400),
    "jump": number (500 - 700),
    "maxFall": number (500 - 900),
    "coyoteMs": number (50 - 150),
    "bufferMs": number (50 - 200),
    "doubleJump": boolean
  },
  "weapon": {
    "cooldown": number (80 - 500),
    "speed": number (300 - 1000),
    "lifetime": number (500 - 3000),
    "cap": integer (1 - 40),
    "damage": number (1 - 50)
  },
  "enemies": {
    "walker": { "health": number (1 - 20), "speed": number (20 - 180), "damage": number (1 - 50), "interval": number (600 - 3000), "range": number (100 - 600) },
    "drone": { "health": number (1 - 20), "speed": number (20 - 180), "damage": number (1 - 50), "interval": number (600 - 3000), "range": number (100 - 600) },
    "turret": { "health": number (1 - 20), "speed": 0, "damage": number (1 - 50), "interval": number (600 - 3000), "range": number (100 - 600) }
  },
  "generation": {
    "seed": string (max 80 chars),
    "mode": "demo" | "endless",
    "demoRooms": integer (1 - 50)
  },
  "difficulty": {
    "speedCap": number (0 - 180),
    "densityCap": integer (1 - 8)
  },
  "objective": string,
  "shake": boolean
}`;
  }

  return `You are the GameForge generative engine. Your job is to modify world generation parameters for a continuous side-view exploration sandbox while paused.
You must return ONLY a single valid JSON object matching this schema (no markdown, no backticks, no explanations):
{
  "seed": string (1-80 chars),
  "difficulty": "explorer" | "standard",
  "roughness": number (between 0.6 and 1.4),
  "caves": number (between 0.6 and 1.4),
  "abundance": number (between 0.6 and 1.4)
}`;
}

/**
 * Strips markdown code fences or wraps around JSON responses.
 */
export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

/**
 * Detects whether a prompt is an open-ended generative request for entities/mechanics.
 */
export function isGenerativePrompt(prompt: string, gameType?: string): boolean {
  if (gameType === 'generative' || gameType === 'open-ended') {
    return true;
  }
  if (gameType === 'platformer') {
    return false;
  }
  const lower = prompt.toLowerCase();
  if (lower.includes('seed') || lower.includes('roughness') || lower.includes('caves') || lower.includes('abundance')) {
    if (!lower.includes('boss') && !lower.includes('enemy') && !lower.includes('biome') && !lower.includes('weapon') && !lower.includes('mechanic')) {
      return false;
    }
  }
  const keywords = [
    'boss', 'enemy', 'foe', 'monster', 'dragon', 'behemoth', 'minion', 'creature',
    'biome', 'new biome', 'zone', 'region',
    'weapon', 'gun', 'blaster', 'sword', 'cannon', 'rifle', 'staff',
    'mechanic', 'double jump', 'physics', 'speed multiplier', 'gravity multiplier',
    'add a', 'create a', 'make a', 'forge a', 'spawn a', 'new boss', 'new enemy'
  ];
  return keywords.some(k => lower.includes(k));
}

/**
 * Packages the user's prompt with current game state context into JSON.
 */
export function buildContextPayload(
  prompt: string,
  context?: GameStateContext,
  currentState?: Record<string, unknown> | GameConfig | WorldSettings
): string {
  const stateObj = (currentState && typeof currentState === 'object' ? currentState : {}) as Record<string, unknown>;

  const playerLevel = context?.playerLevel ??
    (typeof stateObj.level === 'number' ? stateObj.level :
     typeof stateObj.coins === 'number' ? Math.max(1, Math.floor(stateObj.coins / 50) + 1) : 1);

  const health = context?.health ?? (typeof stateObj.health === 'number' ? stateObj.health : 100);
  const mana = context?.mana ?? (typeof stateObj.mana === 'number' ? stateObj.mana : 100);
  const activeBiome = context?.activeBiome ?? (typeof stateObj.biome === 'string' ? stateObj.biome : 'Verdant frontier');
  const depth = context?.depth ?? (typeof stateObj.depth === 'number' ? stateObj.depth : 0);
  const equippedSkin = context?.equippedSkin ?? (typeof stateObj.equippedSkin === 'string' ? stateObj.equippedSkin : 'wanderer');
  const coins = context?.coins ?? (typeof stateObj.coins === 'number' ? stateObj.coins : 0);

  const availableTemplates = context?.availableTemplates ?? {
    enemyArchetypes: ['BaseGroundBoss', 'BaseFlyingEnemy', 'BaseAgileCrawler', 'BaseRangedTurret'],
    weaponCategories: ['BaseMeleeWeapon', 'BaseRangedBlaster', 'BaseHeavyCannon'],
    biomes: ['BaseHazardBiome'],
  };

  return JSON.stringify(
    {
      userPrompt: prompt,
      playerContext: {
        progressionLevel: playerLevel,
        vitals: { health, mana },
        activeBiome,
        depthMeters: depth,
        equippedSkin,
        coins,
      },
      catalogue: {
        enemyArchetypes: ['crawler', 'hopper', 'drone', 'gunner', 'caster', 'sentinel', ...availableTemplates.enemyArchetypes],
        biomes: ['Verdant frontier', 'Rust wastes', 'Crystal depths', ...availableTemplates.biomes],
      },
      templateCatalogue: availableTemplates,
      existingCustomEntities: context?.existingCustomEntities ?? [],
    },
    null,
    2
  );
}

/**
 * Formats and validates the parsed JSON from Parley into the exact structure
 * the GameForge engine expects.
 */
export function formatEnginePayload(
  parsed: unknown,
  gameType: 'platformer' | 'sandbox',
  current?: Record<string, unknown> | GameConfig | WorldSettings
): GameConfig | WorldSettings {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Parley response did not return a valid JSON object.');
  }

  if (gameType === 'platformer') {
    const base = structuredClone(DEFAULT_CONFIG);
    const curr = (current as unknown as Partial<GameConfig>) || {};
    const candidate = {
      ...base,
      ...curr,
      ...(parsed as Partial<GameConfig>),
      movement: {
        ...base.movement,
        ...(curr.movement || {}),
        ...((parsed as Partial<GameConfig>).movement || {}),
      },
      weapon: {
        ...base.weapon,
        ...(curr.weapon || {}),
        ...((parsed as Partial<GameConfig>).weapon || {}),
      },
      enemies: {
        walker: {
          ...base.enemies.walker,
          ...(curr.enemies?.walker || {}),
          ...((parsed as Partial<GameConfig>).enemies?.walker || {}),
        },
        drone: {
          ...base.enemies.drone,
          ...(curr.enemies?.drone || {}),
          ...((parsed as Partial<GameConfig>).enemies?.drone || {}),
        },
        turret: {
          ...base.enemies.turret,
          ...(curr.enemies?.turret || {}),
          ...((parsed as Partial<GameConfig>).enemies?.turret || {}),
        },
      },
      generation: {
        ...base.generation,
        ...(curr.generation || {}),
        ...((parsed as Partial<GameConfig>).generation || {}),
      },
      difficulty: {
        ...base.difficulty,
        ...(curr.difficulty || {}),
        ...((parsed as Partial<GameConfig>).difficulty || {}),
      },
    } as GameConfig;

    validateConfig(candidate);
    return candidate;
  }

  const base = structuredClone(DEFAULT_WORLD);
  const candidate = {
    ...base,
    ...(current as Partial<WorldSettings> | undefined),
    ...(parsed as Partial<WorldSettings>),
  } as WorldSettings;

  if (typeof candidate.roughness === 'number') {
    candidate.roughness = Math.round(Math.max(0.6, Math.min(1.4, candidate.roughness)) * 10) / 10;
  }
  if (typeof candidate.caves === 'number') {
    candidate.caves = Math.round(Math.max(0.6, Math.min(1.4, candidate.caves)) * 10) / 10;
  }
  if (typeof candidate.abundance === 'number') {
    candidate.abundance = Math.round(Math.max(0.6, Math.min(1.4, candidate.abundance)) * 10) / 10;
  }

  validateSettings(candidate);
  return candidate;
}

/**
 * Handles the game-edit request using MIT's Parley API.
 */
export async function handleGameEdit(
  req: GameEditRequest,
  configOverride?: Partial<ParleyConfig>,
  fetchFn: typeof fetch = fetch
): Promise<GameEditResponse> {
  const prompt = req.prompt?.trim();
  if (!prompt) {
    return { ok: false, error: 'Please provide a prompt describing your changes.', statusCode: 400 };
  }

  if (isGenerativePrompt(prompt, req.gameType)) {
    const { handleCreation } = await import('./creatorService');
    return await handleCreation(req, configOverride, fetchFn) as GameEditResponse;
  }
  const config = { ...getParleyConfig(), ...configOverride };

  if (!config.apiKey) {
    return {
      ok: false,
      error: 'PARLEY_API_KEY is not configured in local environment variables or .env file.',
      statusCode: 401,
    };
  }

  const endpoint = `${config.baseUrl}/chat/completions`;
  const isGenerative = isGenerativePrompt(prompt, req.gameType);

  let systemPrompt: string;
  let userPayload: string;

  if (isGenerative) {
    systemPrompt = buildMasterGameDesignerPrompt();
    userPayload = buildContextPayload(prompt, req.context, req.currentState);
  } else {
    const gameType = req.gameType === 'platformer' ? 'platformer' : 'sandbox';
    systemPrompt = buildSystemPrompt(gameType);
    userPayload = JSON.stringify({
      instruction: prompt,
      currentState: req.currentState || (gameType === 'platformer' ? DEFAULT_CONFIG : DEFAULT_WORLD),
    });
  }

  // Explicitly target gpt-6-astra (or configured override) and strict configuration for generative tasks
  const targetModel = config.model || config.reasoningModel || DEFAULT_PARLEY_MODEL;

  const requestBody: Record<string, unknown> = {
    model: targetModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: isGenerative ? `Player Request & Game State:\n${userPayload}` : `Current state & edit prompt:\n${userPayload}` },
    ],
  };

  // GPT-6 Astra is a reasoning model that rejects custom temperature values with a 400 error.
  // Completely omit temperature for gpt-6-astra and other reasoning models.
  // Never send legacy token parameters like max_tokens (use max_completion_tokens if limiting).
  if (!isReasoningModel(targetModel)) {
    requestBody.temperature = isGenerative ? 0.2 : 0.7;
  }

  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Failed to connect to Parley API: ${message}`,
      statusCode: 502,
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      error: 'Parley API rate limit reached. Please wait a moment and try again.',
      statusCode: 429,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: 'Parley API authentication failed. Verify that your PARLEY_API_KEY is valid.',
      statusCode: 401,
    };
  }

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json() as { error?: { message?: string } | string; message?: string };
      if (typeof errJson.error === 'string') {
        errorDetail = errJson.error;
      } else if (errJson.error?.message) {
        errorDetail = errJson.error.message;
      } else if (errJson.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // Ignore JSON parse error on error body
    }
    return {
      ok: false,
      error: `Parley API error (${response.status}): ${errorDetail}`,
      statusCode: response.status,
    };
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    return {
      ok: false,
      error: `Failed to parse Parley API JSON response: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 502,
    };
  }

  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      ok: false,
      error: 'Parley API returned an empty or unexpected completion format.',
      statusCode: 502,
    };
  }

  let parsed: unknown;
  try {
    const jsonStr = extractJsonString(rawContent);
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    return {
      ok: false,
      error: `Parley model output could not be parsed as JSON: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 422,
    };
  }

  // Standard platformer/sandbox settings path
  const gameType = req.gameType === 'platformer' ? 'platformer' : 'sandbox';
  try {
    const formatted = formatEnginePayload(parsed, gameType, req.currentState);
    return {
      ok: true,
      data: formatted,
      message: `Successfully applied game edits with model ${config.model}.`,
      statusCode: 200,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Engine validation error: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 422,
    };
  }
}
