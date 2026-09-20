import fs from 'node:fs';
import path from 'node:path';
import type { GenerativeEntity, EnemyEntity, BiomeEntity, WeaponEntity, MechanicEntity } from './entitySchemas';

declare const process: {
  cwd: () => string;
};

export interface RegistryEntry {
  id: string;
  name: string;
  entityType: 'boss' | 'enemy' | 'biome' | 'weapon' | 'mechanic';
  filePath: string;
  texturePath?: string;
  createdAt: string;
  summary: string;
}

export interface RegistryData {
  version: string;
  lastUpdated: string;
  entities: RegistryEntry[];
}

/**
 * Resolves the custom directories:
 * - src/custom/entities
 * - src/custom/textures
 * - src/custom/registry.json
 */
export function getCustomPaths(baseDir: string = process.cwd()) {
  const customRoot = path.join(baseDir, 'src', 'custom');
  const entitiesDir = path.join(customRoot, 'entities');
  const texturesDir = path.join(customRoot, 'textures');
  const registryFile = path.join(customRoot, 'registry.json');

  return {
    customRoot,
    entitiesDir,
    texturesDir,
    registryFile,
  };
}

/**
 * Generates an SVG vector texture representing the generative entity.
 */
export function generateSvgTexture(entity: GenerativeEntity, entityType: string): string {
  if (entityType === 'boss' || entityType === 'enemy') {
    const foe = entity as EnemyEntity;
    const w = foe.hitbox?.width || (foe.category === 'boss' ? 64 : 32);
    const h = foe.hitbox?.height || (foe.category === 'boss' ? 64 : 32);
    const p = foe.textureTheme?.primaryColor || '#e5484d';
    const s = foe.textureTheme?.secondaryColor || '#ff977d';
    const a = foe.textureTheme?.accentColor || '#ffd386';
    const shape = foe.textureTheme?.shape || 'mech';

    let shapeSvg = '';
    switch (shape) {
      case 'dragon':
        shapeSvg = `
  <!-- Dragon Wings -->
  <path d="M ${w * 0.1} ${h * 0.4} Q ${w * 0.3} ${h * 0.1}, ${w * 0.5} ${h * 0.35} Q ${w * 0.7} ${h * 0.1}, ${w * 0.9} ${h * 0.4} L ${w * 0.6} ${h * 0.6} Z" fill="${s}" opacity="0.85"/>
  <!-- Dragon Body & Head -->
  <polygon points="${w * 0.5},${h * 0.1} ${w * 0.35},${h * 0.4} ${w * 0.4},${h * 0.85} ${w * 0.6},${h * 0.85} ${w * 0.65},${h * 0.4}" fill="${p}"/>
  <!-- Horns & Core -->
  <circle cx="${w * 0.45}" cy="${h * 0.3}" r="${w * 0.05}" fill="${a}"/>
  <circle cx="${w * 0.55}" cy="${h * 0.3}" r="${w * 0.05}" fill="${a}"/>
  <polygon points="${w * 0.4},${h * 0.18} ${w * 0.35},${h * 0.05} ${w * 0.45},${h * 0.15}" fill="${a}"/>
  <polygon points="${w * 0.6},${h * 0.18} ${w * 0.65},${h * 0.05} ${w * 0.55},${h * 0.15}" fill="${a}"/>`;
        break;
      case 'beast':
        shapeSvg = `
  <!-- Beast Silhouette -->
  <ellipse cx="${w * 0.5}" cy="${h * 0.55}" rx="${w * 0.4}" ry="${h * 0.3}" fill="${p}"/>
  <!-- Fangs & Eyes -->
  <polygon points="${w * 0.3},${h * 0.25} ${w * 0.35},${h * 0.4} ${w * 0.25},${h * 0.4}" fill="${s}"/>
  <polygon points="${w * 0.7},${h * 0.25} ${w * 0.75},${h * 0.4} ${w * 0.65},${h * 0.4}" fill="${s}"/>
  <circle cx="${w * 0.4}" cy="${h * 0.45}" r="${w * 0.06}" fill="${a}"/>
  <circle cx="${w * 0.6}" cy="${h * 0.45}" r="${w * 0.06}" fill="${a}"/>
  <!-- Claws -->
  <rect x="${w * 0.2}" y="${h * 0.8}" width="${w * 0.12}" height="${h * 0.15}" rx="2" fill="${s}"/>
  <rect x="${w * 0.68}" y="${h * 0.8}" width="${w * 0.12}" height="${h * 0.15}" rx="2" fill="${s}"/>`;
        break;
      case 'crystal':
        shapeSvg = `
  <!-- Crystal Form -->
  <polygon points="${w * 0.5},${h * 0.05} ${w * 0.8},${h * 0.45} ${w * 0.65},${h * 0.9} ${w * 0.35},${h * 0.9} ${w * 0.2},${h * 0.45}" fill="${p}"/>
  <polygon points="${w * 0.5},${h * 0.05} ${w * 0.65},${h * 0.45} ${w * 0.5},${h * 0.8} ${w * 0.35},${h * 0.45}" fill="${s}"/>
  <line x1="${w * 0.5}" y1="${h * 0.05}" x2="${w * 0.5}" y2="${h * 0.8}" stroke="${a}" stroke-width="2"/>`;
        break;
      case 'humanoid':
        shapeSvg = `
  <!-- Armored Silhouette -->
  <circle cx="${w * 0.5}" cy="${h * 0.22}" r="${w * 0.16}" fill="${s}"/>
  <rect x="${w * 0.35}" y="${h * 0.36}" width="${w * 0.3}" height="${h * 0.35}" rx="3" fill="${p}"/>
  <rect x="${w * 0.38}" y="${h * 0.72}" width="${w * 0.1}" height="${h * 0.25}" fill="${s}"/>
  <rect x="${w * 0.52}" y="${h * 0.72}" width="${w * 0.1}" height="${h * 0.25}" fill="${s}"/>
  <circle cx="${w * 0.5}" cy="${h * 0.22}" r="${w * 0.06}" fill="${a}"/>`;
        break;
      case 'mech':
      default:
        shapeSvg = `
  <!-- Mech Chassis -->
  <rect x="${w * 0.15}" y="${h * 0.15}" width="${w * 0.7}" height="${h * 0.65}" rx="4" fill="${p}"/>
  <rect x="${w * 0.25}" y="${h * 0.25}" width="${w * 0.5}" height="${h * 0.2}" fill="${s}"/>
  <!-- Core Eye & Panels -->
  <circle cx="${w * 0.5}" cy="${h * 0.35}" r="${w * 0.1}" fill="${a}"/>
  <rect x="${w * 0.22}" y="${h * 0.55}" width="${w * 0.2}" height="${h * 0.15}" fill="${s}"/>
  <rect x="${w * 0.58}" y="${h * 0.55}" width="${w * 0.2}" height="${h * 0.15}" fill="${s}"/>
  <rect x="${w * 0.2}" y="${h * 0.8}" width="${w * 0.15}" height="${h * 0.18}" fill="${p}"/>
  <rect x="${w * 0.65}" y="${h * 0.8}" width="${w * 0.15}" height="${h * 0.18}" fill="${p}"/>`;
        break;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <title>${foe.name}</title>
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <g filter="url(#glow)">
    ${shapeSvg.trim()}
  </g>
</svg>`;
  }

  if (entityType === 'biome') {
    const biome = entity as BiomeEntity;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <title>${biome.name}</title>
  <rect width="128" height="128" fill="${biome.skyColor}" />
  <!-- Distant Terrain / Stones -->
  <polygon points="0,70 30,50 65,72 95,45 128,68 128,128 0,128" fill="${biome.stoneColor}" opacity="0.8"/>
  <!-- Foreground Ground & Walls -->
  <polygon points="0,85 40,78 80,90 128,82 128,128 0,128" fill="${biome.groundColor}" />
  <rect x="0" y="105" width="128" height="23" fill="${biome.wallColor}" />
  <circle cx="64" cy="30" r="12" fill="#fff" opacity="0.3"/>
</svg>`;
  }

  if (entityType === 'weapon') {
    const weapon = entity as WeaponEntity;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <title>${weapon.name}</title>
  <rect x="10" y="26" width="36" height="12" rx="2" fill="#334155"/>
  <rect x="42" y="29" width="14" height="6" fill="${weapon.projectileColor}"/>
  <rect x="16" y="38" width="8" height="16" rx="2" fill="#1e293b"/>
  <circle cx="56" cy="32" r="5" fill="${weapon.projectileColor}" opacity="0.9"/>
</svg>`;
  }

  // Mechanic entity
  const mechanic = entity as MechanicEntity;
  const strokeColor = mechanic.doubleJump ? '#38bdf8' : '#a855f7';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <title>${mechanic.name}</title>
  <circle cx="32" cy="32" r="28" fill="#1e293b" stroke="${strokeColor}" stroke-width="2"/>
  <!-- Physics Tuning Vectors (${mechanic.name}) -->
  <line x1="32" y1="48" x2="32" y2="16" stroke="#f43f5e" stroke-width="3"/>
  <line x1="16" y1="32" x2="48" y2="32" stroke="#34d399" stroke-width="3"/>
  <circle cx="32" cy="32" r="6" fill="#facc15"/>
</svg>`;
}

/**
 * Saves the entity JSON configuration to `src/custom/entities/<id>.json`.
 */
export function saveCustomEntity(entity: GenerativeEntity, baseDir?: string): { jsonPath: string; id: string } {
  const { entitiesDir } = getCustomPaths(baseDir);
  if (!fs.existsSync(entitiesDir)) {
    fs.mkdirSync(entitiesDir, { recursive: true });
  }

  const filePath = path.join(entitiesDir, `${entity.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(entity, null, 2), 'utf-8');

  return { jsonPath: filePath, id: entity.id };
}

/**
 * Generates an SVG texture in `src/custom/textures/<id>.svg`.
 */
export function generateTextureFile(
  entity: GenerativeEntity,
  entityType: string,
  baseDir?: string
): { svgPath: string } {
  const { texturesDir } = getCustomPaths(baseDir);
  if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir, { recursive: true });
  }

  const svgContent = generateSvgTexture(entity, entityType);
  const filePath = path.join(texturesDir, `${entity.id}.svg`);
  fs.writeFileSync(filePath, svgContent, 'utf-8');

  return { svgPath: filePath };
}

/**
 * Loads the current registry from `src/custom/registry.json`.
 */
export function loadRegistry(baseDir?: string): RegistryData {
  const { registryFile } = getCustomPaths(baseDir);
  if (!fs.existsSync(registryFile)) {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entities: [],
    };
  }

  try {
    const raw = fs.readFileSync(registryFile, 'utf-8');
    return JSON.parse(raw) as RegistryData;
  } catch {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entities: [],
    };
  }
}

/**
 * Updates `src/custom/registry.json` with the new or updated entity.
 */
export function updateRegistry(
  entity: GenerativeEntity,
  entityType: 'boss' | 'enemy' | 'biome' | 'weapon' | 'mechanic',
  explanation: string,
  baseDir?: string
): RegistryData {
  const { customRoot, registryFile } = getCustomPaths(baseDir);
  if (!fs.existsSync(customRoot)) {
    fs.mkdirSync(customRoot, { recursive: true });
  }

  const registry = loadRegistry(baseDir);
  const jsonRelPath = `src/custom/entities/${entity.id}.json`;
  const textureRelPath = `src/custom/textures/${entity.id}.svg`;

  const newEntry: RegistryEntry = {
    id: entity.id,
    name: entity.name,
    entityType,
    filePath: jsonRelPath,
    texturePath: textureRelPath,
    createdAt: new Date().toISOString(),
    summary: explanation || `Generated ${entityType} "${entity.name}".`,
  };

  const existingIdx = registry.entities.findIndex(e => e.id === entity.id);
  if (existingIdx >= 0) {
    registry.entities[existingIdx] = newEntry;
  } else {
    registry.entities.push(newEntry);
  }

  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2), 'utf-8');

  return registry;
}
