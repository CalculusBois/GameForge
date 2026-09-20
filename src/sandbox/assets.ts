import Phaser from 'phaser';
import { createAssets } from '../platformer/assets';
import { SKINS } from './model';
export function sandboxAssets(scene: Phaser.Scene) {
    createAssets(scene, 0x62dfc3);
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
    tex('magic', 18, 18, g => { g.fillStyle(0x9b89ff); g.fillCircle(9, 9, 9); g.fillStyle(0xf5dcff); g.fillTriangle(9, 1, 14, 10, 3, 12); });
    tex('pick-tool', 32, 32, g => { g.lineStyle(4, 0xb9a180); g.lineBetween(3, 28, 24, 5); g.lineStyle(5, 0xb6d1de); g.lineBetween(10, 2, 29, 12); });
    tex('sword-tool', 38, 14, g => { g.fillStyle(0xc4ffff); g.fillTriangle(8, 2, 38, 7, 8, 12); g.fillStyle(0xb09773); g.fillRect(0, 5, 11, 4); g.fillRect(8, 0, 3, 14); });
    tex('staff-tool', 36, 16, g => { g.fillStyle(0x998cb9); g.fillRect(0, 6, 28, 4); g.fillStyle(0xcdb4ff); g.fillTriangle(25, 0, 36, 8, 25, 16); });
    tex('gun-tool', 32, 14, g => { g.fillStyle(0x829caa); g.fillRect(0, 3, 28, 8); g.fillStyle(0x77ffdf); g.fillRect(15, 4, 17, 3); g.fillStyle(0x283b51); g.fillRect(3, 8, 7, 6); });
    tex('carbine-tool', 34, 14, g => { g.fillStyle(0x6f8f9c); g.fillRect(0, 2, 30, 9); g.fillStyle(0xa8ffe8); g.fillRect(18, 3, 16, 4); g.fillStyle(0x1e3344); g.fillRect(2, 9, 8, 5); g.fillRect(26, 0, 4, 4); });
    tex('held-dirt', 18, 18, g => { g.fillStyle(0x685142); g.fillRect(1, 1, 16, 16); g.fillStyle(0x526b4c); g.fillRect(1, 1, 16, 4); });
    tex('held-stone', 18, 18, g => { g.fillStyle(0x435463); g.fillRect(1, 1, 16, 16); g.fillStyle(0x8c9b9f); g.fillRect(1, 1, 16, 3); g.fillStyle(0x2a3844); g.fillRect(4, 8, 5, 3); });
    tex('held-brick', 18, 18, g => { g.fillStyle(0x536f78); g.fillRect(1, 1, 16, 16); g.fillStyle(0x7a9aa3); g.fillRect(1, 1, 16, 3); g.fillStyle(0x314850); g.fillRect(2, 7, 6, 3); g.fillRect(10, 12, 6, 3); });
    tex('held-torch', 14, 28, g => { g.fillStyle(0x94714c); g.fillRect(5, 10, 4, 16); g.fillStyle(0xffd18a); g.fillCircle(7, 7, 5); g.fillStyle(0xff9b5a); g.fillCircle(7, 6, 2); });
    tex('held-tonic', 14, 22, g => { g.fillStyle(0xd6fff2); g.fillRect(3, 6, 8, 14); g.fillStyle(0x62dfc3); g.fillRect(4, 12, 6, 7); g.fillStyle(0xb09773); g.fillRect(5, 2, 4, 5); });
    tex('held-resource', 16, 16, g => { g.fillStyle(0xc6aaa0); g.fillRect(2, 2, 12, 12); g.fillStyle(0xf0cb87); g.fillRect(5, 5, 6, 6); });
    tex('chest', 30, 24, g => { g.fillStyle(0xc39a60); g.fillRoundedRect(1, 1, 28, 22, 3); g.lineStyle(3, 0x4f5156); g.strokeRect(1, 1, 28, 22); g.fillStyle(0xe2eac0); g.fillRect(12, 8, 6, 8); });
}
