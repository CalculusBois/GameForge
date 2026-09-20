import { validateSpec, type CreationSpec, type Shape } from './spec';

function slug(text: string) {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return /^[a-z]/.test(s) ? s : `forged-${s || 'entity'}`;
}

function titleFrom(prompt: string) {
  const text = prompt.toLowerCase();
  if (/brick/.test(text) && /throw|hurl|lob|toss/.test(text)) return 'Brick Barrage Titan';
  if (/sword/.test(text) && /orbit|spin|circle/.test(text)) return 'Orbiting Blade Host';
  if (/fire|ember|flame|cinder|magma/.test(text)) return 'Cinder Crown';
  if (/ice|frost|glacier/.test(text)) return 'Rime Hurler';
  const words = prompt
    .replace(/create|make|please|a |an |the |that |which |with |to /gi, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (!words.length) return 'Forged Pursuer';
  return words.map(w => w[0]!.toUpperCase() + w.slice(1).toLowerCase()).join(' ').slice(0, 80);
}

function projectileFor(prompt: string): Shape {
  const text = prompt.toLowerCase();
  if (/brick|block|stone|rock/.test(text))
    return {
      kind: 'rect', color: '#c47a3a', accent: '#5d4037', width: 18, height: 12, points: [],
      layers: [
        { color: '#d08948', points: [[-1, -1], [1, -1], [1, -0.08], [-1, -0.08]] },
        { color: '#a65c28', points: [[-1, 0.12], [1, 0.12], [1, 1], [-1, 1]] },
      ],
    };
  if (/sword|blade|saber/.test(text))
    return { kind: 'sword', color: '#d8f7ff', accent: '#90caf9', width: 28, height: 12, points: [] };
  if (/fire|ember|flame|magma/.test(text))
    return {
      kind: 'ellipse', color: '#ff6b3a', accent: '#ffd180', width: 16, height: 22, points: [],
      layers: [
        { color: '#ffb74d', points: [[0, -0.7], [0.32, -0.1], [0, 0.55], [-0.32, -0.1]] },
        { color: '#fff4c2', points: [[0, -0.82], [0.12, -0.35], [0, -0.08], [-0.12, -0.35]] },
      ],
    };
  if (/ice|frost|crystal/.test(text))
    return { kind: 'polygon', color: '#a0dfff', accent: '#e8f7ff', width: 14, height: 22, points: [[0, -1], [0.7, 0], [0, 1], [-0.7, 0]] };
  if (/arrow|dart|spike/.test(text))
    return { kind: 'polygon', color: '#cfd8dc', accent: '#90a4ae', width: 10, height: 22, points: [[0, -1], [0.45, 0.2], [0, 1], [-0.45, 0.2]] };
  return { kind: 'rect', color: '#ffb74d', accent: '#ef6c00', width: 14, height: 14, points: [] };
}

/** Offline, key-free CreationSpec so "a boss that throws bricks" always produces a matching entity. */
export function synthesizeCreation(prompt: string, previous?: CreationSpec): CreationSpec {
  const text = prompt.toLowerCase();
  const isBoss = /\bboss\b|titan|guardian|king|empress|colossus|pursuer/.test(text) || !/\benemy\b/.test(text);
  const flying = /fly|hover|wing|air|sky|float/.test(text);
  const brick = /brick|block|stone/.test(text);
  const fire = /fire|ember|flame|cinder|magma/.test(text);
  const shot = projectileFor(prompt);
  const crest: number[][] = [[0, -1], [0.34, -0.78], [0.78, -0.22], [0.58, 0.48], [0, 1], [-0.58, 0.48], [-0.78, -0.22], [-0.34, -0.78]];
  const core: Shape = brick
    ? {
        kind: 'rect', color: '#c47a3a', accent: '#4e342e', width: 56, height: 70, points: [],
        layers: [
          { color: '#e0a060', points: [[-1, -1], [1, -1], [1, -0.36], [-1, -0.36]] },
          { color: '#a65c28', points: [[-1, -0.28], [1, -0.28], [1, 0.32], [-1, 0.32]] },
          { color: '#d08948', points: [[-1, 0.4], [1, 0.4], [1, 1], [-1, 1]] },
        ],
      }
    : fire
    ? {
        kind: 'polygon', color: '#2a1638', accent: '#ff6b3a', width: 58, height: 74, points: crest,
        layers: [
          { color: '#ff6b3a', points: [[0, -0.55], [0.42, -0.08], [0.28, 0.55], [0, 0.78], [-0.28, 0.55], [-0.42, -0.08]] },
          { color: '#ffd180', points: [[0, -0.32], [0.2, 0.05], [0, 0.42], [-0.2, 0.05]] },
        ],
      }
    : { kind: 'polygon', color: '#3d5a6b', accent: '#b9f6ca', width: 52, height: 68, points: crest };
  const orbit: Shape = brick
    ? { kind: 'rect', color: '#c47a3a', accent: '#4e342e', width: 16, height: 12, points: [] }
    : { ...shot, width: Math.min(22, shot.width + 4), height: Math.min(22, shot.height + 4) };
  const id = previous?.id ?? slug(titleFrom(prompt));
  const name = previous?.name ?? titleFrom(prompt);
  const spec: CreationSpec = {
    version: 1,
    id,
    name,
    entityType: isBoss ? 'boss' : 'enemy',
    lifetime: 'world',
    summary: `Forged from "${prompt.trim().slice(0, 180)}". Hunts the player and hurls matching projectiles.`,
    requirements: [
      { text: prompt.trim().slice(0, 500), supported: true, evidence: ['attacks', 'visuals', 'graph'], limitation: '' },
    ],
    visuals: [
      { id: 'core', shape: core, count: 1, radius: 0, orbitSpeed: 0, spin: 0.25, x: 0, y: 0, damage: 12, cooldown: 800 },
      { id: 'orbiters', shape: orbit, count: brick ? 8 : 6, radius: 58, orbitSpeed: 1.6, spin: 1.2, x: 0, y: 0, damage: 8, cooldown: 800 },
    ],
    movement: { mode: flying ? 'hover' : 'pursuit', speed: flying ? 70 : 85, distance: 200 },
    stats: { health: isBoss ? 1400 : 220, contactDamage: 14, contactCooldown: 800 },
    attacks: [
      {
        id: 'volley',
        windup: 700,
        projectile: {
          shape: shot,
          speed: 210,
          turnRate: /homing|track|follow/.test(text) ? 1.2 : 0,
          lifetime: 3200,
          damage: brick ? 16 : 12,
          count: brick ? 3 : 2,
          spread: 0.45,
          burst: 2,
          burstInterval: 160,
          orbitRadius: 0,
          orbitSpeed: 0,
          status: null,
        },
      },
    ],
    graph: {
      initial: 'hunting',
      states: ['hunting', 'enraged'],
      rules: [
        { event: 'timer', state: 'hunting', interval: 1800, threshold: 0, once: false, actions: [{ type: 'fire', attack: 'volley' }] },
        { event: 'healthBelow', state: 'hunting', interval: 500, threshold: 0.45, once: true, actions: [{ type: 'state', state: 'enraged' }, { type: 'move', mode: flying ? 'hover' : 'pursuit', speed: 120 }, { type: 'orbit', speed: 2.8 }] },
        { event: 'timer', state: 'enraged', interval: 1100, threshold: 0, once: false, actions: [{ type: 'fire', attack: 'volley' }] },
      ],
    },
    statuses: [],
    spawn: { distance: 360, grace: 2000 },
    removal: 'defeat-or-manual',
  };
  return validateSpec(spec);
}
