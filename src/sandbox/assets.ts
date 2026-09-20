import { WEAPONS, TOOL_TIERS } from './registry/toolsAndWeapons';
import { BIOME_VARIANTS } from './registry/enemies';
import Phaser from 'phaser';
import { createAssets } from '../platformer/assets';
import { SKINS } from './model';
import { ITEM_ICON_SIZE, registerItemIconTextures } from './itemIcons';

/** Fixed canvas size so every held/hotbar-matching icon reads the same in-hand. */
export const HELD_ICON_SIZE = ITEM_ICON_SIZE;

export function sandboxAssets(scene: Phaser.Scene) {
    createAssets(scene, 0x62dfc3);
    registerItemIconTextures(scene);
    const tex = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => { if (scene.textures.exists(key))
        return; const g = scene.make.graphics({}, false); draw(g); g.generateTexture(key, w, h); g.destroy(); };
    for (const skin of SKINS)
        for (const state of ['idle', 'run0', 'run1', 'air', 'fall', 'hurt'])
            tex(`${skin.id}-${state}`, 40, 48, g => {
                const color = Number.parseInt(skin.color.slice(1), 16), rect = (x: number, y: number, w: number, h: number, c: number) => { g.fillStyle(c); g.fillRect(x, y, w, h); };
                if (['wanderer', 'knight'].includes(skin.id)) {
                    g.fillStyle(skin.id === 'knight' ? 0x482c58 : 0x65559d);
                    g.fillTriangle(8, 17, 23, 20, 2, 42);
                }
                rect(11, 4, 18, 13, 0x182a36);
                rect(12, 3, 16, 11, color);
                rect(19, 7, 12, 5, 0xd9fff4);
                rect(9, 18, 21, 16, state === 'hurt' ? 0xffffff : color);
                rect(14, 20, 10, 12, 0x253947);
                rect(4, 18, 7, 15, color);
                rect(28, 19, 6, 13, color);
                const stride = state === 'run0' ? 4 : state === 'run1' ? -4 : 0, lift = state === 'air' ? 6 : state === 'fall' ? 2 : 0;
                rect(10 + stride, 34 - lift, 8, 10, 0x9bafb0);
                rect(23 - stride, 34, 8, 10, 0x9bafb0);
                rect(8 + stride, 43 - lift, 11, 4, 0x213344);
                rect(22 - stride, 43, 11, 4, 0x213344);
                if (skin.id === 'ranger') {
                    rect(7, 3, 27, 4, 0x69524b);
                    rect(13, 0, 15, 5, 0xc49e6c);
                    rect(0, 21, 5, 18, 0x705b4b);
                }
                if (skin.id === 'wanderer') {
                    for (let i = 0; i < 3; i++) {
                        g.fillStyle(0xcebcff);
                        g.fillTriangle(11 + i * 6, 5, 14 + i * 6, -2, 18 + i * 6, 5);
                    }
                }
                if (skin.id === 'neon') {
                    rect(7, 0, 2, 12, 0x96f8f4);
                    rect(31, 1, 2, 12, 0x96f8f4);
                    rect(16, 22, 2, 10, 0x7affee);
                    rect(0, 20, 5, 15, 0x8bd3de);
                }
                if (skin.id === 'knight') {
                    rect(7, 0, 4, 12, 0x9188b3);
                    rect(31, 0, 4, 12, 0x9188b3);
                    rect(5, 17, 9, 6, 0xe2a9cc);
                    rect(27, 17, 9, 6, 0xe2a9cc);
                }
                if (skin.id === 'automaton') {
                    rect(8, 1, 24, 15, 0xa39059);
                    rect(13, 6, 5, 5, 0xaaffec);
                    rect(24, 6, 5, 5, 0xaaffec);
                    rect(17, 22, 7, 7, 0xf8efb1);
                }
            });
    tex('hopper', 38, 34, g => { g.fillStyle(0x789966); g.fillEllipse(19, 21, 34, 23); g.fillStyle(0xeeb890); g.fillEllipse(19, 10, 38, 16); g.fillStyle(0xffe4bd); g.fillRect(8, 4, 5, 4); g.fillRect(24, 8, 6, 4); g.fillStyle(0x152f35); g.fillRect(14, 20, 3, 4); g.fillRect(24, 20, 3, 4); });
    tex('gunner', 36, 46, g => { g.fillStyle(0xb49a72); g.fillRect(8, 8, 23, 22); g.fillRect(9, 31, 7, 14); g.fillRect(24, 31, 7, 14); g.fillStyle(0x485664); g.fillRect(10, 0, 20, 13); g.fillRect(0, 17, 26, 6); g.fillStyle(0xfa8a7e); g.fillRect(12, 5, 12, 3); });
    tex('caster', 40, 48, g => { g.fillStyle(0x8465b1); g.fillTriangle(20, 4, 3, 45, 37, 45); g.fillStyle(0xbad8e8); g.fillRect(13, 10, 14, 10); g.fillStyle(0x1d2547); g.fillRect(15, 13, 10, 4); g.fillStyle(0xe1abff); g.fillRect(34, 10, 3, 34); g.fillTriangle(35, 0, 29, 10, 40, 10); });
    tex('sentinel', 46, 52, g => { g.fillStyle(0x65788b); g.fillRect(7, 9, 32, 30); g.fillRect(0, 14, 10, 25); g.fillRect(36, 14, 10, 25); g.fillRect(8, 37, 12, 14); g.fillRect(28, 37, 12, 14); g.fillStyle(0xc8a584); g.fillRect(10, 0, 27, 14); g.fillStyle(0xffa87d); g.fillRect(15, 5, 18, 4); });
    tex('bomber', 40, 44, g => {
        g.fillStyle(0x5a3a2e); g.fillEllipse(20, 26, 30, 26);
        g.fillStyle(0xc45a3a); g.fillEllipse(20, 22, 22, 20);
        g.fillStyle(0xffc978); g.fillCircle(20, 20, 6);
        g.fillStyle(0x2a1c18); g.fillRect(12, 16, 4, 4); g.fillRect(24, 16, 4, 4);
        g.fillStyle(0x8a6a40); g.fillRect(18, 2, 4, 10);
        g.fillStyle(0xff6b4a); g.fillCircle(20, 2, 4);
    });
    tex('explosion_bot', 36, 40, g => {
        g.fillStyle(0x3a3a42); g.fillRoundedRect(4, 10, 28, 24, 4);
        g.fillStyle(0xff5722); g.fillCircle(18, 20, 8);
        g.fillStyle(0xffeb3b); g.fillCircle(18, 20, 4);
        g.fillStyle(0x212121); g.fillRect(8, 34, 6, 5); g.fillRect(22, 34, 6, 5);
        g.fillStyle(0xb0bec5); g.fillRect(10, 6, 4, 6); g.fillRect(22, 6, 4, 6);
        g.fillStyle(0xff9800); g.fillCircle(12, 5, 3); g.fillCircle(24, 5, 3);
    });
    // Land enemies
    tex('brute', 44, 48, g => {
        g.fillStyle(0x5d4037); g.fillRect(8, 12, 28, 24);
        g.fillStyle(0x8d6e63); g.fillRect(10, 14, 24, 10);
        g.fillStyle(0x3e2723); g.fillRect(6, 34, 10, 12); g.fillRect(28, 34, 10, 12);
        g.fillStyle(0xffab91); g.fillRect(14, 4, 16, 12);
        g.fillStyle(0x1a1a1a); g.fillRect(16, 8, 4, 3); g.fillRect(24, 8, 4, 3);
        g.fillStyle(0xb71c1c); g.fillRect(18, 12, 8, 2);
    });
    tex('stalker', 40, 28, g => {
        g.fillStyle(0x263238); g.fillEllipse(20, 16, 34, 16);
        g.fillStyle(0x455a64); g.fillEllipse(28, 12, 16, 12);
        g.fillStyle(0xff5252); g.fillCircle(32, 10, 2); g.fillCircle(36, 11, 2);
        g.fillStyle(0x1a237e); g.fillRect(8, 20, 5, 6); g.fillRect(16, 22, 5, 5); g.fillRect(24, 20, 5, 6);
        g.fillStyle(0x90a4ae); g.fillTriangle(4, 14, 10, 12, 10, 18);
    });
    tex('spitter', 36, 40, g => {
        g.fillStyle(0x558b2f); g.fillEllipse(18, 24, 28, 20);
        g.fillStyle(0x8bc34a); g.fillCircle(18, 14, 10);
        g.fillStyle(0x1b5e20); g.fillCircle(14, 12, 2); g.fillCircle(22, 12, 2);
        g.fillStyle(0xc6ff00); g.fillTriangle(18, 16, 14, 22, 22, 22);
        g.fillStyle(0x33691e); g.fillRect(10, 32, 5, 6); g.fillRect(21, 32, 5, 6);
    });
    tex('grub', 42, 22, g => {
        g.fillStyle(0x6d4c41); g.fillEllipse(21, 12, 36, 16);
        g.fillStyle(0xa1887f); g.fillEllipse(12, 11, 14, 12);
        g.fillStyle(0x5d4037); g.fillRect(8, 6, 4, 3); g.fillRect(14, 5, 4, 3); g.fillRect(20, 6, 4, 3); g.fillRect(26, 5, 4, 3);
        g.fillStyle(0xffcc80); g.fillCircle(6, 11, 3);
        g.fillStyle(0x212121); g.fillCircle(5, 10, 1);
    });
    tex('thornback', 40, 36, g => {
        g.fillStyle(0x795548); g.fillEllipse(20, 22, 30, 18);
        g.fillStyle(0x4e342e); g.fillTriangle(20, 2, 12, 18, 28, 18);
        g.fillStyle(0x3e2723); g.fillTriangle(10, 8, 6, 20, 16, 16);
        g.fillStyle(0x3e2723); g.fillTriangle(30, 8, 24, 16, 34, 20);
        g.fillStyle(0xffccbc); g.fillCircle(20, 20, 5);
        g.fillStyle(0x1a1a1a); g.fillCircle(18, 19, 1.5); g.fillCircle(23, 19, 1.5);
    });
    tex('rockmite', 28, 22, g => {
        g.fillStyle(0x78909c); g.fillEllipse(14, 12, 22, 14);
        g.fillStyle(0xb0bec5); g.fillCircle(10, 10, 4); g.fillCircle(18, 11, 3);
        g.fillStyle(0x37474f); g.fillRect(6, 16, 3, 4); g.fillRect(12, 17, 3, 4); g.fillRect(18, 16, 3, 4);
        g.fillStyle(0xffe082); g.fillCircle(20, 8, 2);
    });
    tex('wisp', 28, 28, g => {
        g.fillStyle(0x7affee, 0.35); g.fillCircle(14, 14, 13);
        g.fillStyle(0xb8fff4); g.fillCircle(14, 14, 8);
        g.fillStyle(0xffffff); g.fillCircle(14, 14, 4);
        g.fillStyle(0x62dfc3); g.fillCircle(10, 11, 2); g.fillCircle(18, 11, 2);
    });
    tex('skimmer', 42, 22, g => {
        g.fillStyle(0x4a6578); g.fillEllipse(21, 12, 38, 14);
        g.fillStyle(0x9dffdf); g.fillRect(8, 8, 26, 4);
        g.fillStyle(0xff9b5a); g.fillCircle(34, 11, 4);
        g.fillStyle(0x1a2a36); g.fillRect(4, 10, 6, 3);
        g.fillStyle(0x82a0b0); g.fillTriangle(0, 11, 8, 4, 8, 18);
    });
    tex('dart_wisp', 26, 26, g => {
        g.fillStyle(0xff8a80, 0.4); g.fillCircle(13, 13, 12);
        g.fillStyle(0xff5252); g.fillCircle(13, 13, 7);
        g.fillStyle(0xfff59d); g.fillCircle(13, 13, 3);
        g.fillStyle(0xffffff); g.fillRect(20, 12, 6, 2);
    });
    tex('sky_gunner', 34, 30, g => {
        g.fillStyle(0x546e7a); g.fillEllipse(17, 16, 28, 16);
        g.fillStyle(0x90a4ae); g.fillRect(4, 14, 18, 5);
        g.fillStyle(0xffcc80); g.fillCircle(26, 15, 4);
        g.fillStyle(0x263238); g.fillRect(8, 8, 6, 4); g.fillRect(8, 20, 6, 4);
    });
    tex('razorwing', 40, 24, g => {
        g.fillStyle(0x4a148c); g.fillTriangle(4, 12, 20, 4, 20, 20);
        g.fillStyle(0x7b1fa2); g.fillTriangle(36, 12, 20, 4, 20, 20);
        g.fillStyle(0xce93d8); g.fillCircle(20, 12, 5);
        g.fillStyle(0xff1744); g.fillCircle(28, 12, 2);
    });
    const paintBoss = (g: Phaser.GameObjects.Graphics, w: number, h: number, color: number, accent: number, flying: boolean, motif: 'titan' | 'bloom' | 'ward' | 'wing' | 'beast') => {
        g.fillStyle(0x101820, 0.55);
        g.fillEllipse(w / 2, h - 8, w * 0.8, 14);
        g.fillStyle(color);
        if (flying || motif === 'wing') {
            g.fillEllipse(w / 2, h * 0.55, w * 0.72, h * 0.48);
            g.fillStyle(accent);
            g.fillTriangle(8, h * 0.5, w / 2, 6, w / 2 - 6, h * 0.46);
            g.fillTriangle(w - 8, h * 0.5, w / 2, 6, w / 2 + 6, h * 0.46);
            g.fillStyle(color);
            g.fillTriangle(w / 2, 8, 18, h * 0.42, w - 18, h * 0.42);
        } else if (motif === 'bloom') {
            g.fillRect(w * 0.3, h * 0.4, w * 0.4, h * 0.48);
            g.fillEllipse(w / 2, h * 0.34, w * 0.9, h * 0.4);
            g.fillStyle(accent);
            for (let i = 0; i < 6; i++) g.fillCircle(16 + i * ((w - 32) / 5), 24 + (i % 2) * 12, 8);
        } else if (motif === 'ward') {
            g.fillTriangle(w / 2, 4, w - 6, h * 0.5, w / 2, h - 8);
            g.fillTriangle(w / 2, 4, 6, h * 0.5, w / 2, h - 8);
            g.fillRect(4, h * 0.34, 16, h * 0.34);
            g.fillRect(w - 20, h * 0.34, 16, h * 0.34);
        } else {
            g.fillRect(w * 0.2, h * 0.16, w * 0.6, h * 0.52);
            g.fillRect(4, h * 0.28, 18, h * 0.46);
            g.fillRect(w - 22, h * 0.28, 18, h * 0.46);
            g.fillRect(w * 0.24, h * 0.66, 22, h * 0.3);
            g.fillRect(w * 0.54, h * 0.66, 22, h * 0.3);
            if (motif === 'beast') {
                g.fillStyle(accent);
                g.fillTriangle(10, h * 0.22, 30, 6, 34, h * 0.3);
                g.fillTriangle(w - 10, h * 0.22, w - 30, 6, w - 34, h * 0.3);
            }
        }
        g.fillStyle(0xf4fff8);
        g.fillRect(w * 0.3, h * 0.26, w * 0.4, 12);
        g.fillStyle(0x1b2a36);
        g.fillCircle(w / 2, h * 0.46, 14);
        g.fillStyle(accent);
        g.fillCircle(w / 2, h * 0.46, 8);
        g.fillStyle(0xffce82);
        g.fillCircle(w / 2, h * 0.46, 4);
    };
    const bossArt: [string, number, number, boolean, 'titan' | 'bloom' | 'ward' | 'wing' | 'beast'][] = [
        ['rust_colossus', 0xc28d64, 0xffcc80, false, 'titan'],
        ['mycelial_sovereign', 0xb18cd4, 0xe0bfec, false, 'bloom'],
        ['aether_warden', 0x7ceae0, 0xe5fff0, true, 'ward'],
        ['storm_seraph', 0x81d4fa, 0xe1f5fe, true, 'wing'],
        ['slag_titan', 0xff5722, 0xffab40, false, 'titan'],
        ['hollow_king', 0xbdbdbd, 0x76ff03, false, 'titan'],
        ['prism_hydra', 0xea80fc, 0x18ffff, true, 'bloom'],
        ['night_howler', 0x3949ab, 0xff1744, false, 'beast'],
        ['ember_empress', 0xff6f00, 0xffecb3, false, 'titan'],
        ['void_matriarch', 0x7c4dff, 0xea80fc, true, 'wing'],
        ['glacial_tyrant', 0xb3e5fc, 0x0277bd, false, 'titan'],
        ['spore_colossus', 0x9ccc65, 0xdcedc8, false, 'bloom'],
        ['thunder_wraith', 0xffee58, 0x80d8ff, true, 'wing'],
        ['magma_duke', 0xff3d00, 0xffab40, false, 'titan'],
        ['crystal_oracle', 0xce93d8, 0x18ffff, true, 'ward'],
    ];
    for (const [id, color, accent, flying, motif] of bossArt) {
        if (scene.textures.exists(id)) scene.textures.remove(id);
        const w = 96, h = flying ? 96 : 128;
        tex(id, w, h, g => paintBoss(g, w, h, color, accent, flying, motif));
    }
    tex('magic', 18, 18, g => { g.fillStyle(0x9b89ff); g.fillCircle(9, 9, 9); g.fillStyle(0xf5dcff); g.fillTriangle(9, 1, 14, 10, 3, 12); });
    tex('pick-tool', 36, 36, g => {
        g.lineStyle(5, 0x8d6e4a);
        g.lineBetween(6, 30, 22, 10);
        g.fillStyle(0xeef6fa);
        g.fillTriangle(14, 2, 34, 8, 28, 18);
        g.fillStyle(0xb0bec5);
        g.fillTriangle(16, 5, 30, 9, 26, 15);
        g.fillStyle(0xc9a57a);
        g.fillRect(4, 28, 8, 5);
        g.fillStyle(0xffd54f);
        g.fillRect(5, 29, 3, 3);
    });
    // Weapons — grip at left origin so they sit in the hand when aimed
    tex('sword-tool', 40, 16, g => {
        g.fillStyle(0x8d6e4a); g.fillRect(0, 6, 10, 4);
        g.fillStyle(0xc9a57a); g.fillRect(8, 2, 3, 12);
        g.fillStyle(0xd8f7ff); g.fillTriangle(11, 3, 40, 8, 11, 13);
        g.fillStyle(0x90caf9); g.fillTriangle(11, 5, 34, 8, 11, 11);
    });
    tex('staff-tool', 38, 16, g => {
        g.fillStyle(0x6d5a8d); g.fillRect(0, 6, 26, 4);
        g.fillStyle(0xb09773); g.fillRect(0, 5, 6, 6);
        g.fillStyle(0xcdb4ff); g.fillCircle(32, 8, 6);
        g.fillStyle(0xf3e5ff); g.fillCircle(32, 8, 3);
    });
    tex('gun-tool', 34, 16, g => {
        g.fillStyle(0x4a6270); g.fillRect(2, 4, 26, 6);
        g.fillStyle(0x77ffdf); g.fillRect(18, 5, 14, 3);
        g.fillStyle(0x283b51); g.fillRect(4, 9, 7, 6);
        g.fillStyle(0x1a2834); g.fillRect(0, 5, 4, 5);
    });
    tex('carbine-tool', 36, 16, g => {
        g.fillStyle(0x3e5563); g.fillRect(2, 3, 28, 7);
        g.fillStyle(0xa8ffe8); g.fillRect(20, 4, 14, 3);
        g.fillStyle(0x1e3344); g.fillRect(3, 9, 8, 6);
        g.fillStyle(0x2a3f4e); g.fillRect(26, 0, 4, 4);
        g.fillStyle(0x1a2834); g.fillRect(0, 4, 4, 5);
    });
    // Isometric-ish held cubes so blocks read as physical objects in-hand
    const heldCube = (key: string, top: number, face: number, side: number, fleck?: number) => {
        tex(key, 22, 22, g => {
            // right face
            g.fillStyle(side);
            g.fillTriangle(11, 8, 20, 12, 20, 18);
            g.fillTriangle(11, 8, 20, 18, 11, 14);
            // left face
            g.fillStyle(face);
            g.fillTriangle(11, 8, 2, 12, 2, 18);
            g.fillTriangle(11, 8, 2, 18, 11, 14);
            // top
            g.fillStyle(top);
            g.fillTriangle(11, 2, 20, 8, 11, 12);
            g.fillTriangle(11, 2, 2, 8, 11, 12);
            if (fleck != null) {
                g.fillStyle(fleck);
                g.fillRect(6, 11, 3, 3);
                g.fillRect(13, 14, 3, 2);
            }
        });
    };
    heldCube('held-dirt', 0x6f8a55, 0x685142, 0x4a3a30);
    heldCube('held-stone', 0x8c9b9f, 0x435463, 0x2a3844, 0x6a7a84);
    heldCube('held-brick', 0x7a9aa3, 0x536f78, 0x314850, 0x243840);
    heldCube('held-wood', 0xc49a6c, 0x8b5a2b, 0x5d3a1a, 0xa67c52);
    heldCube('held-iron', 0xe5b891, 0x9b7965, 0x6d5548, 0xf0d0b0);
    heldCube('held-copper', 0xffb27a, 0xba6840, 0x7a4028, 0xffd0a0);
    heldCube('held-coal', 0x555555, 0x2b2b2b, 0x111111, 0x777777);
    heldCube('held-crystal', 0xc5a4ff, 0x605092, 0x3a2e6a, 0xe8d5ff);
    heldCube('held-scrap', 0xbb9f72, 0x665347, 0x3e3228, 0xd4b888);
    heldCube('held-silver', 0xf0f4f7, 0x7a8a96, 0x4a5864, 0xffffff);
    heldCube('held-gold', 0xffd166, 0xa67c1a, 0x6d5010, 0xfff3bf);
    heldCube('held-cobalt', 0x4cc9f0, 0x1a4578, 0x0d2a4a, 0x90e0ef);
    heldCube('held-obsidian', 0xb5179e, 0x1a1224, 0x0a0810, 0xf72585);
    heldCube('held-resource', 0xf0cb87, 0xc6aaa0, 0x8a7068);
    tex('held-torch', 12, 26, g => {
        g.fillStyle(0x6d4c2e); g.fillRect(4, 10, 4, 15);
        g.fillStyle(0x94714c); g.fillRect(5, 10, 2, 15);
        g.fillStyle(0xff9b5a); g.fillCircle(6, 7, 5);
        g.fillStyle(0xffd18a); g.fillCircle(6, 6, 3);
        g.fillStyle(0xfff3c4); g.fillCircle(6, 5, 1.5);
    });
    tex('held-tonic', 12, 20, g => {
        g.fillStyle(0xb09773); g.fillRect(4, 1, 4, 4);
        g.fillStyle(0xd6fff2); g.fillRoundedRect(2, 5, 8, 14, 2);
        g.fillStyle(0x62dfc3); g.fillRect(3, 11, 6, 7);
        g.fillStyle(0xffffff); g.fillRect(4, 7, 2, 3);
    });
    tex('held-bar', 20, 12, g => {
        g.fillStyle(0x78909c); g.fillRect(1, 4, 18, 6);
        g.fillStyle(0xb0bec5); g.fillRect(1, 3, 18, 3);
        g.fillStyle(0xeceff1); g.fillRect(1, 3, 18, 1);
        g.fillStyle(0x546e7a); g.fillRect(1, 9, 18, 1);
    });
    tex('held-herb', 14, 22, g => {
        g.fillStyle(0x8d6e63); g.fillRect(6, 12, 2, 9);
        g.fillStyle(0x66bb6a); g.fillEllipse(7, 8, 10, 12);
        g.fillStyle(0x43a047); g.fillEllipse(5, 6, 6, 8);
    });
    // Distinct held pickaxe (field starter) — clearer than generic tool stub
    tex('equipped-pickaxe', 40, 36, g => {
        g.lineStyle(5, 0x8d6e4a);
        g.lineBetween(8, 30, 24, 10);
        g.fillStyle(0xe8f4fa);
        g.fillTriangle(16, 1, 38, 8, 30, 20);
        g.fillStyle(0x90a4ae);
        g.fillTriangle(18, 5, 34, 10, 28, 16);
        g.fillStyle(0xc9a57a);
        g.fillRect(5, 28, 10, 5);
        g.fillStyle(0xffd54f);
        g.fillRect(7, 29, 3, 3);
    });
    tex('held-copper-bar', 20, 12, g => { g.fillStyle(0xa05028); g.fillRect(1,4,18,6); g.fillStyle(0xc8723c); g.fillRect(1,3,18,3); g.fillStyle(0xffb27a); g.fillRect(1,3,18,1); });
    tex('held-silver-bar', 20, 12, g => { g.fillStyle(0x90a0a8); g.fillRect(1,4,18,6); g.fillStyle(0xc0c8d0); g.fillRect(1,3,18,3); g.fillStyle(0xffffff); g.fillRect(1,3,18,1); });
    tex('held-gold-bar', 20, 12, g => { g.fillStyle(0xb88820); g.fillRect(1,4,18,6); g.fillStyle(0xe0b040); g.fillRect(1,3,18,3); g.fillStyle(0xffe082); g.fillRect(1,3,18,1); });
    tex('held-cobalt-bar', 20, 12, g => { g.fillStyle(0x2a5a78); g.fillRect(1,4,18,6); g.fillStyle(0x3a7ca5); g.fillRect(1,3,18,3); g.fillStyle(0x90e0ef); g.fillRect(1,3,18,1); });
    tex('held-berries', 16, 16, g => { g.fillStyle(0x2e7d32); g.fillRect(6,2,4,8); g.fillStyle(0xc62828); g.fillCircle(5,10,3); g.fillCircle(11,9,3); g.fillCircle(8,13,3); });
    tex('held-mushroom', 16, 18, g => { g.fillStyle(0xd7ccc8); g.fillRect(6,8,4,9); g.fillStyle(0xe57373); g.fillEllipse(8,7,14,10); });
    tex('held-veg', 16, 16, g => { g.fillStyle(0xff9800); g.fillCircle(8,10,6); g.fillStyle(0x66bb6a); g.fillRect(7,2,2,6); });
    tex('held-meal', 18, 14, g => { g.fillStyle(0xefebe9); g.fillEllipse(9,9,16,10); g.fillStyle(0xff7043); g.fillCircle(7,8,3); g.fillStyle(0x8d6e63); g.fillCircle(12,9,2); });
    tex('held-station', 20, 18, g => { g.fillStyle(0x8d6e63); g.fillRect(1,8,18,8); g.fillRect(2,4,4,6); g.fillRect(14,4,4,6); g.fillStyle(0xbcaaa4); g.fillRect(1,7,18,3); });
    tex('held-furnace', 20, 18, g => { g.fillStyle(0x5d4037); g.fillRect(2,4,16,14); g.fillStyle(0xff8a50); g.fillCircle(10,12,5); g.fillStyle(0xffd180); g.fillCircle(10,11,2); });
    tex('held-cooking', 20, 18, g => { g.fillStyle(0x5c4033); g.fillRect(2,12,16,6); g.fillStyle(0x3e2723); g.fillRect(3,4,3,10); g.fillRect(14,4,3,10); g.fillStyle(0xd7ccc8); g.fillRect(3,3,14,3); g.fillStyle(0xff8a50); g.fillCircle(10,14,3); });
    tex('held-chest', 18, 14, g => { g.fillStyle(0xc39a60); g.fillRect(1,2,16,11); g.fillStyle(0x5d4037); g.fillRect(1,7,16,2); g.fillStyle(0xe2eac0); g.fillRect(7,6,4,4); });
    tex('held-rope', 12, 22, g => { g.fillStyle(0x8d6e63); g.fillRect(4,1,4,20); g.fillStyle(0xbcaaa4); g.fillRect(5,3,2,2); g.fillRect(5,9,2,2); g.fillRect(5,15,2,2); });
    tex('held-ladder', 16, 22, g => { g.fillStyle(0xa1887f); g.fillRect(2,1,3,20); g.fillRect(11,1,3,20); g.fillRect(2,4,12,2); g.fillRect(2,10,12,2); g.fillRect(2,16,12,2); });
    tex('held-seeds', 14, 14, g => { g.fillStyle(0x8d6e63); g.fillCircle(5,6,3); g.fillCircle(9,9,3); g.fillStyle(0xfff59d); g.fillCircle(5,6,1); g.fillCircle(9,9,1); });
    tex('chest', 30, 24, g => { g.fillStyle(0xc39a60); g.fillRoundedRect(1, 1, 28, 22, 3); g.lineStyle(3, 0x4f5156); g.strokeRect(1, 1, 28, 22); g.fillStyle(0xe2eac0); g.fillRect(12, 8, 6, 8); });
    // Wildlife Animals
    tex('mole', 32, 22, g => {
        g.fillStyle(0x6d4c41);
        g.fillEllipse(16, 13, 26, 16);
        g.fillStyle(0x8d6e63);
        g.fillCircle(7, 12, 6);
        g.fillStyle(0xffab91);
        g.fillCircle(3, 13, 3); // Pink snout
        g.fillStyle(0x212121);
        g.fillCircle(8, 10, 2); // Eye
        g.fillStyle(0xeeeeee);
        g.fillRect(4, 18, 5, 3); // Digging claws
        g.fillRect(23, 18, 5, 3);
    });
    tex('grazer', 40, 36, g => {
        g.fillStyle(0xa1887f);
        g.fillRoundedRect(8, 12, 26, 16, 4); // Body
        g.fillRoundedRect(26, 4, 10, 14, 3); // Neck/Head
        g.fillStyle(0x5d4037);
        g.fillRect(11, 26, 4, 10); // Front leg
        g.fillRect(27, 26, 4, 10); // Back leg
        g.fillStyle(0xd7ccc8);
        g.fillTriangle(30, 4, 36, -2, 33, 4); // Antler 1
        g.fillTriangle(27, 4, 23, -2, 29, 4); // Antler 2
        g.fillStyle(0x212121);
        g.fillCircle(33, 8, 2); // Eye
    });
    tex('quail', 24, 24, g => {
        g.fillStyle(0x8d6e63);
        g.fillCircle(12, 14, 9); // Round body
        g.fillStyle(0xd7ccc8);
        g.fillEllipse(11, 16, 12, 7); // Chest
        g.fillStyle(0x3e2723);
        g.fillCircle(17, 9, 6); // Head
        g.fillTriangle(17, 4, 21, 0, 19, 7); // Head plume
        g.fillStyle(0xffb300);
        g.fillTriangle(21, 9, 25, 10, 21, 12); // Beak
        g.fillStyle(0x212121);
        g.fillCircle(18, 8, 1.5); // Eye
        g.fillStyle(0xd7ccc8);
        g.fillRect(9, 21, 3, 3); // Leg
        g.fillRect(14, 21, 3, 3);
    });
    tex('beetle', 28, 20, g => {
        g.fillStyle(0x311b92);
        g.fillEllipse(14, 11, 22, 14); // Carapace
        g.fillStyle(0x4a148c);
        g.fillRect(13, 4, 2, 14); // Carapace divide
        g.fillStyle(0x00b4d8);
        g.fillTriangle(24, 8, 28, 6, 24, 11); // Mandible 1
        g.fillTriangle(24, 14, 28, 16, 24, 11); // Mandible 2
        g.fillStyle(0x00e676);
        g.fillCircle(23, 9, 2); // Compound eye 1
        g.fillCircle(23, 13, 2); // Compound eye 2
        g.fillStyle(0x1a237e);
        g.fillRect(8, 17, 3, 3); // Legs
        g.fillRect(14, 17, 3, 3);
        g.fillRect(19, 17, 3, 3);
    });
    for (const [id, spec] of Object.entries(BIOME_VARIANTS)) {
        tex(id, 40, 40, g => {
            const color = id.includes('frost') ? 0xa5d8ff : id.includes('fungal') ? 0xb298db : id.includes('crystal') ? 0x63dfd8 : id.includes('rust') ? 0xcc956d : 0x8ab975;
            g.fillStyle(0x152330); g.fillEllipse(20,26,34,24);
            g.fillStyle(color);
            if (id.startsWith('drone')) { g.fillTriangle(2,18,20,10,38,18); g.fillRect(12,18,16,12); }
            else if(id.startsWith('caster')) { g.fillTriangle(4,34,20,5,36,34); g.fillRect(32,10,3,28); }
            else if(id.startsWith('sentinel')) { g.fillRect(6,8,28,26); g.fillTriangle(5,10,12,1,18,10); }
            else if(id.startsWith('hopper')) { g.fillEllipse(20,22,26,20); g.fillRect(4,30,12,8); g.fillRect(25,30,12,8); }
            else { g.fillRect(6,15,28,16); g.fillRect(3,29,7,7); g.fillRect(29,29,7,7); }
            g.fillStyle(0xf9eac2); g.fillRect(23,17,8,3);
            g.fillStyle(0x26394c); g.fillRect(9,24,13,3);
            if(spec.biomeAffinity==='Fungal hollows') { g.fillStyle(0xdfbbef); g.fillEllipse(17,9,26,9); }
        });
    }

    for(const [index,id] of [...Object.keys(WEAPONS),...Object.keys(TOOL_TIERS)].entries()) {
        // Field pickaxe uses the dedicated sprite above.
        if (id === 'pickaxe') continue;
        tex(`equipped-${id}`,48,24,g=>{
            const profile=WEAPONS[id];g.fillStyle(0x20313e);g.fillRect(1,8,12,8);g.fillStyle(0xabc6cf);
            if(profile?.type==='gun') {const barrel=id==='rifle_rail'?35:id==='blaster_scatter'?22:26;g.fillRect(8,6,barrel,8);g.fillRect(12,13,5,9);g.fillStyle(0x405866);g.fillRect(18,4,9,3);if(id==='blaster_scatter')g.fillRect(25,14,12,3);}
            else if(profile?.type==='melee') {if(id==='hammer_heavy'){g.fillRect(4,11,30,4);g.fillRect(29,1,12,21);}else{g.fillTriangle(10,8,46,11,10,15);g.fillRect(9,3,4,18);if(id==='spear')g.fillRect(1,10,35,3);}}
            else if(profile?.type==='magic') {if(id==='tome_crystal'){g.fillRect(10,3,24,19);g.fillStyle(0x6e538a);g.fillRect(12,5,20,15);g.fillStyle(0xded6ff);g.fillRect(21,6,2,13);}else{g.fillRect(2,10,32,5);g.fillStyle([0xff9c65,0xa1e6ff,0x9df9ed][index%3]);g.fillTriangle(30,1,46,12,30,23);}}
            else {
                // Other pickaxe tiers — angled head + handle
                const headColor = id.includes('aether') ? 0x70d6ff : id.includes('cobalt') ? 0x5c7cfa : id.includes('iron') || id === 'drill' ? 0xcfd8dc : id.includes('copper') ? 0xe07a5e : 0xd7e8ef;
                g.lineStyle(4, 0x8d6e4a); g.lineBetween(6, 20, 22, 8);
                g.fillStyle(headColor); g.fillTriangle(16, 1, 44, 8, 30, 18);
                g.fillStyle(0xc9a57a); g.fillRect(3, 18, 10, 5);
            }
            g.fillStyle(0xf2cf83);g.fillRect(5+index%5,9,3,4);
        });
    }

}
