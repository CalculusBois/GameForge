import Phaser from 'phaser';
export function createAssets(s: Phaser.Scene, accent: number) {
    const texture = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => { if (s.textures.exists(key))
        return; const g = s.make.graphics({}, false); draw(g); g.generateTexture(key, w, h); g.destroy(); };
    for (const state of ['idle', 'run0', 'run1', 'air', 'fall', 'hurt'])
        texture(`hero-${state}`, 40, 48, g => {
            const rect = (x: number, y: number, w: number, h: number, c: number) => { g.fillStyle(c); g.fillRect(x, y, w, h); };
            rect(10, 3, 20, 15, 0x172b40);
            rect(12, 2, 16, 13, accent);
            rect(18, 7, 13, 5, 0xc7fcff);
            rect(9, 18, 20, 17, state === 'hurt' ? 0xffffff : accent);
            rect(14, 20, 9, 11, 0x263b52);
            rect(5, 19, 7, 14, 0x577089);
            rect(26, 20, 8, 9, accent);
            rect(29, 23, 11, 6, 0xc5d3dc);
            rect(34, 24, 6, 3, 0x203249);
            const shift = state === 'run0' ? 4 : state === 'run1' ? -4 : 0;
            const lift = state === 'air' ? 6 : 0;
            rect(10 + shift, 35 - lift, 8, 10, 0x6c859d);
            rect(23 - shift, 35 - (state === 'fall' ? 3 : lift), 8, 10, 0x6c859d);
            rect(8 + shift, 43 - lift, 11, 4, 0x172b40);
            rect(22 - shift, 43 - (state === 'fall' ? 3 : lift), 11, 4, 0x172b40);
        });
    texture('walker', 40, 40, g => { g.fillStyle(0xf48b77); g.fillRect(6, 9, 28, 19); g.fillTriangle(5, 9, 10, 0, 16, 9); g.fillTriangle(25, 9, 32, 0, 35, 9); g.fillStyle(0xffe3a1); g.fillRect(9, 14, 7, 4); g.fillRect(24, 14, 7, 4); g.fillStyle(0x6e405b); g.fillRect(4, 28, 9, 10); g.fillRect(27, 28, 9, 10); });
    texture('drone', 44, 32, g => { g.fillStyle(0xb598ff); g.fillTriangle(0, 12, 16, 7, 12, 24); g.fillTriangle(44, 12, 28, 7, 32, 24); g.fillRect(14, 7, 16, 18); g.fillStyle(0xeee2ff); g.fillRect(18, 12, 8, 7); g.fillStyle(0x54e8e0); g.fillRect(2, 25, 8, 3); g.fillRect(34, 25, 8, 3); });
    texture('turret', 40, 40, g => { g.fillStyle(0x798caa); g.fillRect(8, 15, 24, 20); g.fillRect(2, 33, 36, 7); g.fillStyle(0xffcc79); g.fillRect(5, 5, 30, 13); g.fillStyle(0x293548); g.fillRect(0, 9, 15, 6); g.fillStyle(0xff6c74); g.fillRect(22, 8, 6, 5); });
    texture('tile', 48, 48, g => { g.fillStyle(0x233447); g.fillRect(0, 0, 48, 48); g.fillStyle(0x5a8391); g.fillRect(0, 0, 48, 5); g.fillStyle(0x101e30); g.fillRect(3, 9, 42, 2); g.fillRect(23, 11, 2, 34); g.fillRect(0, 44, 48, 4); g.fillStyle(0x344c60); g.fillRect(6, 17, 12, 20); g.fillRect(30, 17, 12, 20); });
    texture('shot', 16, 6, g => { g.fillStyle(0x72f9e9); g.fillRect(0, 1, 16, 4); g.fillStyle(0xffffff); g.fillRect(7, 2, 9, 2); });
    texture('hostile', 12, 12, g => { g.fillStyle(0xff9775); g.fillCircle(6, 6, 6); g.fillStyle(0xffebbc); g.fillCircle(6, 6, 3); });
    texture('core', 24, 28, g => { g.fillStyle(0x72f9e9); g.fillTriangle(12, 0, 24, 14, 12, 28); g.fillTriangle(12, 0, 0, 14, 12, 28); g.fillStyle(0xe5ffff); g.fillRect(10, 9, 4, 10); });
    texture('door', 48, 72, g => { g.fillStyle(0x507286); g.fillRect(0, 0, 48, 72); g.fillStyle(0x0a1625); g.fillRect(6, 5, 36, 67); g.fillStyle(accent); g.fillRect(9, 9, 3, 55); g.fillRect(36, 9, 3, 55); g.fillRect(22, 25, 4, 26); });
    texture('spikes', 48, 20, g => { g.fillStyle(0xff7982); for (let x = 0; x < 48; x += 16)
        g.fillTriangle(x, 20, x + 8, 0, x + 16, 20); });
}
