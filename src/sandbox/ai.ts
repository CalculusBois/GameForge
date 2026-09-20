import { validateSettings, type WorldSettings } from './model';
/** Future provider boundary: structured supported settings only; never executable code. */
export interface WorldCreationProvider {
    proposeWorld(prompt: string): Promise<unknown>;
}
export function approveWorldProposal(value: unknown): WorldSettings {
    const candidate = value as WorldSettings;
    try {
        validateSettings(candidate);
    }
    catch {
        throw new Error('The proposed world settings are unsupported.');
    }
    return { seed: candidate.seed, difficulty: candidate.difficulty, roughness: candidate.roughness, caves: candidate.caves, abundance: candidate.abundance };
}
export const CHANGE_POLICY = {
    requiresNewWorld: ['seed', 'roughness', 'caves', 'abundance', 'generatorVersion'],
    presentationOnly: ['cameraShake', 'performanceOverlay', 'equippedOwnedSkin'],
} as const;

/** MIT Parley API provider adapter connecting to internal /api/edit-game route */
export class ParleyWorldCreationProvider implements WorldCreationProvider {
    async proposeWorld(prompt: string, current?: WorldSettings): Promise<WorldSettings> {
        const res = await fetch('/api/edit-game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, currentState: current, gameType: 'sandbox' }),
        });
        const result = await res.json();
        if (!result.ok) {
            throw new Error(result.error || 'Parley API request failed.');
        }
        return approveWorldProposal(result.data);
    }
}

