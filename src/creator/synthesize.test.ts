import { describe, it, expect } from 'vitest';
import { synthesizeCreation } from './synthesize';

describe('offline Forge synthesizer', () => {
  it('builds a brick-throwing boss from a natural-language prompt', () => {
    const spec = synthesizeCreation('Create a boss that throws bricks');
    expect(spec.entityType).toBe('boss');
    expect(spec.attacks[0]!.projectile.shape.kind).toBe('rect');
    expect(spec.attacks[0]!.projectile.shape.color).toBe('#c47a3a');
    expect(spec.visuals[0]!.shape.kind).toBe('rect');
    expect(spec.visuals[0]!.shape.layers?.length).toBeGreaterThan(0);
    expect(spec.visuals.some(v => v.count >= 6)).toBe(true);
    const fire = synthesizeCreation('Create a fire boss called Cinder Crown');
    expect(fire.name).toBe('Cinder Crown');
    expect(fire.visuals[0]!.shape.kind).toBe('polygon');
    expect(fire.visuals[0]!.shape.layers?.length).toBeGreaterThan(0);
    expect(fire.attacks[0]!.projectile.shape.kind).toBe('ellipse');
    expect(spec.graph.rules.some(r => r.actions.some(a => a.type === 'fire'))).toBe(true);
  });
});
