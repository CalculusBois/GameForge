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
// No AI provider is configured. Future enemy/weapon tuning must pass dedicated
// bounded validators before being offered as a live-world change.
