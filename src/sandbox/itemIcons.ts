/**
 * Drawn item icons shared by HUD (data URLs) and in-world held sprites (Phaser textures).
 * Pixel-art style — more material / tool-like than emoji.
 */

import type Phaser from 'phaser';
import { ITEMS, type ItemId } from './registry/items';
import { MATERIALS, BUILDING } from './model';
import { WEAPON_SKINS } from './registry/cosmetics';
import { GUN_FAMILIES } from './customization';

export const ITEM_ICON_SIZE = 32;

const cache = new Map<string, string>();

type Ctx = CanvasRenderingContext2D;

const hex = (c: number) => `#${(c >>> 0).toString(16).padStart(6, '0')}`;

function fill(ctx: Ctx, c: number, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = hex(c);
    ctx.fillRect(x, y, w, h);
}

function circ(ctx: Ctx, c: number, x: number, y: number, r: number) {
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function tri(ctx: Ctx, c: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
}

function shade(c: number, factor: number) {
    const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 0xff) * factor)));
    const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 0xff) * factor)));
    const b = Math.min(255, Math.max(0, Math.round((c & 0xff) * factor)));
    return (r << 16) | (g << 8) | b;
}

/**
 * Clear Minecraft-style isometric cube. Front face = placed tile color.
 */
function blockCube(ctx: Ctx, base: number, fleck?: number, topTint?: number) {
    const face = base;
    const top = topTint ?? shade(base, 1.45);
    const side = shade(base, 0.55);
    const edge = shade(base, 0.28);

    // Geometry (classic iso block, fills most of the 32×32 frame)
    const T = { x: 16, y: 3 };
    const TR = { x: 29, y: 10 };
    const BR = { x: 29, y: 22 };
    const B = { x: 16, y: 29 };
    const BL = { x: 3, y: 22 };
    const TL = { x: 3, y: 10 };
    const M = { x: 16, y: 17 }; // center ridge

    const poly = (color: number, pts: { x: number; y: number }[]) => {
        ctx.fillStyle = hex(color);
        ctx.beginPath();
        ctx.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
        ctx.closePath();
        ctx.fill();
    };

    // Right face (darker)
    poly(side, [M, TR, BR, B]);
    // Left / front face (placed color)
    poly(face, [M, TL, BL, B]);
    // Top face (lighter)
    poly(top, [T, TR, M, TL]);

    // Crisp edges
    ctx.strokeStyle = hex(edge);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(T.x, T.y); ctx.lineTo(TR.x, TR.y); ctx.lineTo(BR.x, BR.y); ctx.lineTo(B.x, B.y); ctx.lineTo(BL.x, BL.y); ctx.lineTo(TL.x, TL.y); ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(TL.x, TL.y); ctx.lineTo(M.x, M.y); ctx.lineTo(TR.x, TR.y);
    ctx.moveTo(M.x, M.y); ctx.lineTo(B.x, B.y);
    ctx.stroke();

    // Soft highlight on top
    ctx.strokeStyle = hex(shade(top, 1.15));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(T.x, T.y + 1); ctx.lineTo(TR.x - 1, TR.y); ctx.lineTo(M.x, M.y - 1);
    ctx.stroke();

    if (fleck != null) {
        fill(ctx, fleck, 7, 14, 3, 3);
        fill(ctx, fleck, 10, 19, 2, 2);
        fill(ctx, shade(fleck, 0.7), 19, 15, 2, 2);
    }
}

/** Resolve placed material color for a block item. */
function placedColor(id: string): number | null {
    const mat = BUILDING[id as ItemId];
    if (mat != null && MATERIALS[mat]) return MATERIALS[mat].color;
    // ores / resources that share world vein colors
    const oreMat: Record<string, number> = {
        iron: 3, copper_ore: 10, coal: 11, silver_ore: 12, gold_ore: 13,
        cobalt_ore: 14, obsidian: 15, crystal: 4, aether_crystal: 16, scrap: 5,
    };
    const m = oreMat[id];
    return m != null ? MATERIALS[m as keyof typeof MATERIALS].color : null;
}


function barIngot(ctx: Ctx, dark: number, mid: number, light: number) {
    fill(ctx, dark, 4, 14, 24, 10);
    fill(ctx, mid, 4, 12, 24, 6);
    fill(ctx, light, 4, 12, 24, 2);
    fill(ctx, dark, 4, 22, 24, 2);
    fill(ctx, light, 6, 14, 4, 2);
}

function pickaxe(ctx: Ctx, head: number, shine: number, haft = 0x8d6e4a) {
    // haft
    ctx.strokeStyle = hex(haft);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, 26);
    ctx.lineTo(18, 12);
    ctx.stroke();
    // head
    tri(ctx, head, 14, 4, 28, 10, 22, 16);
    tri(ctx, shine, 16, 7, 25, 11, 21, 14);
    fill(ctx, 0xc9a57a, 6, 24, 7, 4);
}

function sword(ctx: Ctx, blade: number, shine: number, guard = 0xc9a57a) {
    fill(ctx, 0x8d6e4a, 5, 22, 5, 7);
    fill(ctx, guard, 4, 19, 14, 4);
    fill(ctx, guard, 9, 16, 3, 8);
    tri(ctx, blade, 11, 4, 22, 16, 11, 18);
    fill(ctx, shine, 12, 8, 2, 8);
}

function gun(ctx: Ctx, body: number, glow: number, long = false) {
    fill(ctx, body, 4, 12, long ? 24 : 20, 7);
    fill(ctx, glow, long ? 16 : 14, 13, long ? 12 : 10, 3);
    fill(ctx, 0x1e3344, 6, 18, 6, 7);
    fill(ctx, 0x283b51, 3, 13, 3, 5);
    if (long) fill(ctx, 0x2a3f4e, 22, 8, 4, 4);
}

function hexNum(value: string, fallback: number) {
    const n = Number.parseInt(value.replace('#', ''), 16);
    return Number.isFinite(n) ? n : fallback;
}

export function gunTextureKey(itemId: string, skinId?: string) {
    if (!skinId || skinId === 'skin_brushed_steel') return `icon-${itemId}`;
    return `icon-${itemId}--${skinId}`;
}

export function heldGunTextureKey(itemId: string, skinId?: string) {
    const skin = skinId && skinId !== 'skin_brushed_steel' ? `--${skinId}` : '';
    return `held-gun-${itemId}${skin}`;
}

export function createHeldGunCanvas(id: string, skinId?: string): HTMLCanvasElement {
    const { body, glow, long } = gunPalette(id, skinId);
    const canvas = document.createElement('canvas');
    canvas.width = long ? 40 : 34;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    fill(ctx, body, 2, 4, long ? 32 : 26, 6);
    fill(ctx, glow, long ? 20 : 18, 5, long ? 16 : 14, 3);
    fill(ctx, 0x1e3344, 4, 9, 7, 6);
    fill(ctx, 0x1a2834, 0, 5, 4, 5);
    if (long) fill(ctx, 0x2a3f4e, 28, 0, 4, 4);
    return canvas;
}

function gunPalette(id: string, skinId?: string) {
    const long = id !== 'blaster';
    const skin = skinId ? WEAPON_SKINS[skinId] : undefined;
    if (skin) {
        return {
            body: hexNum(skin.palette.primary, 0x4a6270),
            glow: hexNum(skin.palette.glow ?? skin.palette.secondary, 0x77ffdf),
            long,
        };
    }
    if (id === 'rifle_rail') return { body: 0x1a3a4a, glow: 0x00e5ff, long: true };
    if (id === 'blaster') return { body: 0x4a6270, glow: 0x77ffdf, long: false };
    return { body: 0x3e5563, glow: 0xa8ffe8, long: true };
}

function staff(ctx: Ctx, shaft: number, gem: number, tip: number) {
    fill(ctx, shaft, 8, 10, 4, 18);
    fill(ctx, 0xb09773, 7, 26, 6, 4);
    circ(ctx, gem, 10, 8, 7);
    circ(ctx, tip, 10, 8, 3);
}

function axe(ctx: Ctx) {
    ctx.strokeStyle = hex(0x8d6e4a);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 26);
    ctx.lineTo(16, 10);
    ctx.stroke();
    tri(ctx, 0xb0bec5, 14, 6, 26, 12, 16, 18);
    tri(ctx, 0xeceff1, 16, 8, 23, 12, 17, 15);
}

function hammer(ctx: Ctx, head = 0x90a4ae) {
    fill(ctx, 0x8d6e4a, 14, 12, 4, 16);
    fill(ctx, head, 6, 8, 20, 10);
    fill(ctx, 0xcfd8dc, 6, 8, 20, 3);
    fill(ctx, 0x546e7a, 6, 16, 20, 2);
}

function drawItem(ctx: Ctx, id: string, skinId?: string) {
    ctx.clearRect(0, 0, ITEM_ICON_SIZE, ITEM_ICON_SIZE);
    // Block / placeable items → cube using the same face color as the placed world tile
    const blockBase = placedColor(id);
    if (blockBase != null && ['dirt','stone','brick','wood','platform_wood','wall_wood','wall_stone','block_metal','block_crystal','iron','copper_ore','coal','silver_ore','gold_ore','cobalt_ore','obsidian','scrap'].includes(id)) {
        const fleck = id.includes('ore') || id === 'iron' || id === 'coal' || id === 'obsidian' || id === 'scrap'
            ? shade(blockBase, 1.5) : undefined;
        const top = id === 'dirt' ? 0x526b4c : id === 'wood' || id === 'platform_wood' || id === 'wall_wood' || id === 'door_wood'
            ? shade(blockBase, 1.25) : undefined;
        blockCube(ctx, blockBase, fleck, top);
        return;
    }
    switch (id) {
        case 'crystal':
        case 'aether_crystal':
            blockCube(ctx, placedColor(id) ?? 0x5533b0, 0xc5a4ff, 0xc5a4ff);
            break;
        case 'bar': barIngot(ctx, 0x546e7a, 0xb0bec5, 0xeceff1); break;
        case 'copper_bar': barIngot(ctx, 0xa05028, 0xc8723c, 0xffb27a); break;
        case 'silver_bar': barIngot(ctx, 0x90a0a8, 0xc0c8d0, 0xffffff); break;
        case 'gold_bar': barIngot(ctx, 0xb88820, 0xe0b040, 0xffe082); break;
        case 'cobalt_bar': barIngot(ctx, 0x2a5a78, 0x3a7ca5, 0x90e0ef); break;

        case 'pickaxe': pickaxe(ctx, 0xe8f4fa, 0x90a4ae); break;
        case 'pickaxe_copper': pickaxe(ctx, 0xe07a5e, 0xffb27a); break;
        case 'pickaxe_iron':
        case 'drill': pickaxe(ctx, 0xcfd8dc, 0x90a4ae); break;
        case 'pickaxe_cobalt': pickaxe(ctx, 0x5c7cfa, 0x90e0ef); break;
        case 'pickaxe_aether': pickaxe(ctx, 0x70d6ff, 0xe0f7ff, 0xb39ddb); break;
        case 'axe_wood': axe(ctx); break;
        case 'hammer_construction':
        case 'hammer_heavy': hammer(ctx, id === 'hammer_heavy' ? 0xffb74d : 0x90a4ae); break;

        case 'sword': sword(ctx, 0xd8f7ff, 0x90caf9); break;
        case 'sword_long': sword(ctx, 0x69f0ae, 0xb9f6ca); break;
        case 'spear':
            fill(ctx, 0x8d6e4a, 14, 8, 4, 20);
            tri(ctx, 0x64b5f6, 16, 2, 22, 12, 10, 12);
            fill(ctx, 0x90caf9, 14, 6, 4, 4);
            break;
        case 'blaster':
        case 'carbine':
        case 'blaster_burst':
        case 'blaster_scatter':
        case 'rifle_rail': {
            const palette = gunPalette(id, skinId);
            gun(ctx, palette.body, palette.glow, palette.long);
            break;
        }
        case 'staff': staff(ctx, 0x6d5a8d, 0xcdb4ff, 0xf3e5ff); break;
        case 'staff_ember': staff(ctx, 0x5d4037, 0xff5722, 0xffcc80); break;
        case 'wand_frost': staff(ctx, 0x455a64, 0x40c4ff, 0xe1f5fe); break;
        case 'staff_arc': staff(ctx, 0x37474f, 0x18ffff, 0xe0ffff); break;
        case 'tome_crystal':
            fill(ctx, 0x5e35b1, 8, 6, 16, 22);
            fill(ctx, 0xba68c8, 10, 8, 12, 18);
            fill(ctx, 0xe1bee7, 12, 10, 8, 2);
            fill(ctx, 0xe1bee7, 12, 14, 8, 2);
            break;

        case 'torch':
            fill(ctx, 0x6d4c2e, 14, 14, 4, 14);
            fill(ctx, 0x94714c, 15, 14, 2, 14);
            circ(ctx, 0xff9b5a, 16, 10, 6);
            circ(ctx, 0xffd18a, 16, 9, 3);
            circ(ctx, 0xfff3c4, 16, 8, 1.5);
            break;
        case 'door_wood':
            fill(ctx, 0x3e2723, 8, 2, 16, 28);
            fill(ctx, 0x8d6e4a, 9, 3, 14, 26);
            fill(ctx, 0x5d4037, 9, 10, 14, 2);
            fill(ctx, 0x5d4037, 9, 18, 14, 2);
            circ(ctx, 0xffd54f, 20, 16, 2);
            break;
        case 'ammo':
            fill(ctx, 0x90a4ae, 8, 10, 16, 12);
            fill(ctx, 0xffc107, 10, 6, 4, 18);
            fill(ctx, 0xffc107, 16, 6, 4, 18);
            fill(ctx, 0xffc107, 22, 6, 4, 18);
            fill(ctx, 0xffecb3, 10, 6, 4, 4);
            break;
        case 'lightsaber':
            fill(ctx, 0x37474f, 13, 20, 6, 10);
            fill(ctx, 0x90a4ae, 14, 18, 4, 4);
            fill(ctx, 0x69f0ae, 14, 2, 4, 16);
            fill(ctx, 0xb9f6ca, 15, 2, 2, 16);
            circ(ctx, 0x69f0ae, 16, 2, 2);
            break;
        case 'tonic':
        case 'potion_mana':
            fill(ctx, 0xb09773, 13, 4, 6, 4);
            fill(ctx, 0xd6fff2, 10, 8, 12, 18);
            fill(ctx, id === 'potion_mana' ? 0x7e57c2 : 0x62dfc3, 12, 16, 8, 8);
            fill(ctx, 0xffffff, 13, 10, 3, 4);
            break;
        case 'herb':
            fill(ctx, 0x8d6e63, 15, 18, 2, 10);
            circ(ctx, 0x66bb6a, 16, 12, 7);
            circ(ctx, 0x43a047, 12, 10, 4);
            break;
        case 'berries':
            fill(ctx, 0x2e7d32, 14, 6, 4, 10);
            circ(ctx, 0xc62828, 12, 18, 4);
            circ(ctx, 0xc62828, 20, 16, 4);
            circ(ctx, 0xe53935, 16, 22, 4);
            break;
        case 'mushroom_edible':
            fill(ctx, 0xd7ccc8, 14, 16, 4, 10);
            circ(ctx, 0xe57373, 16, 12, 8);
            fill(ctx, 0xffcdd2, 12, 10, 3, 2);
            break;
        case 'vegetable_raw':
            circ(ctx, 0xff9800, 16, 18, 8);
            fill(ctx, 0x66bb6a, 14, 6, 4, 8);
            break;
        case 'seeds_crop':
            circ(ctx, 0x8d6e63, 12, 14, 4);
            circ(ctx, 0x8d6e63, 20, 18, 4);
            circ(ctx, 0xfff59d, 12, 14, 1.5);
            circ(ctx, 0xfff59d, 20, 18, 1.5);
            break;
        case 'meat_raw':
            fill(ctx, 0xe57373, 8, 12, 16, 12);
            fill(ctx, 0xffcdd2, 10, 14, 6, 4);
            fill(ctx, 0xffffff, 18, 10, 4, 4);
            break;
        case 'meat_cooked':
            fill(ctx, 0x8d6e63, 8, 12, 16, 12);
            fill(ctx, 0xffb74d, 10, 14, 8, 4);
            break;
        case 'mushrooms_grilled':
        case 'stew_vegetable':
        case 'dish_berry':
        case 'meal_mixed':
        case 'meal_expedition':
            circ(ctx, 0xefebe9, 16, 18, 10);
            circ(ctx, 0xff7043, 12, 16, 4);
            circ(ctx, 0x8d6e63, 20, 18, 3);
            fill(ctx, 0x66bb6a, 15, 12, 3, 3);
            break;

        case 'rope':
            fill(ctx, 0x8d6e63, 14, 4, 4, 24);
            fill(ctx, 0xbcaaa4, 15, 7, 2, 2);
            fill(ctx, 0xbcaaa4, 15, 14, 2, 2);
            fill(ctx, 0xbcaaa4, 15, 21, 2, 2);
            break;
        case 'ladder':
            fill(ctx, 0xa1887f, 8, 4, 3, 24);
            fill(ctx, 0xa1887f, 21, 4, 3, 24);
            fill(ctx, 0xa1887f, 8, 8, 16, 2);
            fill(ctx, 0xa1887f, 8, 15, 16, 2);
            fill(ctx, 0xa1887f, 8, 22, 16, 2);
            break;
        case 'grapple_hook':
            fill(ctx, 0x78909c, 14, 8, 4, 18);
            tri(ctx, 0xb0bec5, 16, 4, 24, 12, 16, 10);
            tri(ctx, 0xb0bec5, 16, 4, 8, 12, 16, 10);
            break;
        case 'chest_wood':
            fill(ctx, 0xc39a60, 5, 10, 22, 14);
            fill(ctx, 0x5d4037, 5, 16, 22, 2);
            fill(ctx, 0xe2eac0, 14, 14, 4, 4);
            break;
        case 'station_workbench':
        case 'station_advanced':
        case 'table_wood':
            fill(ctx, 0x8d6e63, 4, 16, 24, 8);
            fill(ctx, 0x5d4037, 6, 10, 4, 8);
            fill(ctx, 0x5d4037, 22, 10, 4, 8);
            fill(ctx, 0xbcaaa4, 4, 14, 24, 3);
            break;
        case 'station_furnace':
            fill(ctx, 0x5d4037, 6, 8, 20, 18);
            circ(ctx, 0xff8a50, 16, 18, 6);
            circ(ctx, 0xffd180, 16, 17, 3);
            break;
        case 'station_cooking':
            fill(ctx, 0x5c4033, 6, 20, 20, 6);
            fill(ctx, 0x3e2723, 8, 8, 3, 14);
            fill(ctx, 0x3e2723, 21, 8, 3, 14);
            fill(ctx, 0xd7ccc8, 8, 8, 16, 3);
            circ(ctx, 0xff8a50, 16, 22, 3);
            break;
        case 'chair_wood':
            fill(ctx, 0x8d6e63, 10, 8, 12, 4);
            fill(ctx, 0x8d6e63, 10, 12, 12, 8);
            fill(ctx, 0x5d4037, 10, 20, 3, 8);
            fill(ctx, 0x5d4037, 19, 20, 3, 8);
            break;
        case 'banner':
            fill(ctx, 0x8d6e63, 15, 4, 2, 24);
            fill(ctx, 0xc62828, 8, 6, 16, 12);
            tri(ctx, 0xc62828, 8, 18, 24, 18, 16, 24);
            break;
        case 'lamp':
            fill(ctx, 0x78909c, 14, 18, 4, 10);
            circ(ctx, 0xffe082, 16, 12, 7);
            circ(ctx, 0xfff8e1, 16, 12, 3);
            break;

        case 'helmet_iron':
            fill(ctx, 0x90a4ae, 8, 10, 16, 12);
            fill(ctx, 0xcfd8dc, 8, 10, 16, 4);
            fill(ctx, 0x546e7a, 12, 16, 8, 3);
            break;
        case 'chest_iron':
            fill(ctx, 0x78909c, 8, 8, 16, 18);
            fill(ctx, 0xcfd8dc, 10, 10, 12, 4);
            fill(ctx, 0x546e7a, 14, 16, 4, 6);
            break;
        case 'boots_iron':
        case 'boots_speed':
            fill(ctx, id === 'boots_speed' ? 0x43a047 : 0x78909c, 6, 14, 8, 12);
            fill(ctx, id === 'boots_speed' ? 0x66bb6a : 0x78909c, 18, 14, 8, 12);
            fill(ctx, 0x37474f, 6, 24, 8, 3);
            fill(ctx, 0x37474f, 18, 24, 8, 3);
            break;
        case 'charm_mining':
        case 'charm_mana':
        case 'charm_knockback':
            circ(ctx, id === 'charm_mana' ? 0x7e57c2 : id === 'charm_knockback' ? 0xff7043 : 0xffd54f, 16, 14, 8);
            circ(ctx, 0xffffff, 16, 14, 3);
            fill(ctx, 0xbcaaa4, 15, 22, 2, 6);
            break;
        case 'vitality_core':
            circ(ctx, 0xe53935, 16, 16, 10);
            circ(ctx, 0xffcdd2, 16, 16, 5);
            fill(ctx, 0xffffff, 14, 12, 4, 8);
            fill(ctx, 0xffffff, 12, 14, 8, 4);
            break;
        case 'mana_core':
            circ(ctx, 0x5c6bc0, 16, 16, 10);
            circ(ctx, 0x9fa8da, 16, 16, 5);
            fill(ctx, 0xe8eaf6, 14, 12, 4, 8);
            break;
        case 'totem_vitality':
        case 'totem_warding':
        case 'totem_prospector':
        case 'totem_arcane': {
            const c = id === 'totem_vitality' ? 0x66bb6a : id === 'totem_warding' ? 0x90caf9 : id === 'totem_prospector' ? 0xffd54f : 0xce93d8;
            fill(ctx, 0x5d4037, 12, 10, 8, 18);
            fill(ctx, c, 10, 6, 12, 8);
            circ(ctx, c, 16, 10, 4);
            break;
        }
        default: {
            const def = ITEMS[id as ItemId];
            const cat = def?.category ?? 'resource';
            if (cat === 'building') blockCube(ctx, 0x78909c);
            else if (cat === 'consumable') {
                fill(ctx, 0xd6fff2, 10, 8, 12, 18);
                fill(ctx, 0x62dfc3, 12, 16, 8, 8);
            } else if (cat === 'tool') pickaxe(ctx, 0xe8f4fa, 0x90a4ae);
            else if (cat === 'weapon') sword(ctx, 0xd8f7ff, 0x90caf9);
            else blockCube(ctx, 0xc6aaa0);
            break;
        }
    }
}

export function paintItemIcon(ctx: Ctx, id: string, skinId?: string) {
    drawItem(ctx, id, skinId);
}

export function createItemIconCanvas(id: string, skinId?: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = ITEM_ICON_SIZE;
    canvas.height = ITEM_ICON_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) drawItem(ctx, id, skinId);
    return canvas;
}

/** Cached PNG data URL for React HUD / inventory. */
export function itemIconUrl(id: string, skinId?: string): string {
    const key = skinId ? `${id}--${skinId}` : id;
    const hit = cache.get(key);
    if (hit) return hit;
    const url = createItemIconCanvas(id, skinId).toDataURL('image/png');
    cache.set(key, url);
    return url;
}

/** Register Phaser textures `icon-<id>` for every item (held-item display). */
export function registerItemIconTextures(scene: Phaser.Scene) {
    cache.clear();
    for (const id of Object.keys(ITEMS)) {
        const key = `icon-${id}`;
        if (scene.textures.exists(key)) scene.textures.remove(key);
        scene.textures.addCanvas(key, createItemIconCanvas(id));
    }
    for (const gunId of GUN_FAMILIES) {
        for (const skin of Object.values(WEAPON_SKINS)) {
            const iconKey = gunTextureKey(gunId, skin.id);
            if (iconKey !== `icon-${gunId}`) {
                if (scene.textures.exists(iconKey)) scene.textures.remove(iconKey);
                scene.textures.addCanvas(iconKey, createItemIconCanvas(gunId, skin.id));
            }
            const heldKey = heldGunTextureKey(gunId, skin.id);
            if (scene.textures.exists(heldKey)) scene.textures.remove(heldKey);
            scene.textures.addCanvas(heldKey, createHeldGunCanvas(gunId, skin.id));
        }
    }
}
