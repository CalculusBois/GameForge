import { CreatorPanel } from './creator/CreatorPanel';
import type { CreationSpec } from './creator/spec';
import { SHOP_CATALOG } from './sandbox/registry/economy';
import { buySupply } from './sandbox/shop';
import { bossSites } from './sandbox/bossSites';
import { BOSS_REGISTRY } from './sandbox/registry/bosses';
import { MODULAR_WARDROBE, WEAPON_SKINS } from './sandbox/registry/cosmetics';
import { buyPart, buyPack, equipPart, packPrice, gunSkin, GUN_FAMILIES, STARTER_PARTS } from './sandbox/customization';
import { collectFurnace, storageTransfer, sortPack, quickStack, saleValue, sellResource } from './sandbox/simulation';
import { FOOD_PROFILES, COOKING_RECIPES, cookDish } from './sandbox/model';
import { useEffect, useRef, useState } from 'react';
import { SaveStore } from './sandbox/persistence';
import { startSandbox, type PlayerSessionSnapshot, type SandboxController, type SandboxHud, type Menu } from './sandbox/engine';
import { DEFAULT_WORLD, validateSettings, ITEMS, RECIPES, SMELTING_RECIPES, SMELTING_FUELS, SKINS, OBJECTIVES, CHUNK, TILE, add, remove, count, craft, smelt, unlock, claim, newWorld, equipItem, unequipItem, useVitalityCore, useManaCore, derivePlayerStats, type ItemId, type SkinId, type WorldSettings } from './sandbox/model';
import { itemIconUrl } from './sandbox/itemIcons';
import { landmarks } from './sandbox/terrain';
import { gameAudio } from './sandbox/audio';
let opening: Promise<SaveStore> | undefined;
function ItemIcon({ id, size = 'md', label }: { id: ItemId | string; size?: 'sm' | 'md'; label?: string }) {
    return <img className={`item-icon${size === 'sm' ? ' sm' : ''}`} src={itemIconUrl(id)} alt={label ?? ITEMS[id as ItemId]?.name ?? id} draggable={false} />;
}
function SkinPortrait({ id }: {
    id: SkinId;
}) { const skin = SKINS.find(s => s.id === id)!; return <svg viewBox="0 0 80 90" className="skin-art" aria-label={skin.name}><ellipse cx="40" cy="84" rx="26" ry="4" fill="#101d2b"/>{['knight', 'wanderer'].includes(id) && <path d="M24 30 L11 76 L46 67 L55 33" fill={id === 'knight' ? '#392a53' : '#6f5c9c'}/>}<path d="M24 35 H57 V62 H24Z M18 36 H25 V58 H18Z M57 36 H64 V58 H57Z" fill={skin.color}/><path d="M29 62 H38 V80 H25V74H29Z M45 62H54V74H58V80H45Z" fill="#96a9ad"/><path d="M27 10H56V32H27Z" fill={skin.color}/><path d="M35 18H59V26H35Z" fill="#d6fff2"/><path d="M34 40H47V59H34Z" fill="#294557"/>{id === 'ranger' && <path d="M22 12H64V18H22Z M31 5H53V12H31Z M10 38H17V65H10Z" fill="#9d7755"/>}{id === 'wanderer' && <path d="M25 14L29 0L36 12L43 0L48 12L55 0L59 14Z" fill="#d5bdff"/>}{id === 'neon' && <path d="M21 3H24V24H21Z M60 3H63V24H60Z M12 40H18V63H12Z M39 43H42V58H39Z" fill="#a8ffed"/>}{id === 'knight' && <path d="M20 0L30 14H23Z M63 0L54 14H61Z M18 31H31V39H18Z M54 31H68V39H54Z" fill="#c593b5"/>}{id === 'automaton' && <><path d="M22 8H62V31H22Z" fill="#a39260"/><path d="M29 17H37V23H29Z M49 17H57V23H49Z" fill="#beffee"/><circle cx="41" cy="48" r="6" fill="#f7e6a1"/></>}</svg>; }
type TutorialKind = 'move' | 'mine' | 'fight' | 'gather' | 'menu' | 'home';
function TutorialClip({ kind }: { kind: TutorialKind }) {
    return <div className={`tutorial-clip tutorial-clip-${kind}`} aria-hidden><div className="tutorial-stage"><span className="tut-sky"/><span className="tut-ground"/>
        {kind === 'move' && <><span className="tut-actor"/><span className="tut-key tut-key-a">A</span><span className="tut-key tut-key-d">D</span></>}
        {kind === 'mine' && <><span className="tut-block"/><span className="tut-actor"/><span className="tut-pick"/><span className="tut-spark"/></>}
        {kind === 'fight' && <><span className="tut-foe"/><span className="tut-actor"/><span className="tut-bolt"/></>}
        {kind === 'gather' && <><span className="tut-tree"/><span className="tut-actor"/><span className="tut-leaf"/></>}
        {kind === 'menu' && <><span className="tut-panel"/><span className="tut-tab tut-tab-i">I</span><span className="tut-tab tut-tab-c">C</span><span className="tut-tab tut-tab-m">M</span></>}
        {kind === 'home' && <><span className="tut-beacon"/><span className="tut-actor"/><span className="tut-ring"/></>}
    </div></div>;
}
const EMPTY: SandboxHud = { health: 100, maxHealth: 100, mana: 100, maxMana: 100, hunger: 100, defense: 0, status: 'paused', biome: 'Verdant frontier', selected: 1, message: 'Explore Lumen frontier', nearBase: true, fps: 0, chunks: 0, enemies: 0, bodies: 0, x: 288, y: 504, recall: 0, activeEffects: [] };
export default function App() {
    const [store, setStore] = useState<SaveStore | null>(null), [revision, setRevision] = useState(0), [hud, setHud] = useState(EMPTY), [menu, setMenu] = useState<Menu>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [pending, setPending] = useState(false), [slot, setSlot] = useState<number | null>(null), [settings, setSettings] = useState<WorldSettings>({ ...DEFAULT_WORLD }), [sellId, setSellId] = useState<ItemId>('stone'), [quantity, setQuantity] = useState(1), [debug, setDebug] = useState(false), [shake, setShake] = useState(true), [aiPrompt, setAiPrompt] = useState('');
    const [craftTab, setCraftTab] = useState<'all' | 'workbench' | 'forge' | 'smelting' | 'cooking'>('all');
    const beforeAIPlayer=useRef<PlayerSessionSnapshot|undefined>(undefined);
    const restorePlayer=useRef<PlayerSessionSnapshot|undefined>(undefined);
    const [creations,setCreations]=useState<CreationSpec[]>([]);
    const [sessionRevision,setSessionRevision]=useState(0);
    const [volume,setVolume]=useState(.35);
    const [gunFamily, setGunFamily] = useState<string>('blaster');
    const [recipeSearch, setRecipeSearch] = useState('');
    const [smeltOre, setSmeltOre] = useState<ItemId>('copper_ore');
    const [smeltFuel, setSmeltFuel] = useState<ItemId>('coal');
    const [smeltCount, setSmeltCount] = useState<number>(1);
    const [gameState, setGameState] = useState<'home' | 'worlds' | 'playing'>('home');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hudMenuOpen, setHudMenuOpen] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [cmdToast, setCmdToast] = useState<{ text: string; kind: 'health' | 'mana' | 'hunger' | 'info' } | null>(null);

    const [deleteTarget, setDeleteTarget] = useState('');
    const host = useRef<HTMLDivElement>(null), frame = useRef<HTMLDivElement>(null), engine = useRef<SandboxController | null>(null), dialog = useRef<HTMLElement | null>(null);
    useEffect(() => { let alive = true; opening ??= SaveStore.open(); void opening.then(s => { if (alive)
        setStore(s); }).catch(e => { if (alive)
        setError(String(e)); }); return () => { alive = false; }; }, []);
    useEffect(() => { if (!store)
        return; store.onChange = () => setRevision(v => v + 1); store.onError = m => setNotice(m); return () => { store.onChange = undefined; store.onError = undefined; }; }, [store]);
    const active = store?.data.active;
    useEffect(() => { if (!store || gameState !== 'playing' || !host.current)
        return; let alive = true; try {
        engine.current = startSandbox(host.current, store, h => { if (alive)
            setHud(h); }, m => { if (alive) {
            gameAudio.stopBgm();
            if (m === 'cooking') {
                setCraftTab('cooking');
                setMenu('crafting');
            } else {
                setMenu(m);
            }
        } }, undefined, restorePlayer.current);
        restorePlayer.current=undefined;
    }
    catch (e) {
        setError(String(e));
    } return () => { alive = false; engine.current?.destroy(); engine.current = null; }; }, [store, active, gameState, sessionRevision]);
    useEffect(() => { engine.current?.setShake(shake); engine.current?.setVolume(volume); gameAudio.setVolume(volume); }, [shake, volume, active, gameState]);
    useEffect(() => { if (menu)
        dialog.current?.focus(); }, [menu]);
    void revision;
    const open = (m: Menu, opts?: { craftTab?: typeof craftTab }) => { engine.current?.pause(); gameAudio.stopBgm(); setMenu(m); setSlot(null); setNotice(''); if (m === 'crafting' && opts?.craftTab) setCraftTab(opts.craftTab); };
    const act = async (fn: () => Promise<unknown>) => { if (pending)
        return; setPending(true); try {
        const result = await fn();
        engine.current?.feedback();
        if (typeof result === 'string')
            setNotice(result);
    }
    catch (e) {
        setNotice(e instanceof Error ? e.message : String(e));
    }
    finally {
        setPending(false);
    } };
    const enterAI = async () => {
        if(!store||store.aiSession)return;
        await engine.current?.save();
        beforeAIPlayer.current=engine.current?.capturePlayer();
        await store.beginAISession();
    };
    const exitAI = async () => {
        engine.current?.pause();
        await engine.current?.save();
        engine.current?.destroy(); engine.current=null;
        await store?.exitAISession();
        restorePlayer.current=beforeAIPlayer.current;beforeAIPlayer.current=undefined;
        setCreations([]);setSessionRevision(v=>v+1);setNotice('AI session exited. Pre-session progress restored.');
    };
    const resumeGame = () => { gameAudio.unlock(); gameAudio.startBgm(); engine.current?.resume(); };
    const close = () => { setMenu(null); setSlot(null); resumeGame(); };
    /** Leave the run and open the worlds / creation screen. */
    const goToWorlds = () => {
        void act(async () => {
            await engine.current?.save().catch(() => undefined);
            if(store?.aiSession)await exitAI();
            gameAudio.stopBgm();
            setMenu(null);
            setShowSearch(false);
            setShowTutorial(false);
            setHudMenuOpen(false);
            setGameState('worlds');
            return 'World select';
        });
    };
    const createAndEnterWorld = (fromSettings: WorldSettings = settings) => act(async () => {
        gameAudio.unlock();
        const seed = fromSettings.seed.trim() || `WORLD-${Date.now().toString(36).toUpperCase()}`;
        const next: WorldSettings = { ...fromSettings, seed };
        setSettings(next);
        await store!.transact(b => {
            const w = newWorld(crypto.randomUUID(), next);
            b.worlds[w.id] = w;
            b.active = w.id;
        });
        setMenu(null);
        setGameState('playing');
        gameAudio.startBgm();
        return `Created ${seed}`;
    });
    useEffect(() => {
        const unlock = () => gameAudio.unlock();
        window.addEventListener('pointerdown', unlock, { once: true });
        return () => window.removeEventListener('pointerdown', unlock);
    }, []);
    useEffect(() => {
        const click = (event: MouseEvent) => {
            if ((event.target as HTMLElement | null)?.closest('button, summary, .item-slot, .import-label')) gameAudio.ui();
        };
        document.addEventListener('click', click, true);
        return () => document.removeEventListener('click', click, true);
    }, []);
    useEffect(() => {
        if (gameState !== 'playing') {
            gameAudio.stopBgm();
            setHudMenuOpen(false); setShowSearch(false); setShowTutorial(false); setMenu(null);
        }
    }, [gameState]);
    useEffect(() => {
        if (gameState === 'playing' && hud.status === 'playing' && !menu && !showSearch && !showTutorial) gameAudio.startBgm();
        else gameAudio.stopBgm();
    }, [gameState, hud.status, menu, showSearch, showTutorial]);
    useEffect(() => {
        if (!hudMenuOpen) return;
        const close = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target?.closest('.hud-menu-container')) setHudMenuOpen(false);
        };
        // pointerdown in bubble phase after button handlers — use capture:false + next tick so menu item clicks land first
        const id = window.setTimeout(() => document.addEventListener('pointerdown', close), 0);
        return () => { window.clearTimeout(id); document.removeEventListener('pointerdown', close); };
    }, [hudMenuOpen]);
    useEffect(() => {
        if (hud.status !== 'playing') setHudMenuOpen(false);
    }, [hud.status]);
    useEffect(() => {
        if (!cmdToast) return;
        const id = window.setTimeout(() => setCmdToast(null), 3200);
        return () => window.clearTimeout(id);
    }, [cmdToast]);
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            if (event.key === 'Escape') {
                if (showTutorial) { event.preventDefault(); setShowTutorial(false); resumeGame(); }
                else if (showSearch) { event.preventDefault(); setShowSearch(false); setSearchQuery(''); resumeGame(); }
                return;
            }
            // Return / Enter opens search (Mac Return = Enter)
            if ((event.key === 'Enter' || event.code === 'Enter' || event.code === 'NumpadEnter') && !typing) {
                if (gameState !== 'playing' || hud.status !== 'playing' || showSearch || showTutorial || menu) return;
                event.preventDefault();
                setHudMenuOpen(false);
                engine.current?.pause();
                gameAudio.stopBgm();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showSearch, showTutorial, gameState, menu, hud.status]);
    if (!store)
        return <main className="loading"><p className="eyebrow">GAMEFORGE / LUMEN FRONTIER</p><h1>{error ? 'Your save is safe.' : 'Preparing your expedition…'}</h1><p>{error || 'Opening local world storage.'}</p>{error && <p>Close other game tabs and reload. Incompatible saves are never silently replaced.</p>}</main>;
    const worldsList = Object.values(store.data.worlds).sort((a, b) => b.created - a.created);
    const world = store.data.worlds[store.data.active], profile = store.data.profile;
    const transact = (fn: Parameters<SaveStore['transact']>[0]) => act(() => store.transact(fn));
    const deleteWorld = (id: string) => act(async () => {
        await engine.current?.save().catch(() => undefined);
        let emptied = false;
        await store.transact(b => {
            if (!b.worlds[id]) throw new Error('That world is already gone.');
            delete b.worlds[id];
            const remaining = Object.keys(b.worlds);
            if (!remaining.length) { b.active = ''; emptied = true; }
            else if (b.active === id) b.active = remaining[0]!;
        });
        setDeleteTarget('');
        if (emptied) { gameAudio.stopBgm(); setMenu(null); setGameState('worlds'); }
        else if (id === active) setMenu(null);
        return emptied ? 'All worlds deleted' : 'World deleted';
    });
    const closeSearch = () => { setShowSearch(false); setSearchQuery(''); resumeGame(); };
    const runSearch = () => {
        const query = searchQuery.trim();
        if (!query) { closeSearch(); return; }

        // /set <health|hp|mana|hunger|food> <n|max>
        const setCmd = /^\/set\s+(health|hp|mana|hunger|food)\s+(max|-?\d+)\s*$/i.exec(query);
        if (setCmd) {
            const stats = derivePlayerStats(world);
            const kind = setCmd[1]!.toLowerCase();
            const raw = setCmd[2]!.toLowerCase();
            const parseVal = (maxV: number) => raw === 'max' ? maxV : Number(raw);
            let toast: { text: string; kind: 'health' | 'mana' | 'hunger' | 'info' } | null = null;
            if (kind === 'health' || kind === 'hp') {
                const value = parseVal(stats.maxHealth);
                if (!Number.isFinite(value) || value < 0 || (raw !== 'max' && !Number.isSafeInteger(value))) toast = { text: 'Invalid health value.', kind: 'info' };
                else {
                    const clamped = Math.min(Math.max(0, Math.floor(value)), Math.max(stats.maxHealth, 9999));
                    engine.current?.setHealth(clamped);
                    setHud(h => ({ ...h, health: clamped, maxHealth: stats.maxHealth }));
                    toast = { text: raw === 'max' ? `Health → ${stats.maxHealth}/${stats.maxHealth}` : `Health → ${clamped}/${stats.maxHealth}`, kind: 'health' };
                }
            } else if (kind === 'mana') {
                const value = parseVal(stats.maxMana);
                if (!Number.isFinite(value) || value < 0 || (raw !== 'max' && !Number.isSafeInteger(value))) toast = { text: 'Invalid mana value.', kind: 'info' };
                else {
                    const clamped = Math.min(Math.max(0, Math.floor(value)), stats.maxMana);
                    engine.current?.setMana(clamped);
                    setHud(h => ({ ...h, mana: clamped, maxMana: stats.maxMana }));
                    toast = { text: raw === 'max' ? `Mana → ${stats.maxMana}/${stats.maxMana}` : `Mana → ${clamped}/${stats.maxMana}`, kind: 'mana' };
                }
            } else {
                const value = parseVal(100);
                if (!Number.isFinite(value) || value < 0 || (raw !== 'max' && !Number.isSafeInteger(value))) toast = { text: 'Invalid hunger value.', kind: 'info' };
                else {
                    const clamped = Math.min(100, Math.max(0, Math.floor(value)));
                    engine.current?.setHunger(clamped);
                    setHud(h => ({ ...h, hunger: clamped }));
                    toast = { text: raw === 'max' ? 'Hunger → 100/100' : `Hunger → ${clamped}/100`, kind: 'hunger' };
                }
            }
            closeSearch();
            if (toast) {
                setNotice(toast.text);
                setCmdToast(toast);
            }
            return;
        }

        // /give <item|coins> [amount]  — amount defaults to 1
        const give = /^\/give\s+([a-z0-9_]+)(?:\s+([+-]?\d+))?\s*$/i.exec(query);
        if (give) {
            const raw = give[1]!.toLowerCase();
            const amount = give[2] !== undefined ? Number(give[2]) : 1;
            const aliases: Record<string, ItemId> = {
                iron_bar: 'bar', ironbar: 'bar', iron_ore: 'iron',
                copper: 'copper_ore', copperbar: 'copper_bar',
                silver: 'silver_ore', silverbar: 'silver_bar',
                gold_ore_item: 'gold_ore', goldbar: 'gold_bar',
                cobalt: 'cobalt_ore', cobaltbar: 'cobalt_bar',
                timber: 'wood', logs: 'wood', log: 'wood',
                healing_herb: 'herb', herbs: 'herb',
                crystal_shard: 'crystal', crystals: 'crystal',
                scrap_metal: 'scrap', salvage: 'scrap',
                field_tonic: 'tonic', potion: 'tonic',
                lumen_torch: 'torch', torches: 'torch',
                outpost_block: 'brick', bricks: 'brick', soil: 'dirt', dirt_block: 'dirt',
                pick: 'pickaxe', field_pickaxe: 'pickaxe', axe: 'axe_wood',
                gun: 'blaster', blaster_gun: 'blaster',
                cooking_station: 'station_cooking', workbench: 'station_workbench', furnace: 'station_furnace',
            };
            if (!Number.isSafeInteger(amount) || amount === 0) {
                setNotice('Invalid amount.');
            } else if (['coins', 'coin', 'gold', 'money'].includes(raw)) {
                void act(async () => {
                    await store.transact((_b, w) => {
                        if (w.coins + amount < 0) throw new Error(`Not enough coins (have ${w.coins}).`);
                        w.coins += amount;
                        return `${amount > 0 ? '+' : ''}${amount} coins (now ${w.coins})`;
                    });
                });
            } else {
                const id = aliases[raw] ?? (raw in ITEMS ? raw as ItemId : null);
                if (!id) setNotice(`Unknown item "${raw}".`);
                else void act(async () => {
                    await store.transact((_b, w) => {
                        if (amount > 0 ? !add(w.inventory, id, amount) : !remove(w.inventory, id, -amount))
                            throw new Error(amount > 0 ? 'Inventory full — clear space first.' : `Not enough ${ITEMS[id].name}.`);
                        return `${amount > 0 ? 'Gave' : 'Removed'} ${Math.abs(amount)}× ${ITEMS[id].name}`;
                    });
                });
            }
            closeSearch();
            return;
        }

        // Slash commands stay silent in the UI — no public command list.
        if (query.startsWith('/')) setNotice('Nothing matched that search.');
        closeSearch();
    };
    if (gameState === 'home') return <main className="home-screen"><div className="home-card"><p className="eyebrow">LUMEN FRONTIER</p><h1>GAME<span>FORGE</span></h1><p>A WORLD TO DISCOVER</p><button className="primary" onClick={() => { gameAudio.unlock(); setGameState('worlds'); }}>START EXPEDITION</button></div></main>;
    if (gameState === 'worlds' || !world) return <main className="worlds-select"><header className="worlds-select-header"><div><p className="eyebrow">GAMEFORGE / LUMEN FRONTIER</p><h1>{worldsList.length ? 'Choose your world' : 'Create your first world'}</h1><p>Worlds keep their own progress. Shared cosmetics remain available in every expedition.</p></div><button onClick={() => setGameState('home')}>← Back</button></header>
        <section className="worlds-select-grid">{worldsList.map(w => <article className="world-card" key={w.id}><div><p className="eyebrow">{w.id === active ? 'ACTIVE SAVE' : 'SAVED WORLD'}</p><h2>{w.name}</h2><p>{w.settings.difficulty === 'extreme' ? 'EXTREME' : w.settings.difficulty} · seed {w.settings.seed}</p><p>◈ {w.coins} coins · {Object.keys(w.explored).length} chunks explored</p></div><button className="primary" disabled={pending} onClick={() => void act(async () => { gameAudio.unlock(); await store.transact(b => { b.active = w.id; }); setGameState('playing'); gameAudio.startBgm(); return `Entered ${w.name}`; })}>{w.id === active ? 'Continue this world →' : 'Enter this world →'}</button></article>)}</section>
        <section className="worlds-create-panel"><h2>Create a new world</h2><div className="generation-form"><label>Seed<input value={settings.seed} maxLength={80} onChange={e => setSettings({ ...settings, seed: e.target.value })} placeholder="LUMEN-01"/><button type="button" className="seed-roll" disabled={pending} onClick={() => setSettings({ ...settings, seed: `WORLD-${Math.random().toString(36).slice(2, 8).toUpperCase()}` })}>Random</button></label><label>Difficulty<select value={settings.difficulty} onChange={e => setSettings({ ...settings, difficulty: e.target.value as WorldSettings['difficulty'] })}><option value="explorer">Explorer</option><option value="standard">Standard</option><option value="extreme">EXTREME</option></select></label>{(['roughness', 'caves', 'abundance'] as const).map(key => <label key={key}>{key}<input type="range" min="0.6" max="1.4" step="0.1" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}/></label>)}</div><button type="button" className="primary" disabled={pending} onClick={() => void createAndEnterWorld()}>Create & start expedition →</button>
        {worldsList.length > 0 && <div className="world-delete-panel"><h3>Delete a world</h3><p>You can delete every world.</p><select value={deleteTarget} onChange={e => setDeleteTarget(e.target.value)}><option value="">Select a world…</option>{worldsList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select><button className="danger" disabled={pending || !deleteTarget} onClick={() => { const selected = store.data.worlds[deleteTarget]; if (selected && confirm(`Delete world “${selected.name}”? This cannot be undone.`)) void deleteWorld(deleteTarget); }}>Delete selected</button></div>}</section>{notice && <p role="status">{notice}</p>}</main>;
    return <main className="sandbox-app"><header className="sandbox-header"><div className="brand">GAME<span>FORGE</span><small>LUMEN FRONTIER · A WORLD TO DISCOVER</small></div><div className="header-right"><span className="ai-status" style={{ color: '#76e6c4' }}>✦ MIT Parley AI</span><button type="button" onClick={() => open('forge')} style={{ background: '#1d3557', color: '#76e6c4', borderColor: '#76e6c4', fontWeight: 'bold' }}>✦ MIT Parley Forge</button><button type="button" onClick={goToWorlds} disabled={pending}>Worlds & creation</button></div></header>
 <section className="world-shell" ref={frame}>{store.aiSession&&<div className="ai-session-banner">AI SESSION · All progress temporary <button onClick={()=>void exitAI()}>Exit & restore save</button></div>}{hud.aiMeters?.map(m=><div className="ai-meter" key={m.id} style={{borderColor:m.color}}><span>{m.icon} {m.label} {m.remaining>0?`· ${Math.ceil(m.remaining/1000)}s`:""}</span><meter min={0} max={m.maximum} value={m.value} style={{accentColor:m.color}}/></div>)}<div className="world-hud" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}><div className="hud-menu-container"><button type="button" className="hud-menu-btn" aria-label="Expedition menu" aria-expanded={hudMenuOpen} aria-haspopup="menu" onPointerDown={e => e.preventDefault()} onClick={() => setHudMenuOpen(v => !v)}>⋮</button>{hudMenuOpen && <div className="hud-dropdown" role="menu" onPointerDown={e => e.stopPropagation()}><button type="button" role="menuitem" onPointerDown={e => e.preventDefault()} onClick={() => { setHudMenuOpen(false); setMenu(null); setShowSearch(false); engine.current?.pause(); gameAudio.stopBgm(); setShowTutorial(true); }}>How to Play</button><button type="button" role="menuitem" onPointerDown={e => e.preventDefault()} onClick={() => { setHudMenuOpen(false); setMenu(null); setShowSearch(false); resumeGame(); }}>Continue Expedition</button><button type="button" role="menuitem" onPointerDown={e => e.preventDefault()} onClick={() => { setHudMenuOpen(false); void (store.aiSession ? exitAI() : (engine.current?.save() ?? Promise.resolve())).finally(() => { gameAudio.stopBgm(); setGameState('home'); }); }}>Quit Expedition</button></div>}</div><div className={`vital${cmdToast?.kind === 'health' ? ' vital-flash' : ''}`}><span>HEALTH <b>{hud.health}/{hud.maxHealth || 100}</b></span><meter min="0" max={Math.max(hud.maxHealth || 100, hud.health)} value={hud.health}/></div><div className={`vital mana${cmdToast?.kind === 'mana' ? ' vital-flash' : ''}`}><span>MANA <b>{hud.mana}/{hud.maxMana || 100}</b></span><meter min="0" max={hud.maxMana || 100} value={hud.mana}/></div><div className={`vital${cmdToast?.kind === 'hunger' ? ' vital-flash' : ''}`}><span>HUNGER <b>{Math.ceil(hud.hunger)}/100</b></span><meter min="0" max="100" value={hud.hunger}/></div>{cmdToast && <div className={`cmd-toast cmd-toast-${cmdToast.kind}`} role="status">{cmdToast.text}</div>}{hud.defense > 0 && <div className="vital" style={{ minWidth: 'auto', padding: '0 8px' }}><span style={{ color: '#8dd8f3' }}>DEF <b>+{hud.defense}</b></span></div>}{hud.activeEffects && hud.activeEffects.length > 0 && <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>{hud.activeEffects.map((eff, i) => <span key={i} title={`${eff.name} (${Math.ceil(eff.remainingMs / 1000)}s)`} style={{ background: '#1c2833', border: '1px solid #4a6572', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '2px' }}><span>{eff.icon}</span><span style={{ fontSize: '9px', color: '#c0d6df' }}>{eff.remainingMs > 60000 ? '∞' : `${Math.ceil(eff.remainingMs / 1000)}s`}</span></span>)}</div>}<div className="location"><strong>{hud.biome}</strong><small>{world.name} · {Math.floor(hud.y / TILE)}m depth</small></div><div className="coins">◈ {world.coins}<small>COINS</small></div><button type="button" className="hud-search-btn" aria-label="Search" title="Search" onPointerDown={e => e.preventDefault()} onClick={() => { setHudMenuOpen(false); engine.current?.pause(); gameAudio.stopBgm(); setShowSearch(true); }}>⌕</button><button type="button" onPointerDown={e => e.preventDefault()} onClick={() => { if (hud.status === 'paused' && !menu)
        resumeGame();
    else {
        engine.current?.pause();
        gameAudio.stopBgm();
        setMenu(null);
    } }}>{hud.status === 'paused' && !menu ? 'Play' : 'Pause'}</button><button type="button" aria-label="Fullscreen" onClick={() => { if (document.fullscreenElement)
        void document.exitFullscreen();
    else
        void frame.current?.requestFullscreen().catch(() => setNotice('Fullscreen is unavailable here.')); }}>⛶</button></div>
 {hud.boss && <div className="boss-bar"><strong>{hud.boss.name} · Phase {hud.boss.phase}</strong><meter min="0" max={hud.boss.maxHp} value={hud.boss.hp}/><span>{hud.boss.hp}/{hud.boss.maxHp}</span></div>}
 <div className="viewport"><div ref={host} className="game-host" aria-label="Lumen frontier sandbox game"/>
 {import.meta.env.DEV && debug && <div className="debug">{hud.fps} FPS · {hud.chunks}/15 chunks · {hud.enemies}/12 enemies · {hud.bodies} terrain bodies · {Math.floor(hud.x)},{Math.floor(hud.y)}</div>}
 </div>
 {showSearch && <div className="search-overlay" role="dialog" aria-label="Search"><div><input autoFocus placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}/><button type="button" onClick={closeSearch}>✕</button></div></div>}
 {showTutorial && <div className="tutorial-overlay" role="dialog" aria-label="How to play"><section className="tutorial-card"><header><div><p className="eyebrow">FIELD MANUAL</p><h2>How to Play</h2></div><button type="button" onClick={() => { setShowTutorial(false); resumeGame(); }}>Close ×</button></header><div className="tutorial-grid">
    <article><TutorialClip kind="move"/><h3>Move</h3><p>A/D or arrow keys walk. Space jumps.</p></article>
    <article><TutorialClip kind="mine"/><h3>Mine & place</h3><p>J or click mines. F or right-click places blocks.</p></article>
    <article><TutorialClip kind="fight"/><h3>Fight</h3><p>Weapons fire toward your pointer. Watch health, mana, hunger, and effects.</p></article>
    <article><TutorialClip kind="gather"/><h3>Gather</h3><p>Hold E to chop trees (~1.2s) and forage plants. Tap E for chests and stations.</p></article>
    <article><TutorialClip kind="menu"/><h3>Menus</h3><p>I inventory · C crafting · M map · 1–8 selects gear.</p></article>
    <article><TutorialClip kind="home"/><h3>Recall</h3><p>Press H to recall to the outpost. Damage cancels recall.</p></article>
 </div></section></div>}
 {!menu && !showSearch && !showTutorial && hud.status !== 'playing' && <div className="continue-overlay" role="dialog" aria-label={hud.status === 'dead' ? 'Respawn' : 'Continue Expedition'}><div><p className="eyebrow">{hud.status === 'dead' ? 'BEACON SIGNAL RECEIVED' : 'LUMEN OUTPOST / EXPEDITION PAUSED'}</p><h2>{hud.status === 'dead' ? 'Your journey continues.' : 'A strange new frontier.'}</h2><p>{hud.status === 'dead' ? 'Respawn at the outpost. Your inventory, coins, and skins are retained.' : 'Explore living hills and buried ruins. Gather, craft, and make this planet your own.'}</p><button type="button" className="primary" onClick={() => { if (hud.status === 'dead') engine.current?.respawn(); else resumeGame(); }}>{hud.status === 'dead' ? 'Return to checkpoint · R' : 'Continue Expedition'}</button><p className="start-tip">Hold E chops trees (~1.2s) · J mines · 1–8 selects equipment</p></div></div>}
 {menu && <div className="menu-shade"><section ref={dialog} tabIndex={-1} className="game-menu" aria-label={`${menu} panel`}><div className="menu-heading"><div><p className="eyebrow">EXPEDITION PAUSED</p><h2>{{ inventory: 'Pack & equipment', crafting: 'Outpost crafting', cooking: 'Cooking station', skins: 'Explorer wardrobe', objectives: 'Earn coins', shop: 'Salvage exchange', map: 'Survey map', worlds: 'Your worlds', settings: 'Expedition settings', forge: '✦ MIT Parley Generative Forge', storage: 'Storage crate' }[menu]}</h2></div><button onClick={close} disabled={pending}>Close & play ×</button></div><div className="menu-content">
 {menu === 'storage' && hud.storageKey && <><p>Click a pack stack to deposit it; click a stored stack to withdraw it. Nonempty crates cannot be mined.</p><h3>Pack</h3><div className="recipe-grid">{world.inventory.map((s, i) => s && <button key={i} disabled={pending} onClick={() => void transact((_b,w) => storageTransfer(w,hud.storageKey!,i,true))}><ItemIcon id={s.id} size="sm" /> {ITEMS[s.id].name} ×{s.count} →</button>)}</div><h3>Crate</h3><div className="recipe-grid">{world.containers?.[hud.storageKey]?.map((s,i) => s && <button key={i} disabled={pending} onClick={() => void transact((_b,w) => storageTransfer(w,hud.storageKey!,i,false))}>← {ITEMS[s.id].name} ×{s.count}</button>)}</div></>}
 {menu === 'inventory' && <div><button onClick={() => void transact((_b,w) => { sortPack(w.inventory); return 'Sorted pack; hotbar preserved'; })}>Sort pack</button><button onClick={() => void transact((_b,w) => quickStack(w,Object.keys(w.containers ?? {}).filter(k => { const [x,y] = k.split(',').map(Number); return Math.hypot(x*TILE-hud.x,y*TILE-hud.y)<120; })))}>Quick stack nearby</button><p>Eat food from your hotbar with J. Cooked meal bonuses replace the previous meal.</p>{world.meal && <p>{world.meal.name}: {Math.ceil(world.meal.remainingMs/1000)}s remaining</p>}</div>}
 {menu === 'inventory' && <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', background: '#0e1a24', border: '1px solid #243a49', borderRadius: '8px', padding: '12px' }}>
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#76e6c4', letterSpacing: '0.05em' }}>EQUIPPED ARMOR & CHARMS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {(['head', 'chest', 'legs', 'accessory1', 'accessory2'] as const).map(s => {
            const eqItem = world.equipment?.[s];
            const itemDef = eqItem ? ITEMS[eqItem] : null;
            const slotLabel = s === 'accessory1' ? 'Acc 1' : s === 'accessory2' ? 'Acc 2' : s.toUpperCase();
            return (
              <div key={s} style={{ background: '#152430', border: '1px solid #314a5c', borderRadius: '6px', padding: '6px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '74px' }}>
                <small style={{ fontSize: '9px', color: '#88aab8', fontWeight: 600 }}>{slotLabel}</small>
                {itemDef ? (
                  <>
                    <ItemIcon id={eqItem!} />
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#eef6f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50px' }}>{itemDef.name}</span>
                    <button style={{ padding: '2px 4px', fontSize: '9px', marginTop: '2px', background: '#253d4e', border: '1px solid #4a6c82' }} disabled={pending} onClick={() => void transact((_b, w) => unequipItem(w, s))}>Unequip</button>
                  </>
                ) : (
                  <span style={{ fontSize: '11px', color: '#4a6575', margin: 'auto' }}>Empty</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(() => {
        const stats = derivePlayerStats(world);
        const vitCores = world.upgrades?.vitalityCores ?? 0;
        const manaCores = world.upgrades?.manaCores ?? 0;
        const hasVitCore = count(world.inventory, 'vitality_core') > 0;
        const hasManaCore = count(world.inventory, 'mana_core') > 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#ffd8a8', letterSpacing: '0.05em' }}>ATTRIBUTES & CORES</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: '11px', color: '#c0d6df' }}>
              <div>Max HP: <b style={{ color: '#76e6c4' }}>{stats.maxHealth}</b></div>
              <div>Max Mana: <b style={{ color: '#9b59b6' }}>{stats.maxMana}</b></div>
              <div>Defense: <b style={{ color: '#8dd8f3' }}>+{stats.defense}</b></div>
              <div>Move Speed: <b>{Math.round(stats.speedMultiplier * 100)}%</b></div>
              <div>Mining Speed: <b>{Math.round(stats.mineSpeedMultiplier * 100)}%</b></div>
              <div>Knockback Resist: <b>{Math.round(stats.knockbackResistance * 100)}%</b></div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', background: '#12202b', border: '1px solid #283e4e', padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>💚 Vitality: {vitCores}/10</span>
                {hasVitCore && vitCores < 10 && (
                  <button style={{ padding: '1px 5px', fontSize: '9px', background: '#1f5f40', color: '#b7f4d2' }} disabled={pending} onClick={() => void transact((_b, w) => useVitalityCore(w))}>Use Core</button>
                )}
              </div>
              <div style={{ fontSize: '10px', background: '#12202b', border: '1px solid #283e4e', padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✦ Mana: {manaCores}/10</span>
                {hasManaCore && manaCores < 10 && (
                  <button style={{ padding: '1px 5px', fontSize: '9px', background: '#4a2566', color: '#e8c9ff' }} disabled={pending} onClick={() => void transact((_b, w) => useManaCore(w))}>Use Core</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>

    <div>
      <p style={{ margin: '0 0 6px 0', fontSize: '12px' }}>Click an item, then a slot to move or swap it. The first eight slots are your hotbar. Resources belong to this world.</p>
      <div className="inventory-grid">{world.inventory.map((s, i) => <button key={i} className={`item-slot ${i < 8 ? 'quick' : ''} ${slot === i ? 'chosen' : ''}`} title={s ? `${ITEMS[s.id].name} ×${s.count} — ${ITEMS[s.id].description}` : `Empty slot ${i + 1}`} onClick={() => { if (slot === null)
            setSlot(i);
        else {
            const source = slot;
            void transact((_b, w) => { [w.inventory[source], w.inventory[i]] = [w.inventory[i], w.inventory[source]]; });
            setSlot(null);
        } }}><small>{i + 1}</small>{s && <><span><ItemIcon id={s.id} /></span><em>{s.count}</em><label>{ITEMS[s.id].name}</label></>}</button>)}</div>
      {slot !== null && world.inventory[slot] && (() => {
        const item = world.inventory[slot]!;
        const itemDef = ITEMS[item.id];
        return (
          <div style={{ marginTop: '8px', background: '#101d28', border: '1px solid #2c4354', borderRadius: '6px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ color: '#ffd8a8', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ItemIcon id={item.id} size="sm" /> {itemDef.name}</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#9fc1cc' }}>{itemDef.description}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {itemDef.category === 'equipment' && (
                <>
                  {item.id.startsWith('helmet_') && <button className="primary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={pending} onClick={() => { void transact((_b, w) => equipItem(w, 'head', item.id)); setSlot(null); }}>Equip to Head</button>}
                  {item.id.startsWith('chest_') && <button className="primary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={pending} onClick={() => { void transact((_b, w) => equipItem(w, 'chest', item.id)); setSlot(null); }}>Equip to Chest</button>}
                  {(item.id.startsWith('boots_') || item.id === 'boots_iron') && item.id !== 'boots_speed' && <button className="primary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={pending} onClick={() => { void transact((_b, w) => equipItem(w, 'legs', item.id)); setSlot(null); }}>Equip to Legs</button>}
                  {(item.id.startsWith('charm_') || item.id === 'boots_speed') && (
                    <>
                      <button className="primary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={pending} onClick={() => { void transact((_b, w) => equipItem(w, 'accessory1', item.id)); setSlot(null); }}>Equip to Acc 1</button>
                      <button className="primary" style={{ padding: '4px 8px', fontSize: '11px' }} disabled={pending} onClick={() => { void transact((_b, w) => equipItem(w, 'accessory2', item.id)); setSlot(null); }}>Equip to Acc 2</button>
                    </>
                  )}
                </>
              )}
              {item.id === 'vitality_core' && (world.upgrades?.vitalityCores ?? 0) < 10 && (
                <button className="primary" style={{ padding: '4px 8px', fontSize: '11px', background: '#1f5f40' }} disabled={pending} onClick={() => { void transact((_b, w) => useVitalityCore(w)); setSlot(null); }}>Consume Vitality Core (+10 HP)</button>
              )}
              {item.id === 'mana_core' && (world.upgrades?.manaCores ?? 0) < 10 && (
                <button className="primary" style={{ padding: '4px 8px', fontSize: '11px', background: '#4a2566' }} disabled={pending} onClick={() => { void transact((_b, w) => useManaCore(w)); setSlot(null); }}>Consume Mana Core (+10 MP)</button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  </div>}
 {menu === 'crafting' && <><input aria-label="Search recipes" placeholder="Search recipes…" value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)}/>{world.pinnedRecipe && <p>Pinned: {RECIPES.find(r => r.id === world.pinnedRecipe)?.name} · {Object.entries(RECIPES.find(r => r.id === world.pinnedRecipe)?.ingredients ?? {}).map(([id,n]) => `${ITEMS[id as ItemId].name} ${count(world.inventory,id as ItemId)}/${n}`).join(' · ')}</p>}<div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}><button className={craftTab === 'all' ? 'primary' : ''} onClick={() => setCraftTab('all')}>All Recipes ({RECIPES.length})</button><button className={craftTab === 'workbench' ? 'primary' : ''} onClick={() => setCraftTab('workbench')}>Workbench</button><button className={craftTab === 'forge' ? 'primary' : ''} onClick={() => setCraftTab('forge')}>Forge Equipment</button><button className={craftTab === 'cooking' ? 'primary' : ''} onClick={() => setCraftTab('cooking')} style={{ background: craftTab === 'cooking' ? '#c47a3a' : '#2a1c14', borderColor: '#e0a060', color: '#ffd9b0', fontWeight: 'bold' }}>🍳 Cooking Station</button><button className={craftTab === 'smelting' ? 'primary' : ''} onClick={() => setCraftTab('smelting')} style={{ background: craftTab === 'smelting' ? '#e67e22' : '#2c1e14', borderColor: '#e67e22', color: '#ffd8a8', fontWeight: 'bold' }}>🔥 Furnace Smelting</button></div>{world.furnace && <article><h3>Furnace output: {world.furnace.stored} {ITEMS[world.furnace.output].name}</h3><p>{world.furnace.remaining} queued · fuel remaining {(world.furnace.fuelMs/1000).toFixed(1)}s</p><progress max={10000} value={world.furnace.progressMs}/><button disabled={!hud.nearFurnace || !world.furnace.stored || pending} onClick={() => void transact((_b,w) => collectFurnace(w,!!hud.nearFurnace))}>Collect output</button><p>Close this menu to process the batch. Output stays safe when your pack is full.</p></article>}{craftTab === 'cooking' ? <><p>{hud.nearCooking ? 'Cooking station connected · place meals on the spit or use the outpost kitchen.' : 'Return to the outpost cooking station, or place a Cooking station from your pack.'} One meal buff at a time; no spoilage. Select food in your hotbar and press J to eat.</p><div className="recipe-grid">{COOKING_RECIPES.map(r => <article key={r.id}><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemIcon id={r.output.id} size="sm" />{r.name}</h3><p>{Object.entries(r.ingredients).map(([id,n]) => `${ITEMS[id as ItemId].name} ${count(world.inventory,id as ItemId)}/${n}`).join(' · ')}</p><p>+{FOOD_PROFILES[r.output.id].hungerRestore} hunger · {FOOD_PROFILES[r.output.id].buff?.description}</p><button disabled={!hud.nearCooking || pending} onClick={() => void transact((_b,w) => cookDish(w,r.id,!!hud.nearCooking))}>Cook</button></article>)}</div></> : craftTab === 'smelting' ? <div className="smelting-panel" style={{ background: '#13212b', border: '1px solid #3c5665', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}><p style={{ margin: 0, color: '#9fc1cc' }}>{hud.nearBase ? 'Linked furnace: one shared output/queue per world. 10 seconds per bar during active play. Coal burns 80s; wood burns 20s. Processing pauses in menus and while closed.' : 'Return to the outpost to operate the smelting furnace.'}</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}><label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#c0d6df' }}><span>1. Choose Raw Ore:</span><select value={smeltOre} onChange={e => setSmeltOre(e.target.value as ItemId)}>{SMELTING_RECIPES.map(r => <option key={r.oreId} value={r.oreId}><ItemIcon id={r.oreId} size="sm" /> {r.name} ({r.oreCount} {ITEMS[r.oreId].name}/bar) · {count(world.inventory, r.oreId)} in pack</option>)}</select></label><label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#c0d6df' }}><span>2. Choose Smelting Fuel:</span><select value={smeltFuel} onChange={e => setSmeltFuel(e.target.value as ItemId)}><option value="coal"><ItemIcon id="coal" size="sm" /> Coal (8 smelts / unit) · {count(world.inventory, 'coal')} in pack</option><option value="wood"><ItemIcon id="wood" size="sm" /> Timber (2 smelts / unit) · {count(world.inventory, 'wood')} in pack</option></select></label><label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#c0d6df' }}><span>3. Quantity to Smelt:</span><input type="number" min="1" max="99" value={smeltCount} onChange={e => setSmeltCount(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}/></label></div>{(() => { const recipe = SMELTING_RECIPES.find(r => r.oreId === smeltOre) ?? SMELTING_RECIPES[0]; const fuelDef = SMELTING_FUELS[smeltFuel as 'coal' | 'wood'] ?? SMELTING_FUELS.coal; const oreNeeded = recipe.oreCount * smeltCount; const fuelNeeded = Math.ceil(smeltCount / fuelDef.smeltsPerUnit); const haveOre = count(world.inventory, recipe.oreId); const haveFuel = count(world.inventory, fuelDef.id); const canSmelt = !(world.furnace && (world.furnace.remaining || world.furnace.stored)) && hud.nearFurnace && haveOre >= oreNeeded && haveFuel >= fuelNeeded && !pending; return <div style={{ background: '#0e1822', border: '1px solid #253a48', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}><div><strong style={{ fontSize: '14px', color: '#ffd8a8' }}>Reserve inputs: {smeltCount} × {ITEMS[recipe.outputBarId].name}</strong><div style={{ fontSize: '12px', color: '#8aa6b1', marginTop: '4px' }}>Ore: <span style={{ color: haveOre >= oreNeeded ? '#76e6c4' : '#e74c3c' }}>{haveOre}/{oreNeeded} {ITEMS[recipe.oreId].name}</span>{' · '}Fuel: <span style={{ color: haveFuel >= fuelNeeded ? '#76e6c4' : '#e74c3c' }}>{haveFuel}/{fuelNeeded} {fuelDef.name}</span></div></div><button className="primary" disabled={!canSmelt} onClick={() => void transact((_b, w) => smelt(w, recipe.oreId, fuelDef.id, smeltCount, !!hud.nearFurnace))} style={{ padding: '10px 20px', fontSize: '12px' }}>Queue {smeltCount} {ITEMS[recipe.outputBarId].name}</button></div></div>; })()}</div> : <><p>{hud.nearBase ? 'Workbench and forge connected.' : 'Return to the outpost to use the workbench and forge.'} Crafted items go into your pack; move equipment into a hotbar slot.</p><div className="recipe-grid">{RECIPES.filter(r => r.id !== 'bar' && r.name.toLowerCase().includes(recipeSearch.toLowerCase()) && (craftTab === 'all' || (craftTab === 'workbench' ? r.station === 'Workbench' : r.station === 'Forge'))).map(r => { const enough = Object.entries(r.ingredients).every(([id, n]) => count(world.inventory, id as ItemId) >= n); return <article key={r.id}><div className="recipe-title"><span><ItemIcon id={r.output.id} /></span><h3>{r.name} <small>×{r.output.count}</small></h3></div><p>{r.station}</p><button onClick={() => void transact((_b,w) => { w.pinnedRecipe = r.id; return `Pinned ${r.name}`; })}>Pin recipe</button><div className="ingredients">{Object.entries(r.ingredients).map(([id, n]) => <span key={id} className={count(world.inventory, id as ItemId) >= n ? 'available' : ''}>{ITEMS[id as ItemId].name} {count(world.inventory, id as ItemId)}/{n}</span>)}</div><button disabled={!enough || !hud.nearCrafting || pending} onClick={() => void transact((_b, w) => craft(w, r.id, !!hud.nearCrafting))}>Craft {ITEMS[r.output.id].name}</button></article>; })}</div></>}</>}
 {menu === 'skins' && <><h3>Mix-and-match wardrobe</h3><p>Each part is appearance only. Owned parts equip free; packs credit parts you already own.</p><button onClick={() => void transact(b => { b.profile.outfit = {}; return 'Legacy full-body appearance restored'; })}>Use full-body skin</button><div className="recipe-grid">{[...new Set(Object.values(MODULAR_WARDROBE).map(p=>p.setName))].map(name=><article key={name}><h3>{name}</h3><button disabled={pending} onClick={()=>void transact(b=>buyPack(b,name))}>Unlock remaining pack · {packPrice(store.data,name)} coins</button></article>)}</div><div className="recipe-grid">{Object.values(MODULAR_WARDROBE).map(p=>{const owned=(profile.parts ?? STARTER_PARTS).includes(p.id);return <article key={p.id}><svg viewBox="0 0 48 40" width="72" height="60" aria-label={`${p.slot} preview`}><path d={p.slot==='head'?'M10 5H38V29H10Z':p.slot==='legs'?'M12 4H21V35H8V28H12Z M27 4H36V28H40V35H27Z':p.slot==='arms'?'M4 6H15V32H4Z M33 6H44V32H33Z':'M10 3H38V37H10Z'} fill={p.color}/><path d="M17 13H31V17H17Z" fill="#d5fff1"/></svg><h3>{p.name}</h3><p>{p.slot} · {owned?'Owned':`${p.price} coins`}</p><button disabled={pending || profile.outfit?.[p.slot]===p.id} onClick={()=>void transact(b=>owned?equipPart(b,p.id):buyPart(b,p.id))}>{profile.outfit?.[p.slot]===p.id?'Equipped':owned?'Equip free':'Unlock'}</button></article>})}</div><h3>Weapon appearances</h3><select aria-label="Gun family" value={gunFamily} onChange={e=>setGunFamily(e.target.value)}>{GUN_FAMILIES.map(id=><option key={id} value={id}>{ITEMS[id].name}</option>)}</select><div className="recipe-grid">{Object.values(WEAPON_SKINS).map(s=>{const owned=(profile.gunSkins ?? ['skin_brushed_steel']).includes(s.id);return <article key={s.id}><svg width="120" height="44" viewBox="0 0 60 22" aria-label={s.name}><path d="M3 4H44V13H17V21H9V13H3Z" fill={s.palette.primary}/><path d="M44 6H59V10H44Z M8 5H15V9H8Z" fill={s.palette.secondary}/></svg><h3>{s.name}</h3><button disabled={pending || profile.guns?.[gunFamily]===s.id} onClick={()=>void transact(b=>gunSkin(b,s.id,gunFamily,!owned))}>{profile.guns?.[gunFamily]===s.id?'Equipped':owned?'Equip free':`Unlock · ${s.price} coins`}</button></article>})}</div></>}
 {menu === 'skins' && <><p>Cosmetics belong to your local player profile and work across worlds. Coins are spent from this world. Skins never change combat stats.</p><div className="skin-grid">{SKINS.map(s => { const owned = profile.owned.includes(s.id), equipped = profile.equipped === s.id; return <article key={s.id} className={equipped ? 'equipped' : ''}><SkinPortrait id={s.id}/><h3>{s.name}</h3><p>{s.description}</p><button disabled={equipped || pending} onClick={() => void transact((b) => { if (owned) {
            if (!b.profile.owned.includes(s.id))
                throw new Error('Unlock this skin first.');
            b.profile.equipped = s.id;
            return `${s.name} equipped`;
        } return unlock(b, s.id); })}>{equipped ? 'Equipped' : owned ? 'Equip · free' : `Unlock · ${s.price} coins`}</button></article>; })}</div></>}
 {menu === 'objectives' && <><p>One-time objectives for this world. Progress comes from exploring, mining, fighting, and crafting. Claim each reward once.</p><div className="objective-list">{OBJECTIVES.map(o => { const done = world.progress[o.id] >= o.total, claimed = world.claimed.includes(o.id); return <article key={o.id}><div><h3>{o.name}</h3><p>{Math.min(world.progress[o.id], o.total)} / {o.total} · {claimed ? 'Claimed' : done ? 'Complete' : 'Active'}</p><progress max={o.total} value={world.progress[o.id]}/></div><button disabled={!done || claimed || pending} onClick={() => void transact((_b, w) => claim(w, o.id))}>{claimed ? 'Reward claimed' : `Claim ${o.reward} coins`}</button></article>; })}</div></>}
 {menu === 'shop' && <div className="recipe-grid">{SHOP_CATALOG.map(p=><article key={p.itemId}><h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemIcon id={p.itemId} size="sm" /> {p.name}</h3><p>{p.count} items · {p.buyPrice} coins</p><button disabled={pending || !hud.nearBase || world.coins<p.buyPrice} onClick={()=>void transact((_b,w)=>buySupply(w,p.itemId,hud.nearBase))}>Buy</button></article>)}</div>}
 {menu === 'shop' && <><p>{hud.nearBase ? 'Bulk sales: 20 timber/stone → 1 coin; 40 soil → 1; 10 herbs → 1; 10 scrap → 2. Gold ore/bars and crafted items cannot be sold.' : 'Return to the outpost terminal to sell resources.'}</p><p>Uncollected combat resources are safely held here when your pack is full.</p><button disabled={!hud.nearBase || pending} onClick={() => void transact((_b, w) => { let total = 0; for (const [id, n] of Object.entries(w.pendingLoot ?? {})) {
            if (n && add(w.inventory, id as ItemId, n)) {
                delete w.pendingLoot[id as ItemId];
                total += n;
            }
        } return total ? `Collected ${total} held resources` : 'No held resources, or your inventory is still full.'; })}>Collect held resources ({Object.values(world.pendingLoot ?? {}).reduce((n, v) => n + (v ?? 0), 0)})</button><div className="sell-form"><label>Resource<select value={sellId} onChange={e => setSellId(e.target.value as ItemId)}>{(Object.keys(ITEMS) as ItemId[]).filter(id => saleValue(id,40)>0).map(id => <option value={id} key={id}>{ITEMS[id].name} · {count(world.inventory, id)} in pack</option>)}</select></label><label>Quantity<input type="number" min="1" max="999" value={quantity} onChange={e => setQuantity(Number(e.target.value))}/></label><p>{quantity} × {ITEMS[sellId].value} = <strong>{saleValue(sellId,quantity)} coins</strong></p><button className="primary" disabled={!hud.nearBase || pending || !Number.isInteger(quantity) || quantity < 1 || count(world.inventory, sellId) < quantity} onClick={() => void transact((_b, w) => { if (!hud.nearBase) throw new Error('Return to the outpost.'); return sellResource(w,sellId,quantity); })}>Sell {quantity} for {saleValue(sellId,quantity)} coins</button></div></>}
 {menu === 'map' && <div>{bossSites(world.settings).filter(s=>world.discoveredBosses?.includes(s.id)).map(s=><p key={s.id}>◆ {BOSS_REGISTRY[s.id].name}: {s.x}, {s.floor} {world.defeated.includes(`boss:${s.id}`)?'— defeated':'— press E at shrine'}</p>)}</div>}
 {menu === 'map' && <><p>Only surveyed chunks are shown. ◈ marks discovered caches; ● marks the outpost. Use Recall to return safely.</p><svg viewBox="0 0 620 300" className="survey-map" role="img" aria-label="Explored terrain map">{Object.entries(world.explored).slice(-1000).map(([key, b]) => { const [x, y] = key.split(',').map(Number), cx = Math.floor(hud.x / (CHUNK * TILE)); return <g key={key}><rect x={300 + (x - cx) * 22} y={y * 45 + 20} width="21" height="44" fill={b === 'Crystal depths' ? '#706195' : b === 'Rust wastes' ? '#9e7660' : '#608b79'}/>{landmarks(world.settings, x).some(l => Math.floor(l.y / CHUNK) === y) && <text x={305 + (x - cx) * 22} y={y * 45 + 42} fill="#f5d08f" fontSize="10">◈</text>}{x === 0 && y === 0 && <text x={305 + (x - cx) * 22} y="38" fill="#fff">●</text>}</g>; })}<circle cx={311} cy={Math.floor(hud.y / (CHUNK * TILE)) * 45 + 42} r="4" fill="#fff"/></svg><button onClick={() => { setMenu(null); engine.current?.recall(); }}>Recall to outpost · 2.5 seconds</button></>}
 {menu === 'worlds' && <><p>Worlds store their own items, coins, objectives, and terrain changes. Skins are shared. Saves live in this browser only; they are not cloud-synced.</p><div className="world-list">{Object.values(store.data.worlds).map(w => <button key={w.id} disabled={w.id === active || pending} onClick={() => void act(async () => { await engine.current?.save(); await store.transact(b => { b.active = w.id; }); setMenu(null); })}>{w.name} {w.id === active ? '· Current' : '· Load world'}</button>)}</div><div className="world-delete-panel in-menu"><h3>Delete a world</h3><p>You can delete every world. Deleting the last returns to world select.</p><select value={deleteTarget} onChange={e => setDeleteTarget(e.target.value)}><option value="">Select a world…</option>{Object.values(store.data.worlds).map(w => <option key={w.id} value={w.id}>{w.name}{w.id === active ? ' (current)' : ''}</option>)}</select><button className="danger" disabled={pending || !deleteTarget} onClick={() => { const selected = store.data.worlds[deleteTarget]; if (selected && confirm(`Delete world “${selected.name}”? This cannot be undone.`)) void deleteWorld(deleteTarget); }}>Delete selected</button></div><details><summary>Create a new world · existing worlds are kept</summary><div className="generation-form"><label>Seed<input value={settings.seed} maxLength={80} onChange={e => setSettings({ ...settings, seed: e.target.value })}/></label><label>Difficulty<select value={settings.difficulty} onChange={e => setSettings({ ...settings, difficulty: e.target.value as WorldSettings['difficulty'] })}><option value="explorer">Explorer</option><option value="standard">Standard</option><option value="extreme">EXTREME</option></select></label>{(['roughness', 'caves', 'abundance'] as const).map(key => <label key={key}>{key}<input type="range" min="0.6" max="1.4" step="0.1" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })}/></label>)}<button type="button" className="primary" disabled={pending} onClick={() => void createAndEnterWorld()}>Create new world</button></div></details><p>Terrain settings are fixed once a world is created. New terrain settings require a new world.</p><details open><summary>✦ AI World Creation · MIT Parley AI</summary><div className="generation-form" style={{ gridTemplateColumns: '1fr', marginTop: '10px' }}><label>Describe game world, terrain, or difficulty:<textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Higher mountain peaks, cavernous cave network, standard difficulty, abundant crystals..." rows={3} disabled={pending}/></label><button className="primary" disabled={pending || !aiPrompt.trim()} onClick={() => void act(async () => { setNotice('Requesting world generation from MIT Parley API…'); const res = await fetch('/api/edit-game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: aiPrompt, currentState: world.settings, gameType: 'sandbox' }) }); const result = await res.json(); if (!result.ok) throw new Error(result.error || 'Parley API request failed.'); if (result.data) { const newSettings = result.data as WorldSettings; validateSettings(newSettings); setSettings(newSettings); await engine.current?.save(); await enterAI(); await store.transact(b => { const w = newWorld(crypto.randomUUID(), newSettings); b.worlds[w.id] = w; b.active = w.id; }); setAiPrompt(''); setMenu(null); return 'Temporary AI world created. Exit AI session to restore your previous world.'; } })}>Generate world with Parley AI →</button><small style={{ color: '#8aa6b1' }}>Backend routes to MIT Parley API using Bearer PARLEY_API_KEY and bounded engine validation.</small></div></details><div className="save-actions"><button onClick={() => void act(async () => { await engine.current?.save(); const url = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'gameforge-worlds.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return 'Save file exported'; })}>Export all local saves</button><label className="import-label">Import save file<input type="file" accept="application/json" onChange={e => { const f = e.target.files?.[0]; if (f)
            void act(async () => { if (f.size > 20000000)
                throw new Error('Save file is too large.'); const imported = JSON.parse(await f.text()); await engine.current?.save(); await store.import(imported); setMenu(null); return 'Imported save'; }); }}/></label></div><p>Import merges worlds and cosmetic ownership. Existing worlds are preserved as separate copies if IDs match.</p></>}
 {menu === 'settings' && <><label>Sound volume <input type="range" aria-label="Sound volume" min="0" max="1" step="0.05" value={volume} onChange={e=>{ const v=Number(e.target.value); setVolume(v); gameAudio.unlock(); gameAudio.setVolume(v); engine.current?.setVolume(v); }}/></label><label className="check"><input type="checkbox" checked={shake} onChange={e => setShake(e.target.checked)}/>Camera shake</label>{import.meta.env.DEV && <label className="check"><input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)}/>Show performance overlay</label>}<p>Controls: A/D or arrows move; Space jumps; J or left click attacks/mines; F or right click places; Hold E gathers trees/plants; E opens chests; Q casts Blink; R casts Shield; 1–8 selects; H recalls; I inventory; C crafting; M map; Escape pauses.</p><button onClick={() => void act(async () => { await engine.current?.save(); return 'Saved to this browser'; })}>Save now</button><button onClick={()=>open('forge')}>Open session creator for AI mechanics</button></>}
 {menu === 'forge' && <CreatorPanel key={sessionRevision} store={store} engine={()=>engine.current} creations={creations} onCreations={setCreations} onEnter={enterAI} onExit={exitAI}/>}
 </div>{notice && <div className="menu-notice" role="status">{notice}</div>}</section></div>}
 <div className="hotbar" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>{world.inventory.slice(0, 8).map((s, i) => <button key={i} className={hud.selected === i ? 'selected' : ''} onPointerDown={e => e.preventDefault()} onClick={() => engine.current?.select(i)} title={s ? `${ITEMS[s.id].name} ×${s.count} — ${ITEMS[s.id].description}` : 'Empty hotbar slot'}><kbd>{i + 1}</kbd><span>{s ? <ItemIcon id={s.id} /> : '·'}</span><small>{s?.count ?? ''}</small><label>{s ? ITEMS[s.id].name : 'Empty'}</label></button>)}</div><div className="reward-line" role="status"><span>✦</span>{hud.recall > 0 ? `Recall ${Math.round(hud.recall * 100)}%` : notice && !menu ? notice : hud.message}</div></section>
 <nav className="game-nav" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>{([['inventory', 'Inventory · I'], ['crafting', 'Crafting · C'], ['skins', 'Skins'], ['forge', '✦ MIT Parley'], ['objectives', 'Earn coins'], ['shop', 'Sell resources'], ['map', 'Map · M'], ['settings', 'Settings']] as const).map(([id, title]) => <button key={id} onClick={() => open(id)}>{title}</button>)}<button onClick={() => { setMenu(null); engine.current?.recall(); }}>Recall · H</button></nav><div className="guide"><span><kbd>A D</kbd> Move <kbd>SPACE</kbd> Jump <kbd>J</kbd> Attack/Mine <kbd>F</kbd> Place <kbd>E</kbd> Gather/Use <kbd>Q</kbd> Blink <kbd>R</kbd> Shield</span><span>Next: {OBJECTIVES.find(o => !world.claimed.includes(o.id))?.name ?? 'Explore beyond the frontier'}</span></div>{error && <p role="alert">{error}</p>}</main>;
}
