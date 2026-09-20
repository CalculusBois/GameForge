import { validateConfig, type GameConfig } from './config';
/** Future provider adapters return data only. Never accept or evaluate source code. */
export interface GameConfigProvider {
    generate(prompt: string, current?: GameConfig): Promise<unknown>;
}
/** Runtime gate for the future server response. There is intentionally no provider configured. */
export function approveGeneratedConfig(value: unknown): GameConfig {
    if (!value || typeof value !== 'object')
        throw new Error('Expected a game configuration');
    const candidate = structuredClone(value) as GameConfig;
    try {
        validateConfig(candidate);
    }
    catch {
        throw new Error('The generated configuration is unsupported');
    }
    // Only engine-approved fields enter the runtime; extra model fields are ignored.
    return { theme: candidate.theme, palette: candidate.palette, movement: candidate.movement,
        weapon: candidate.weapon, enemies: candidate.enemies, generation: candidate.generation,
        difficulty: candidate.difficulty, objective: candidate.objective, shake: candidate.shake };
}

/** MIT Parley API provider adapter connecting to internal /api/edit-game route */
export class ParleyGameConfigProvider implements GameConfigProvider {
    async generate(prompt: string, current?: GameConfig): Promise<GameConfig> {
        const res = await fetch('/api/edit-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, currentState: current, gameType: 'platformer' }),
        });
        const result = await res.json();
        if (!result.ok) {
            throw new Error(result.error || 'Parley API request failed.');
        }
        return approveGeneratedConfig(result.data);
    }
}

