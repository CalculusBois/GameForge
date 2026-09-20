export const MOVEMENT = { gravity: 1500, acceleration: 2100, deceleration: 2600, speed: 290, jump: 580, maxFall: 750, coyoteMs: 100, bufferMs: 120, doubleJump: false };
export type EnemyKind = 'walker' | 'drone' | 'turret';
export interface GameConfig {
    theme: string;
    palette: 'cyan' | 'amber' | 'violet';
    movement: typeof MOVEMENT;
    weapon: {
        cooldown: number;
        speed: number;
        lifetime: number;
        cap: number;
        damage: number;
    };
    enemies: Record<EnemyKind, {
        health: number;
        speed: number;
        damage: number;
        interval: number;
        range: number;
    }>;
    generation: {
        seed: string;
        mode: 'demo' | 'endless';
        demoRooms: number;
    };
    difficulty: {
        speedCap: number;
        densityCap: number;
    };
    objective: string;
    shake: boolean;
}
export const DEFAULT_CONFIG: GameConfig = {
    theme: 'Asterion / abandoned orbital vault', palette: 'cyan', movement: MOVEMENT,
    weapon: { cooldown: 180, speed: 720, lifetime: 1000, cap: 18, damage: 1 },
    enemies: { walker: { health: 3, speed: 65, damage: 15, interval: 1500, range: 300 }, drone: { health: 2, speed: 85, damage: 12, interval: 1800, range: 270 }, turret: { health: 4, speed: 0, damage: 18, interval: 2100, range: 460 } },
    generation: { seed: 'ASTRA-01', mode: 'demo', demoRooms: 6 }, difficulty: { speedCap: 130, densityCap: 5 }, objective: 'Collect the core and reach the exit', shake: true,
};
export function validateConfig(c: GameConfig): void {
    if (!c || typeof c !== 'object' || !c.generation || !c.movement || !c.weapon || !c.enemies || !c.difficulty)
        throw new Error('Incomplete game configuration');
    if (typeof c.theme !== 'string' || typeof c.objective !== 'string' || typeof c.shake !== 'boolean' || !['cyan', 'amber', 'violet'].includes(c.palette))
        throw new Error('Invalid appearance');
    if (!['demo', 'endless'].includes(c.generation.mode) || typeof c.generation.seed !== 'string' || !c.generation.seed.trim() || c.generation.seed.length > 80)
        throw new Error('Invalid generation settings');
    for (const key of Object.keys(MOVEMENT) as (keyof typeof MOVEMENT)[]) {
        const value = c.movement[key];
        if (key === 'doubleJump') {
            if (typeof value !== 'boolean')
                throw new Error('Invalid double jump');
        }
        else if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
            throw new Error('Invalid movement setting');
    }
    const m = c.movement;
    if (m.speed > 400 || m.speed < 200 || m.jump < 500 || m.jump > 700 || m.gravity < 1200 || m.gravity > 1800 || m.acceleration < 1500 || m.acceleration > 4000 || m.maxFall > 900 || m.bufferMs > 200 || m.coyoteMs > 150)
        throw new Error('Movement outside validated limits');
    for (const key of ['cooldown', 'speed', 'lifetime', 'cap', 'damage'] as const)
        if (!Number.isFinite(c.weapon[key]) || c.weapon[key] <= 0)
            throw new Error('Invalid weapon');
    if (c.weapon.cap > 40 || !Number.isInteger(c.weapon.cap) || c.weapon.speed > 1000 || c.weapon.lifetime > 3000 || c.weapon.cooldown < 80)
        throw new Error('Weapon exceeds limits');
    for (const kind of ['walker', 'drone', 'turret'] as const) {
        const enemy = c.enemies[kind];
        if (!enemy)
            throw new Error('Missing enemy type');
        for (const key of ['health', 'speed', 'damage', 'interval', 'range'] as const) {
            const value = enemy[key];
            if (!Number.isFinite(value) || value < 0 || (key !== 'speed' && value === 0))
                throw new Error('Invalid enemy');
        }
        if (enemy.speed > 180 || enemy.interval < 600 || enemy.range > 600 || enemy.damage > 50)
            throw new Error('Enemy exceeds supported limits');
    }
    if (!Number.isInteger(c.difficulty.densityCap) || c.difficulty.densityCap > 8 || c.difficulty.densityCap < 1 || !Number.isFinite(c.difficulty.speedCap) || c.difficulty.speedCap > 180 || c.difficulty.speedCap < 0 || !Number.isInteger(c.generation.demoRooms) || c.generation.demoRooms < 1 || c.generation.demoRooms > 100)
        throw new Error('Invalid difficulty');
}
