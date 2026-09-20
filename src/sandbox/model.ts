export const SAVE_VERSION = 1;
export const GENERATOR_VERSION = 1;
export const ANALYTICS_VERSION = 1;
export const TILE = 24,
    CHUNK = 32,
    DEPTH = 160,
    WORLD_LIMIT = 120000;
export type Biome = "Verdant frontier" | "Rust wastes" | "Crystal depths";
export type Material = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export interface WorldSettings {
    seed: string;
    difficulty: "explorer" | "standard";
    roughness: number;
    caves: number;
    abundance: number;
}
export const DEFAULT_WORLD: WorldSettings = {
    seed: "LUMEN-01",
    difficulty: "explorer",
    roughness: 1,
    caves: 1,
    abundance: 1,
};
export function validateSettings(s: WorldSettings) {
    if (
        !s ||
        typeof s.seed !== "string" ||
        !s.seed.trim() ||
        s.seed.length > 80 ||
        !["explorer", "standard"].includes(s.difficulty) ||
        ![s.roughness, s.caves, s.abundance].every(
            (v) => Number.isFinite(v) && v >= 0.6 && v <= 1.4,
        )
    )
        throw new Error("Choose a seed and supported world settings.");
}
export type ItemId =
    | "pickaxe"
    | "blaster"
    | "sword"
    | "staff"
    | "drill"
    | "carbine"
    | "dirt"
    | "stone"
    | "wood"
    | "iron"
    | "bar"
    | "scrap"
    | "crystal"
    | "herb"
    | "tonic"
    | "torch"
    | "brick";
export interface Item {
    name: string;
    icon: string;
    stack: number;
    description: string;
    category: "tool" | "weapon" | "resource" | "building" | "consumable";
    value: number;
}
export const ITEMS: Record<ItemId, Item> = {
    pickaxe: {
        name: "Field pickaxe",
        icon: "⛏",
        stack: 1,
        description: "Hold action to mine exposed blocks within 5 tiles.",
        category: "tool",
        value: 0,
    },
    blaster: {
        name: "Pulse blaster",
        icon: "⌁",
        stack: 1,
        description: "Reliable energy shots. No ammunition needed.",
        category: "weapon",
        value: 0,
    },
    sword: {
        name: "Arc sabre",
        icon: "⚔",
        stack: 1,
        description: "Close-range sweep. Each target is struck once.",
        category: "weapon",
        value: 30,
    },
    staff: {
        name: "Prism staff",
        icon: "✦",
        stack: 1,
        description: "Powerful magic bolts. Costs 15 mana.",
        category: "weapon",
        value: 40,
    },
    drill: {
        name: "Resonant pickaxe",
        icon: "⛏",
        stack: 1,
        description: "Mines twice as fast as the field pickaxe.",
        category: "tool",
        value: 40,
    },
    carbine: {
        name: "Coil carbine",
        icon: "⌁",
        stack: 1,
        description: "Faster, stronger pulse shots.",
        category: "weapon",
        value: 40,
    },
    dirt: {
        name: "Soil",
        icon: "▪",
        stack: 99,
        description: "Place to build steps and bridges.",
        category: "building",
        value: 1,
    },
    stone: {
        name: "Stone",
        icon: "◆",
        stack: 99,
        description: "Mine exposed rock. Craft or place as a block.",
        category: "resource",
        value: 2,
    },
    wood: {
        name: "Timber",
        icon: "▥",
        stack: 99,
        description: "Gather from trees with E. Used at the workbench.",
        category: "resource",
        value: 3,
    },
    iron: {
        name: "Iron ore",
        icon: "▰",
        stack: 99,
        description: "Smelt at the base forge.",
        category: "resource",
        value: 4,
    },
    bar: {
        name: "Iron bar",
        icon: "▬",
        stack: 99,
        description: "Refined metal for weapons and tools.",
        category: "resource",
        value: 8,
    },
    scrap: {
        name: "Scrap metal",
        icon: "⚙",
        stack: 99,
        description: "Recovered from wreckage and machines.",
        category: "resource",
        value: 5,
    },
    crystal: {
        name: "Crystal shard",
        icon: "✧",
        stack: 99,
        description: "Found in glowing deposits. Powers magic gear.",
        category: "resource",
        value: 6,
    },
    herb: {
        name: "Healing herb",
        icon: "❧",
        stack: 99,
        description: "Gather plants with E. Brew into field tonic.",
        category: "resource",
        value: 3,
    },
    tonic: {
        name: "Field tonic",
        icon: "✚",
        stack: 20,
        description: "Use from the hotbar to restore 40 health.",
        category: "consumable",
        value: 9,
    },
    torch: {
        name: "Lumen torch",
        icon: "♨",
        stack: 99,
        description:
            "Place on an exposed wall or beside a block to light caves.",
        category: "building",
        value: 2,
    },
    brick: {
        name: "Outpost block",
        icon: "▣",
        stack: 99,
        description: "Crafted reinforced building block.",
        category: "building",
        value: 3,
    },
};
export interface Stack {
    id: ItemId;
    count: number;
}
export type Inventory = (Stack | null)[];
export const count = (inv: Inventory, id: ItemId) =>
    inv.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0);
export function add(inv: Inventory, id: ItemId, amount: number): boolean {
    if (!Number.isInteger(amount) || amount < 1) return false;
    const copy = structuredClone(inv);
    let left = amount;
    for (const s of copy)
        if (s?.id === id) {
            const n = Math.min(ITEMS[id].stack - s.count, left);
            s.count += n;
            left -= n;
        }
    for (let i = 0; i < copy.length && left > 0; i++)
        if (!copy[i]) {
            const n = Math.min(ITEMS[id].stack, left);
            copy[i] = { id, count: n };
            left -= n;
        }
    if (left) return false;
    inv.splice(0, inv.length, ...copy);
    return true;
}
export function remove(inv: Inventory, id: ItemId, amount: number) {
    if (!Number.isInteger(amount) || amount < 1 || count(inv, id) < amount)
        return false;
    for (let i = 0; i < inv.length && amount > 0; i++) {
        const s = inv[i];
        if (s?.id === id) {
            const n = Math.min(s.count, amount);
            s.count -= n;
            amount -= n;
            if (!s.count) inv[i] = null;
        }
    }
    return true;
}
export interface Recipe {
    id: string;
    name: string;
    station: "Workbench" | "Forge";
    ingredients: Partial<Record<ItemId, number>>;
    output: Stack;
}
export const RECIPES: Recipe[] = [
    {
        id: "bar",
        name: "Smelt iron",
        station: "Forge",
        ingredients: { iron: 2 },
        output: { id: "bar", count: 1 },
    },
    {
        id: "sword",
        name: "Arc sabre",
        station: "Workbench",
        ingredients: { bar: 2, wood: 3 },
        output: { id: "sword", count: 1 },
    },
    {
        id: "staff",
        name: "Prism staff",
        station: "Workbench",
        ingredients: { crystal: 4, wood: 4 },
        output: { id: "staff", count: 1 },
    },
    {
        id: "drill",
        name: "Resonant pickaxe",
        station: "Forge",
        ingredients: { bar: 3, scrap: 3 },
        output: { id: "drill", count: 1 },
    },
    {
        id: "carbine",
        name: "Coil carbine",
        station: "Forge",
        ingredients: { bar: 2, scrap: 5 },
        output: { id: "carbine", count: 1 },
    },
    {
        id: "tonic",
        name: "Field tonic",
        station: "Workbench",
        ingredients: { herb: 2 },
        output: { id: "tonic", count: 1 },
    },
    {
        id: "torch",
        name: "Lumen torches",
        station: "Workbench",
        ingredients: { wood: 1, crystal: 1 },
        output: { id: "torch", count: 4 },
    },
    {
        id: "brick",
        name: "Outpost blocks",
        station: "Workbench",
        ingredients: { stone: 3 },
        output: { id: "brick", count: 4 },
    },
];
export const SKINS = [
    {
        id: "frontier",
        name: "Frontier explorer",
        description: "Expedition armour and a field visor.",
        price: 0,
        color: "#62dfc3",
        detail: "visor",
    },
    {
        id: "ranger",
        name: "Salvage ranger",
        description: "A broad-brim helmet and salvage pack.",
        price: 60,
        color: "#edb47b",
        detail: "hat",
    },
    {
        id: "wanderer",
        name: "Crystal wanderer",
        description: "A crystal crown and a flowing mantle.",
        price: 90,
        color: "#ad9dff",
        detail: "crown",
    },
    {
        id: "neon",
        name: "Neon technician",
        description: "Antennae, circuit strips, and a power pack.",
        price: 110,
        color: "#7fdfff",
        detail: "antenna",
    },
    {
        id: "knight",
        name: "Void knight",
        description: "Horned armour and a dark shoulder cape.",
        price: 140,
        color: "#e08db4",
        detail: "horns",
    },
    {
        id: "automaton",
        name: "Ancient automaton",
        description: "A square brass head and mechanical limbs.",
        price: 180,
        color: "#e5d58b",
        detail: "robot",
    },
] as const;
export type SkinId = (typeof SKINS)[number]["id"];
export const OBJECTIVES = [
    { id: "stone", name: "Mine 12 stone blocks", total: 12, reward: 40 },
    { id: "kills", name: "Defeat 4 hostile creatures", total: 4, reward: 60 },
    { id: "biome", name: "Discover another biome", total: 1, reward: 40 },
    { id: "chest", name: "Open a treasure chest", total: 1, reward: 45 },
    {
        id: "craft",
        name: "Craft a weapon or upgraded tool",
        total: 1,
        reward: 60,
    },
] as const;
export type ObjectiveId = (typeof OBJECTIVES)[number]["id"];
export type AnalyticsEventType =
    | "session_start"
    | "session_end"
    | "position_sample"
    | "attack_fired"
    | "attack_hit"
    | "damage_taken"
    | "death"
    | "respawn"
    | "mined"
    | "placed"
    | "harvested"
    | "chest_opened"
    | "crafted"
    | "objective_claimed"
    | "skin_unlocked"
    | "item_gained"
    | "item_spent"
    | "coins_changed"
    | "biome_discovered"
    | "recall_started"
    | "recall_completed"
    | "recall_interrupted"
    | "action_failed";
export type AnalyticsValue = string | number | boolean | null;
export interface AnalyticsEvent {
    id: string;
    type: AnalyticsEventType;
    at: number;
    sessionId?: string;
    elapsedMs?: number;
    x?: number;
    y?: number;
    biome?: Biome;
    data: Record<string, AnalyticsValue>;
}
export interface AnalyticsSummary {
    playTimeMs: number;
    sessions: number;
    distance: number;
    maxDepth: number;
    maxDistanceFromBase: number;
    deaths: number;
    respawns: number;
    damageTaken: number;
    damageDealt: number;
    attacks: number;
    hits: number;
    kills: number;
    killsByKind: Record<string, number>;
    mined: number;
    minedByMaterial: Record<string, number>;
    placements: number;
    harvested: number;
    harvestedByKind: Record<string, number>;
    chestsOpened: number;
    craftsByRecipe: Record<string, number>;
    itemsGained: Record<string, number>;
    itemsSpent: Record<string, number>;
    coinsEarned: number;
    coinsSpent: number;
    biomesDiscovered: string[];
    objectivesClaimed: number;
    recallsStarted: number;
    recallsCompleted: number;
    recallsInterrupted: number;
    failures: number;
}
export interface Analytics {
    version: number;
    events: AnalyticsEvent[];
    summary: AnalyticsSummary;
}
const emptyAnalytics = (): Analytics => ({
    version: ANALYTICS_VERSION,
    events: [],
    summary: {
        playTimeMs: 0,
        sessions: 0,
        distance: 0,
        maxDepth: 0,
        maxDistanceFromBase: 0,
        deaths: 0,
        respawns: 0,
        damageTaken: 0,
        damageDealt: 0,
        attacks: 0,
        hits: 0,
        kills: 0,
        killsByKind: {},
        mined: 0,
        minedByMaterial: {},
        placements: 0,
        harvested: 0,
        harvestedByKind: {},
        chestsOpened: 0,
        craftsByRecipe: {},
        itemsGained: {},
        itemsSpent: {},
        coinsEarned: 0,
        coinsSpent: 0,
        biomesDiscovered: [],
        objectivesClaimed: 0,
        recallsStarted: 0,
        recallsCompleted: 0,
        recallsInterrupted: 0,
        failures: 0,
    },
});
export function ensureAnalytics(w: WorldSave) {
    if (!w.analytics) w.analytics = emptyAnalytics();
    return w.analytics;
}
export function recordAnalytics(
    w: WorldSave,
    type: AnalyticsEventType,
    data: Record<string, AnalyticsValue> = {},
    context: {
        sessionId?: string;
        elapsedMs?: number;
        x?: number;
        y?: number;
        biome?: Biome;
    } = {},
) {
    const analytics = ensureAnalytics(w),
        event: AnalyticsEvent = {
            id: `${Date.now()}-${analytics.events.length}`,
            type,
            at: Date.now(),
            ...context,
            data,
        };
    analytics.events.push(event);
    if (analytics.events.length > 10000)
        analytics.events.splice(0, analytics.events.length - 10000);
    const addNumber = (key: keyof AnalyticsSummary, amount: number) => {
        (analytics.summary[key] as number) += amount;
    };
    const addKeyed = (
        key:
            | "killsByKind"
            | "minedByMaterial"
            | "harvestedByKind"
            | "craftsByRecipe"
            | "itemsGained"
            | "itemsSpent",
        id: string,
        amount = 1,
    ) => {
        const values = analytics.summary[key];
        values[id] = (values[id] ?? 0) + amount;
    };
    switch (type) {
        case "session_start":
            addNumber("sessions", 1);
            break;
        case "session_end":
            addNumber("playTimeMs", Number(data.durationMs) || 0);
            break;
        case "position_sample":
            addNumber("distance", Number(data.distance) || 0);
            analytics.summary.maxDepth = Math.max(
                analytics.summary.maxDepth,
                Number(data.depth) || 0,
            );
            analytics.summary.maxDistanceFromBase = Math.max(
                analytics.summary.maxDistanceFromBase,
                Number(data.distanceFromBase) || 0,
            );
            break;
        case "attack_fired":
            addNumber("attacks", 1);
            break;
        case "attack_hit":
            addNumber("hits", 1);
            addNumber("damageDealt", Number(data.damage) || 0);
            if (data.killed) {
                addNumber("kills", 1);
                addKeyed("killsByKind", String(data.kind));
            }
            break;
        case "damage_taken":
            addNumber("damageTaken", Number(data.damage) || 0);
            break;
        case "death":
            addNumber("deaths", 1);
            break;
        case "respawn":
            addNumber("respawns", 1);
            break;
        case "mined":
            addNumber("mined", 1);
            addKeyed("minedByMaterial", String(data.material));
            break;
        case "placed":
            addNumber("placements", 1);
            break;
        case "harvested":
            addNumber("harvested", Number(data.quantity) || 1);
            addKeyed(
                "harvestedByKind",
                String(data.kind),
                Number(data.quantity) || 1,
            );
            break;
        case "chest_opened":
            addNumber("chestsOpened", 1);
            break;
        case "crafted":
            addKeyed("craftsByRecipe", String(data.recipe));
            break;
        case "item_gained":
            addKeyed(
                "itemsGained",
                String(data.item),
                Number(data.quantity) || 1,
            );
            break;
        case "item_spent":
            addKeyed(
                "itemsSpent",
                String(data.item),
                Number(data.quantity) || 1,
            );
            break;
        case "coins_changed":
            if (Number(data.amount) >= 0)
                addNumber("coinsEarned", Number(data.amount));
            else addNumber("coinsSpent", Math.abs(Number(data.amount)));
            break;
        case "biome_discovered":
            if (
                data.biome &&
                !analytics.summary.biomesDiscovered.includes(String(data.biome))
            )
                analytics.summary.biomesDiscovered.push(String(data.biome));
            break;
        case "objective_claimed":
            addNumber("objectivesClaimed", 1);
            break;
        case "recall_started":
            addNumber("recallsStarted", 1);
            break;
        case "recall_completed":
            addNumber("recallsCompleted", 1);
            break;
        case "recall_interrupted":
            addNumber("recallsInterrupted", 1);
            break;
        case "action_failed":
            addNumber("failures", 1);
            break;
    }
    return event;
}
export interface WorldSave {
    id: string;
    name: string;
    generator: number;
    settings: WorldSettings;
    player: {
        x: number;
        y: number;
    };
    checkpoint: {
        x: number;
        y: number;
    };
    inventory: Inventory;
    selected: number;
    coins: number;
    progress: Record<ObjectiveId, number>;
    claimed: string[];
    edits: Record<string, Record<string, Material>>;
    opened: string[];
    harvested: string[];
    defeated: string[];
    explored: Record<string, Biome>;
    created: number;
    pendingLoot: Partial<Record<ItemId, number>>;
    analytics?: Analytics;
}
export interface Bundle {
    version: number;
    active: string;
    worlds: Record<string, WorldSave>;
    profile: {
        owned: SkinId[];
        equipped: SkinId;
    };
}
export function newWorld(id: string, settings: WorldSettings): WorldSave {
    validateSettings(settings);
    const inventory: Inventory = Array.from({ length: 32 }, () => null);
    inventory[0] = { id: "pickaxe", count: 1 };
    inventory[1] = { id: "blaster", count: 1 };
    inventory[4] = { id: "dirt", count: 20 };
    return {
        id,
        name: settings.seed,
        generator: GENERATOR_VERSION,
        settings: structuredClone(settings),
        player: { x: 12 * TILE, y: 22 * TILE - 24 },
        checkpoint: { x: 12 * TILE, y: 22 * TILE - 24 },
        inventory,
        selected: 1,
        coins: 0,
        progress: { stone: 0, kills: 0, biome: 0, chest: 0, craft: 0 },
        claimed: [],
        edits: {},
        opened: [],
        harvested: [],
        defeated: [],
        explored: {},
        created: Date.now(),
        pendingLoot: {},
    };
}
export function initialBundle(): Bundle {
    const world = newWorld("first-world", DEFAULT_WORLD);
    return {
        version: SAVE_VERSION,
        active: world.id,
        worlds: { [world.id]: world },
        profile: { owned: ["frontier"], equipped: "frontier" },
    };
}
export function craft(w: WorldSave, id: string, atBase: boolean) {
    const r = RECIPES.find((r) => r.id === id);
    if (!r || !atBase)
        throw new Error("Return to the outpost workbench or forge.");
    const inv = structuredClone(w.inventory);
    for (const [key, n] of Object.entries(r.ingredients))
        if (!remove(inv, key as ItemId, n))
            throw new Error("Not enough ingredients.");
    if (!add(inv, r.output.id, r.output.count))
        throw new Error("Inventory full. Ingredients were kept.");
    w.inventory = inv;
    if (["weapon", "tool"].includes(ITEMS[r.output.id].category))
        w.progress.craft++;
    recordAnalytics(w, "crafted", { recipe: id, quantity: r.output.count });
    for (const [item, quantity] of Object.entries(r.ingredients))
        recordAnalytics(w, "item_spent", { item, quantity });
    recordAnalytics(w, "item_gained", {
        item: r.output.id,
        quantity: r.output.count,
    });
    return `Crafted ${r.output.count} ${ITEMS[r.output.id].name}`;
}
export function unlock(b: Bundle, id: SkinId) {
    const skin = SKINS.find((s) => s.id === id);
    if (!skin) throw new Error("Unknown skin.");
    if (b.profile.owned.includes(id))
        return "Already owned. Equip it for free.";
    const w = b.worlds[b.active];
    if (w.coins < skin.price)
        throw new Error(
            "Not enough coins. Complete objectives or sell resources.",
        );
    w.coins -= skin.price;
    b.profile.owned.push(id);
    return `${skin.name} unlocked`;
}
export function claim(w: WorldSave, id: ObjectiveId) {
    const o = OBJECTIVES.find((o) => o.id === id);
    if (!o || w.claimed.includes(id))
        throw new Error("Reward already claimed.");
    if (w.progress[id] < o.total) throw new Error("Objective is not complete.");
    w.coins += o.reward;
    w.claimed.push(id);
    return `+${o.reward} coins · ${o.name}`;
}
export function chest(w: WorldSave, id: string) {
    if (w.opened.includes(id)) throw new Error("This chest is already empty.");
    const inv = structuredClone(w.inventory);
    if (!add(inv, "crystal", 4) || !add(inv, "iron", 4))
        throw new Error("Make room for the chest contents first.");
    w.inventory = inv;
    w.opened.push(id);
    w.coins += 35;
    w.progress.chest++;
    return "+35 coins · 4 crystal shards · 4 iron ore";
}
export const MATERIALS: Record<
    Material,
    {
        name: string;
        solid: boolean;
        color: number;
        drop?: ItemId;
        time: number;
    }
> = {
    0: { name: "Air", solid: false, color: 0, time: 0 },
    1: { name: "Soil", solid: true, color: 0x685142, drop: "dirt", time: 350 },
    2: {
        name: "Stone",
        solid: true,
        color: 0x435463,
        drop: "stone",
        time: 650,
    },
    3: {
        name: "Iron vein",
        solid: true,
        color: 0x9b7965,
        drop: "iron",
        time: 1000,
    },
    4: {
        name: "Crystal vein",
        solid: true,
        color: 0x605092,
        drop: "crystal",
        time: 1000,
    },
    5: {
        name: "Scrap seam",
        solid: true,
        color: 0x665347,
        drop: "scrap",
        time: 800,
    },
    6: { name: "Bedrock", solid: true, color: 0x172633, time: Infinity },
    7: {
        name: "Outpost block",
        solid: true,
        color: 0x536f78,
        drop: "brick",
        time: 600,
    },
    8: {
        name: "Lumen torch",
        solid: false,
        color: 0xffd886,
        drop: "torch",
        time: 150,
    },
    9: {
        name: "Frontier turf",
        solid: true,
        color: 0x526b4c,
        drop: "dirt",
        time: 350,
    },
};
export const BUILDING: Partial<Record<ItemId, Material>> = {
    dirt: 1,
    stone: 2,
    brick: 7,
    torch: 8,
};
export const WEAPONS = {
    blaster: { cooldown: 260, damage: 18, speed: 600, mana: 0 },
    carbine: { cooldown: 170, damage: 26, speed: 700, mana: 0 },
    staff: { cooldown: 600, damage: 44, speed: 370, mana: 15 },
    sword: { cooldown: 430, damage: 32, speed: 0, mana: 0 },
};
