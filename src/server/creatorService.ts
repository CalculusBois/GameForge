import { getParleyConfig, isReasoningModel, extractJsonString, type ParleyConfig } from './parleyService';
import { validateSpec } from '../creator/spec';
import { exampleSpec } from '../creator/example';
import { synthesizeCreation } from '../creator/synthesize';

export const creatorPrompt = `You build playable content for GameForge by returning ONE JSON CreationSpec, never JavaScript or external assets. Invent original layered procedural art and bounded gameplay graphs. Do not choose an existing enemy template. Every key in the example is required; no extra keys.
Units: pixels, milliseconds, radians, radians/second, pixels/second. Shapes are oriented UP at rotation 0; sword is a detailed blade/guard/grip silhouette. Shape kinds sword, polygon (3–24 normalized [-1,1] point pairs), ellipse, rect. Every shape optionally accepts layers:[{points:[[x,y],...],color:"#RRGGBB"}] (max8 nonrecursive polygon overlays,3–24 points each). Use these for flames on sword projectiles, runes and trim. Use layers and arbitrary polygons for original silhouettes, attached weapons, flames, wings. Components: 1–12 copies, radius 0–150, orbitSpeed +/-8, spin +/-12, x/y +/-150, width/height 4–160, contact damage 0–80, cooldown >=500. Maximum 16 components /32 instances. Orbit stays attached to a moving entity. Visual contact uses oriented bounds. Zero radius means attached component.
Entity types boss, enemy, mechanic. For a mechanic use visuals:[] and attacks:[] if it only defines statuses. Movement modes hover, pursuit, charge, stationary, speed 0–300, distance 60–400. Flying movement ignores gravity, steers around blocked space; Charge commits its heading toward the player when activated; use another move action after a timer to recover. Ground walking/terrain generation/inventory weapons/player stat changes are not supported. Be explicit about limits.
Attacks max 8: windup 400–5000; projectile speed 40–400, turnRate 0–2.5 (bounded homing; zero straight), lifetime 300–8000, damage 0–100, count 1–12, spread 0–6.28, burst 1–6, burstInterval 100–3000, orbitRadius 0–160, orbitSpeed +/-8, status null or status id. Projectiles use their own shape, rotate to travel, and collide with terrain. Graph fire actions queue a visible windup. Simultaneous projectiles capped at 96 across the session; 8 creations. Avoid budgets that intentionally truncate requested patterns.
Graph: max 8 states,32 rules,8 actions/rule. initial must be a state. Events timer, healthBelow, enter; rule state required; interval 500–30000; threshold 0–1 fraction of HP; once boolean. Actions exactly {type:'fire',attack:id}, {type:'state',state:id}, {type:'move',mode,speed}, {type:'orbit',speed}. No loops/recursion; transitions execute on next tick. Timers use active play time and reset on state entry. HealthBelow is normally once:true. Put attack cadence rules in every phase.
Statuses max 8, exact keys: id,label,color (#RRGGBB),icon (1–8 characters),sources (attack IDs in this spec and/or enemy-contact,enemy-projectile,generated-contact),amount (1–100),maximum (1–1000),decayDelay (0–30000),decayRate (.1–100 per second),duration (500–30000),damage (1–50),damageInterval (500–10000),resetOnActivation boolean,refresh ('refresh'|'ignore'),stacking:'none',death:'clear',respawn:'clear'. Each accepted damaging hit contributes once; damage-over-time never adds buildup. Meter appears on buildup/effect, disappears at zero and on removal. Label/color/icon define temporary HUD. No permanent stat changes.
Stats health 10–5000, contactDamage 0–100, contactCooldown 500–10000. Spawn distance 260–600, grace 1500–10000; runtime finds free space and rejects unsafe placement. Removal defeat-or-manual; lifetime world (saved on the active world). IDs lowercase-kebab-case max48 chars; name max80. Summary max1000.
Extract ALL explicit user requirements as requirements:[{text,supported,evidence,limitation}]. Evidence is one or more dot paths into executable fields (e.g. visuals.1.count, attacks.0.projectile.turnRate). For unsupported requests set supported:false and explain the specific limitation. NEVER silently substitute. Requirements are checked before application. Preserve every existing requirement on edits unless the user changes it. The full previous spec is supplied for edits; return a complete replacement with same id, not a patch. Respect requested counts exactly. Include requested timers, phases, HUD and effects.
If the user asks for a boss that throws bricks, the projectiles MUST be brown rectangular bricks and orbiting visual parts should look like bricks. Match the requested attack literally.
Example for schema structure (invent a different design matching the user, do not reuse this silhouette by default):\n${JSON.stringify(exampleSpec)}`;

interface ChatProvider {
  name: string;
  url: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

function env(name: string) {
  return (typeof process !== 'undefined' ? process.env[name] : undefined)?.trim() || '';
}

export function listForgeProviders(override?: Partial<ParleyConfig>): ChatProvider[] {
  const config = { ...getParleyConfig(), ...override };
  if (override) {
    if (!config.apiKey) return [];
    return [{ name: 'configured', url: `${config.baseUrl.replace(/\/$/, '')}/chat/completions`, model: config.model, apiKey: config.apiKey, timeoutMs: 120000 }];
  }
  const out: ChatProvider[] = [];
  const groq = env('GROQ_API_KEY');
  if (groq) out.push({ name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: env('GROQ_MODEL') || 'llama-3.3-70b-versatile', apiKey: groq, timeoutMs: 25000 });
  const openai = env('OPENAI_API_KEY');
  if (openai) out.push({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', model: env('OPENAI_MODEL') || 'gpt-4o-mini', apiKey: openai, timeoutMs: 45000 });
  out.push({ name: 'pollinations', url: 'https://text.pollinations.ai/openai', model: 'openai', timeoutMs: 12000 });
  if (config.apiKey) out.push({ name: 'parley', url: `${config.baseUrl.replace(/\/$/, '')}/chat/completions`, model: config.model, apiKey: config.apiKey, timeoutMs: 120000 });
  return out;
}

async function completeFromProvider(
  provider: ChatProvider,
  messages: { role: string; content: string }[],
  fetchFn: typeof fetch,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
  const body: Record<string, unknown> = { model: provider.model, messages };
  if (provider.name !== 'pollinations' && !isReasoningModel(provider.model)) body.temperature = 0.3;
  if (provider.name === 'pollinations') body.jsonMode = true;
  const res = await fetchFn(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(provider.timeoutMs),
  });
  if (!res.ok) throw Error(`${provider.name} HTTP ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? data?.content;
  if (typeof content !== 'string' || !content.trim()) throw Error(`${provider.name} returned an empty response`);
  return content;
}

export async function handleCreation(body: unknown, override?: Partial<ParleyConfig>, fetchFn: typeof fetch = fetch) {
  try {
    if (!body || typeof body !== 'object') throw Error('Expected request object');
    const req = body as { prompt?: unknown; previous?: unknown };
    if (typeof req.prompt !== 'string' || !req.prompt.trim() || req.prompt.length > 6000)
      return { ok: false, statusCode: 400, error: 'Prompt must contain 1–6000 characters.' };
    const previous = req.previous == null ? undefined : validateSpec(req.previous);
    const messages = [
      { role: 'system', content: creatorPrompt },
      { role: 'user', content: JSON.stringify({ prompt: req.prompt, previous }) },
    ];
    const providers = listForgeProviders(override);
    let lastError = '';
    let sawUnmet = false;
    for (const provider of providers) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const content = await completeFromProvider(provider, messages, fetchFn);
          try {
            const spec = validateSpec(JSON.parse(extractJsonString(content)));
            if (previous && spec.id !== previous.id) throw Error('Follow-up must preserve the selected creation ID');
            return { ok: true as const, statusCode: 200, data: spec, provider: provider.name };
          } catch (e) {
            lastError = e instanceof Error ? e.message : 'Invalid specification';
            if (lastError.startsWith('Unmet requirement:')) sawUnmet = true;
            messages.push(
              { role: 'assistant', content },
              { role: 'user', content: `Validation failed: ${lastError}. Correct the full spec without dropping any explicit requirement. If unsupported, explain that limitation in requirements.` },
            );
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : `${provider.name} failed`;
          break;
        }
      }
      if (sawUnmet) break;
    }
    if (sawUnmet) return { ok: false as const, statusCode: 422, error: lastError };
    if (!override) {
      try {
        const spec = synthesizeCreation(req.prompt, previous);
        return { ok: true as const, statusCode: 200, data: spec, provider: 'local' };
      } catch (e) {
        lastError = e instanceof Error ? e.message : lastError;
      }
    }
    return { ok: false as const, statusCode: lastError.includes('credentials') || lastError.includes('401') ? 401 : 422, error: lastError || 'Creation failed; no changes applied.' };
  } catch (e) {
    return { ok: false as const, statusCode: 422, error: e instanceof Error ? e.message : 'Creation failed; no changes applied.' };
  }
}

export const FORGE_PROVIDER_LABELS: Record<string, string> = {
  groq: 'Groq',
  openai: 'OpenAI ChatGPT',
  pollinations: 'Pollinations',
  parley: 'MIT Parley',
  local: 'local synthesizer',
  configured: 'configured API',
};

export function describeForgeHealth() {
  const providers = listForgeProviders();
  const named = providers.map(p => p.name);
  const chain = [...named, 'local'];
  const primary = named[0] || 'local';
  return {
    ok: true,
    hasKey: named.some(n => n !== 'pollinations'),
    hasParley: named.includes('parley'),
    primary,
    primaryLabel: FORGE_PROVIDER_LABELS[primary] || primary,
    providers: chain,
    labels: chain.map(n => FORGE_PROVIDER_LABELS[n] || n),
    order: chain.map(n => FORGE_PROVIDER_LABELS[n] || n).join(' → '),
    model: providers[0]?.model || 'local-synthesizer',
    independent: true,
  };
}
