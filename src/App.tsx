import { useEffect, useRef, useState } from 'react';
import { SaveStore } from './sandbox/persistence';
import { startSandbox, type SandboxController, type SandboxHud, type Menu } from './sandbox/engine';
import { DEFAULT_WORLD, ITEMS, RECIPES, SKINS, OBJECTIVES, CHUNK, TILE, add, remove, count, craft, unlock, claim, newWorld, type ItemId, type SkinId, type WorldSettings } from './sandbox/model';
import { landmarks } from './sandbox/terrain';
import { gameAudio } from './sandbox/audio';

let opening: Promise<SaveStore> | undefined;

function SkinPortrait({ id }: { id: SkinId }) {
    const skin = SKINS.find(s => s.id === id)!;
    return (
        <svg viewBox="0 0 80 90" className="skin-art" aria-label={skin.name}>
            <ellipse cx="40" cy="84" rx="26" ry="4" fill="#101d2b" />
            {['knight', 'wanderer'].includes(id) && <path d="M24 30 L11 76 L46 67 L55 33" fill={id === 'knight' ? '#392a53' : '#6f5c9c'} />}
            <path d="M24 35 H57 V62 H24Z M18 36 H25 V58 H18Z M57 36 H64 V58 H57Z" fill={skin.color} />
            <path d="M29 62 H38 V80 H25V74H29Z M45 62H54V74H58V80H45Z" fill="#96a9ad" />
            <path d="M27 10H56V32H27Z" fill={skin.color} />
            <path d="M35 18H59V26H35Z" fill="#d6fff2" />
            <path d="M34 40H47V59H34Z" fill="#294557" />
            {id === 'ranger' && <path d="M22 12H64V18H22Z M31 5H53V12H31Z M10 38H17V65H10Z" fill="#9d7755" />}
            {id === 'wanderer' && <path d="M25 14L29 0L36 12L43 0L48 12L55 0L59 14Z" fill="#d5bdff" />}
            {id === 'neon' && <path d="M21 3H24V24H21Z M60 3H63V24H60Z M12 40H18V63H12Z M39 43H42V58H39Z" fill="#a8ffed" />}
            {id === 'knight' && <path d="M20 0L30 14H23Z M63 0L54 14H61Z M18 31H31V39H18Z M54 31H68V39H54Z" fill="#c593b5" />}
            {id === 'automaton' && (
                <>
                    <path d="M22 8H62V31H22Z" fill="#a39260" />
                    <path d="M29 17H37V23H29Z M49 17H57V23H49Z" fill="#beffee" />
                    <circle cx="41" cy="48" r="6" fill="#f7e6a1" />
                </>
            )}
        </svg>
    );
}

type TutorialKind = 'move' | 'mine' | 'fight' | 'gather' | 'menu' | 'home';

function TutorialClip({ kind }: { kind: TutorialKind }) {
    return (
        <div className={`tutorial-clip tutorial-clip-${kind}`} aria-hidden>
            <div className="tutorial-stage">
                <span className="tut-sky" />
                <span className="tut-ground" />
                {kind === 'move' && (
                    <>
                        <span className="tut-actor" />
                        <span className="tut-key tut-key-a">A</span>
                        <span className="tut-key tut-key-d">D</span>
                    </>
                )}
                {kind === 'mine' && (
                    <>
                        <span className="tut-block" />
                        <span className="tut-actor" />
                        <span className="tut-pick" />
                        <span className="tut-spark" />
                    </>
                )}
                {kind === 'fight' && (
                    <>
                        <span className="tut-foe" />
                        <span className="tut-actor" />
                        <span className="tut-bolt" />
                    </>
                )}
                {kind === 'gather' && (
                    <>
                        <span className="tut-tree" />
                        <span className="tut-actor" />
                        <span className="tut-leaf" />
                    </>
                )}
                {kind === 'menu' && (
                    <>
                        <span className="tut-panel" />
                        <span className="tut-tab tut-tab-i">I</span>
                        <span className="tut-tab tut-tab-c">C</span>
                        <span className="tut-tab tut-tab-m">M</span>
                    </>
                )}
                {kind === 'home' && (
                    <>
                        <span className="tut-beacon" />
                        <span className="tut-actor" />
                        <span className="tut-ring" />
                    </>
                )}
            </div>
        </div>
    );
}

const EMPTY: SandboxHud = { health: 100, mana: 100, status: 'paused', biome: 'Verdant frontier', selected: 1, message: 'Explore Lumen frontier', nearBase: true, fps: 0, chunks: 0, enemies: 0, bodies: 0, x: 288, y: 504, recall: 0 };

export default function App() {
    const [store, setStore] = useState<SaveStore | null>(null);
    const [revision, setRevision] = useState(0);
    const [hud, setHud] = useState(EMPTY);
    const [menu, setMenu] = useState<Menu>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [pending, setPending] = useState(false);
    const [slot, setSlot] = useState<number | null>(null);
    const [settings, setSettings] = useState<WorldSettings>({ ...DEFAULT_WORLD });
    const [sellId, setSellId] = useState<ItemId>('stone');
    const [quantity, setQuantity] = useState(1);
    const [debug, setDebug] = useState(false);
    const [shake, setShake] = useState(true);
    
    // Home → world select → playing
    const [gameState, setGameState] = useState<'home' | 'worlds' | 'playing'>('home');
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hudMenuOpen, setHudMenuOpen] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState('');

    const host = useRef<HTMLDivElement>(null);
    const frame = useRef<HTMLDivElement>(null);
    const engine = useRef<SandboxController | null>(null);
    const dialog = useRef<HTMLElement | null>(null);

    useEffect(() => {
        let alive = true;
        opening ??= SaveStore.open();
        void opening.then(s => { if (alive) setStore(s); }).catch(e => { if (alive) setError(String(e)); });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!store) return;
        store.onChange = () => setRevision(v => v + 1);
        store.onError = m => setNotice(m);
        return () => { store.onChange = undefined; store.onError = undefined; };
    }, [store]);

    const active = store?.data.active;

    useEffect(() => {
        if (!store || gameState !== 'playing' || !host.current) return;
        let alive = true;
        try {
            engine.current = startSandbox(host.current, store, h => { if (alive) setHud(h); }, m => { if (alive) setMenu(m); });
        } catch (e) {
            setError(String(e));
        }
        return () => { alive = false; engine.current?.destroy(); engine.current = null; };
    }, [store, active, gameState]);

    useEffect(() => { engine.current?.setShake(shake); }, [shake, active, gameState]);
    useEffect(() => { if (menu) dialog.current?.focus(); }, [menu]);

    void revision;

    const open = (m: Menu) => { engine.current?.pause(); setMenu(m); setSlot(null); setNotice(''); };
    const act = async (fn: () => Promise<unknown>) => {
        if (pending) return;
        setPending(true);
        try {
            const result = await fn();
            if (typeof result === 'string') setNotice(result);
        } catch (e) {
            setNotice(e instanceof Error ? e.message : String(e));
        } finally {
            setPending(false);
        }
    };
    const close = () => { setMenu(null); setSlot(null); engine.current?.resume(); };
    const openSearch = () => {
        engine.current?.pause();
        setShowSearch(true);
    };
    const closeSearch = () => {
        setShowSearch(false);
        setSearchQuery('');
        if (!menu) engine.current?.resume();
    };
    const GIVE_ALIASES: Record<string, ItemId> = {
        iron_bar: 'bar', ironbar: 'bar', bar: 'bar',
        iron_ore: 'iron', ironore: 'iron', iron: 'iron',
        timber: 'wood', wood: 'wood', logs: 'wood',
        healing_herb: 'herb', herb: 'herb',
        crystal_shard: 'crystal', crystal: 'crystal',
        scrap_metal: 'scrap', scrap: 'scrap',
        field_tonic: 'tonic', tonic: 'tonic',
        lumen_torch: 'torch', torch: 'torch',
        outpost_block: 'brick', brick: 'brick',
        dirt: 'dirt', soil: 'dirt', stone: 'stone',
        pickaxe: 'pickaxe', blaster: 'blaster', sword: 'sword',
        staff: 'staff', drill: 'drill', carbine: 'carbine',
    };
    const runSearch = () => {
        const q = searchQuery.trim();
        const setCmd = /^\/set\s+([a-z_]+)\s+(-?\d+)\s*$/i.exec(q);
        if (setCmd) {
            const key = setCmd[1]!.toLowerCase();
            const value = Number(setCmd[2]);
            if (key === 'health' || key === 'hp') {
                if (!Number.isInteger(value) || value < 0) {
                    setNotice('Health must be a whole number ≥ 0.');
                    closeSearch();
                    return;
                }
                engine.current?.setHealth(value);
                setNotice(`Health set to ${Math.min(99999, value)}.`);
                closeSearch();
                return;
            }
            setNotice(`Unknown /set target "${key}". Try /set health 1000`);
            closeSearch();
            return;
        }
        const give = /^\/give\s+([a-z0-9_]+)\s+(-?\d+)\s*$/i.exec(q);
        if (give) {
            const raw = give[1]!.toLowerCase();
            const amount = Number(give[2]);
            if (!Number.isInteger(amount) || amount === 0) {
                setNotice('Amount must be a non-zero whole number.');
                closeSearch();
                return;
            }
            if (raw === 'coins' || raw === 'coin' || raw === 'gold') {
                void act(async () => {
                    const msg = await store!.transact((_b, w) => {
                        const next = w.coins + amount;
                        if (next < 0)
                            throw new Error(`Not enough coins (have ${w.coins}).`);
                        w.coins = next;
                        return amount > 0
                            ? `Gave ${amount} coins · balance ${w.coins}`
                            : `Removed ${-amount} coins · balance ${w.coins}`;
                    });
                    return msg;
                });
                closeSearch();
                return;
            }
            if (amount < 1) {
                setNotice('Item amounts must be positive. Use /give coins -N to spend coins.');
                closeSearch();
                return;
            }
            const id = GIVE_ALIASES[raw] ?? (raw in ITEMS ? raw as ItemId : null);
            if (!id) {
                setNotice(`Unknown item "${raw}".`);
                closeSearch();
                return;
            }
            void act(async () => {
                const msg = await store!.transact((_b, w) => {
                    if (!add(w.inventory, id, amount))
                        throw new Error('Inventory full — clear space first.');
                    return `Gave ${amount}× ${ITEMS[id].name}`;
                });
                return msg;
            });
            closeSearch();
            return;
        }
        closeSearch();
    };

    useEffect(() => {
        const onPointer = () => gameAudio.unlock();
        window.addEventListener('pointerdown', onPointer, { once: true });
        return () => window.removeEventListener('pointerdown', onPointer);
    }, []);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            const el = e.target as HTMLElement | null;
            if (el?.closest('button, summary, .item-slot, .import-label'))
                gameAudio.ui();
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    useEffect(() => {
        if (gameState !== 'playing') {
            gameAudio.stopBgm();
            setHudMenuOpen(false);
            setShowSearch(false);
            setShowTutorial(false);
            setMenu(null);
        }
    }, [gameState]);

    useEffect(() => {
        if (hud.status !== 'playing') setHudMenuOpen(false);
    }, [hud.status]);

    useEffect(() => {
        if (!hudMenuOpen) return;
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t?.closest('.hud-menu-container')) setHudMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [hudMenuOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showTutorial) {
                e.preventDefault();
                setShowTutorial(false);
                if (!menu) engine.current?.resume();
                return;
            }
            if (!showSearch) return;
            e.preventDefault();
            setShowSearch(false);
            if (!menu) engine.current?.resume();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showSearch, showTutorial, menu]);

    if (!store)
        return <main className="loading"><p className="eyebrow">GAMEFORGE / LUMEN FRONTIER</p><h1>{error ? 'Your save is safe.' : 'Preparing your expedition…'}</h1><p>{error || 'Opening local world storage.'}</p>{error && <p>Close other game tabs and reload. Incompatible saves are never silently replaced.</p>}</main>;

    const profile = store.data.profile;
    const worldsList = Object.values(store.data.worlds).sort((a, b) => b.created - a.created);
    const world = store.data.worlds[store.data.active];
    const transact = (fn: Parameters<SaveStore['transact']>[0]) => act(() => store.transact(fn));
    const deleteWorld = (id: string) => act(async () => {
        await engine.current?.save().catch(() => { });
        let emptied = false;
        await store.transact(b => {
            if (!b.worlds[id])
                throw new Error('That world is already gone.');
            delete b.worlds[id];
            const remaining = Object.keys(b.worlds);
            if (remaining.length === 0) {
                b.active = '';
                emptied = true;
            } else if (b.active === id)
                b.active = remaining[0]!;
        });
        if (emptied) {
            gameAudio.stopBgm();
            setMenu(null);
            setHudMenuOpen(false);
            setGameState('worlds');
            return 'All worlds deleted';
        }
        return 'World deleted';
    });

    if (gameState === 'home') {
        return (
            <main className="home-screen" style={{ 
                backgroundImage: 'url(/assets/home-bg.jpg)',
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                color: 'white',
                textAlign: 'center',
                fontFamily: 'sans-serif'
            }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '3rem', borderRadius: '20px', backdropFilter: 'blur(10px)' }}>
                    <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', letterSpacing: '4px' }}>GAMEFORGE</h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '2rem' }}>LUMEN FRONTIER · A WORLD TO DISCOVER</p>
                    <button 
                        type="button"
                        className="primary" 
                        style={{ fontSize: '1.5rem', padding: '1rem 3rem', cursor: 'pointer', borderRadius: '50px', border: 'none', background: '#62dfc3', color: '#101d2b', fontWeight: 'bold' }} 
                        onClick={() => { gameAudio.unlock(); setGameState('worlds'); }}
                    >
                        START EXPEDITION
                    </button>
                </div>
            </main>
        );
    }

    if (gameState === 'worlds' || !world) {
        const worlds = worldsList;
        return (
            <main className="worlds-select">
                <header className="worlds-select-header">
                    <div>
                        <p className="eyebrow">GAMEFORGE / LUMEN FRONTIER</p>
                        <h1>{worlds.length ? 'Choose your world' : 'Create your first world'}</h1>
                        <p>{worlds.length
                            ? 'Worlds keep their own items, coins, objectives, and terrain. Skins are shared across all expeditions.'
                            : 'No worlds remain. Create a new expedition to start exploring again. Skins you unlocked are still saved.'}</p>
                    </div>
                    <button type="button" onClick={() => setGameState('home')}>← Back</button>
                </header>

                <section className="worlds-select-grid">
                    {worlds.map(w => (
                        <article key={w.id} className={w.id === active ? 'world-card current' : 'world-card'}>
                            <div>
                                <p className="eyebrow">{w.id === active ? 'ACTIVE SAVE' : 'SAVED WORLD'}</p>
                                <h2>{w.name}</h2>
                                <p>{w.settings.difficulty === 'explorer' ? 'Explorer' : w.settings.difficulty === 'extreme' ? 'EXTREME' : 'Standard'} · seed {w.settings.seed}</p>
                                <p className="world-meta">◈ {w.coins} coins · depth progress {Object.keys(w.explored).length} chunks · created {new Date(w.created).toLocaleDateString()}</p>
                            </div>
                            <div className="world-card-actions">
                                <button
                                    type="button"
                                    className="primary"
                                    disabled={pending}
                                    onClick={() => void act(async () => {
                                        gameAudio.unlock();
                                        if (w.id !== active)
                                            await store.transact(b => { b.active = w.id; });
                                        setGameState('playing');
                                    })}
                                >
                                    {w.id === active ? 'Continue this world →' : 'Enter this world →'}
                                </button>
                            </div>
                        </article>
                    ))}
                </section>

                <section className="worlds-create-panel">
                    <h2>Create a new world</h2>
                    <p>Existing worlds are kept. Terrain settings lock in at creation.</p>
                    <div className="generation-form">
                        <label>Seed<input value={settings.seed} maxLength={80} onChange={e => setSettings({ ...settings, seed: e.target.value })} /></label>
                        <label>Difficulty
                            <select value={settings.difficulty} onChange={e => setSettings({ ...settings, difficulty: e.target.value as WorldSettings['difficulty'] })}>
                                <option value="explorer">Explorer</option>
                                <option value="standard">Standard</option>
                                <option value="extreme">EXTREME</option>
                            </select>
                        </label>
                        {(['roughness', 'caves', 'abundance'] as const).map(key => (
                            <label key={key}>{key}<input type="range" min="0.6" max="1.4" step="0.1" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} /></label>
                        ))}
                    </div>
                    <button type="button" className="primary" disabled={pending} onClick={() => void act(async () => {
                        gameAudio.unlock();
                        await store.transact(b => {
                            const w = newWorld(crypto.randomUUID(), settings);
                            b.worlds[w.id] = w;
                            b.active = w.id;
                        });
                        setGameState('playing');
                    })}>Create & start expedition →</button>

                    {worlds.length > 0 && (
                        <div className="world-delete-panel">
                            <h3>Delete a world</h3>
                            <p>Choose a save to remove permanently. You can delete every world.</p>
                            <div className="world-delete-row">
                                <select
                                    value={deleteTarget}
                                    disabled={pending}
                                    onChange={e => setDeleteTarget(e.target.value)}
                                >
                                    <option value="">Select a world…</option>
                                    {worlds.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}{w.id === active ? ' (current)' : ''}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="danger"
                                    disabled={pending || !deleteTarget}
                                    onClick={() => {
                                        const w = worlds.find(x => x.id === deleteTarget);
                                        if (!w) return;
                                        if (!confirm(`Delete world “${w.name}”? This cannot be undone.`)) return;
                                        void deleteWorld(w.id).then(() => setDeleteTarget(''));
                                    }}
                                >
                                    Delete selected
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {notice && <p className="worlds-notice" role="status">{notice}</p>}
            </main>
        );
    }

    return (
        <main className="sandbox-app">
            <header className="sandbox-header" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>
                <div className="brand">GAME<span>FORGE</span><small>LUMEN FRONTIER · A WORLD TO DISCOVER</small></div>
                <div className="header-right">
                    <span className="ai-status">AI generation not connected</span>
                    <button onClick={() => open('worlds')}>Worlds & creation</button>
                </div>
            </header>
            
            <section className="world-shell" ref={frame}>
                <div className="world-hud" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>
                    <div className="hud-menu-container" style={{ position: 'relative' }}>
                        <button 
                            type="button"
                            className="hud-menu-btn" 
                            aria-expanded={hudMenuOpen}
                            aria-haspopup="menu"
                            onClick={() => setHudMenuOpen(open => !open)}
                        >
                            ⋮
                        </button>
                        {hudMenuOpen && (
                            <div className="hud-dropdown" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setHudMenuOpen(false);
                                        engine.current?.pause();
                                        setShowTutorial(true);
                                    }}
                                >
                                    How to Play
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setHudMenuOpen(false);
                                        setMenu(null);
                                        setShowSearch(false);
                                        engine.current?.resume();
                                    }}
                                >
                                    Continue Expedition
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setHudMenuOpen(false);
                                        void engine.current?.save().finally(() => {
                                            gameAudio.stopBgm();
                                            setGameState('home');
                                        });
                                    }}
                                >
                                    Quit Expedition
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {/* Top Right Menu */}
                    <div className="vital">
                        <span>HEALTH <b>{hud.health}</b></span>
                        <meter min="0" max={Math.max(100, hud.health)} value={hud.health} />
                    </div>

                    <div className="vital mana">
                        <span>MANA <b>{hud.mana}</b></span>
                        <meter min="0" max="100" value={hud.mana} />
                    </div>
                    <div className="location">
                        <strong>{hud.biome}</strong>
                        <small>{world.name} · {Math.floor(hud.y / TILE)}m depth</small>
                    </div>
                    <div className="coins">◈ {world.coins}<small>COINS</small></div>
                    <button type="button" aria-label="Search" title="Search" onPointerDown={e => e.preventDefault()} onClick={openSearch}>⌕</button>
                    <button aria-label="Fullscreen" onClick={() => {
                        if (document.fullscreenElement) void document.exitFullscreen();
                        else void frame.current?.requestFullscreen().catch(() => setNotice('Fullscreen is unavailable here.'));
                    }}>⛶</button>
                </div>
                
                <div className="viewport">
                    <div ref={host} className="game-host" aria-label="Lumen frontier sandbox game" />
                    
                    {/* Search Bar Overlay */}
                    {showSearch && (
                        <div className="search-overlay" style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(5px)' 
                        }}>
                            <div style={{ width: '60%', display: 'flex', gap: '10px' }}>
                                <input 
                                    autoFocus 
                                    style={{ flex: 1, padding: '15px', fontSize: '1.5rem', borderRadius: '8px', border: 'none' }} 
                                    placeholder="Search…"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                                />
                                <button type="button" style={{ padding: '0 20px', fontSize: '1.5rem', borderRadius: '8px', cursor: 'pointer' }} onClick={closeSearch}>✕</button>
                            </div>
                        </div>
                    )}

                    {showTutorial && (
                        <div className="tutorial-overlay" role="dialog" aria-label="How to play">
                            <section className="tutorial-card">
                                <header>
                                    <p className="eyebrow">FIELD MANUAL</p>
                                    <h2>How to play</h2>
                                    <button type="button" onClick={() => { setShowTutorial(false); if (!menu) engine.current?.resume(); }}>Close ×</button>
                                </header>
                                <div className="tutorial-grid">
                                    <article>
                                        <TutorialClip kind="move" />
                                        <h3>Move</h3>
                                        <p>A/D or arrow keys walk. Space jumps. Hold still near the outpost for safety.</p>
                                    </article>
                                    <article>
                                        <TutorialClip kind="mine" />
                                        <h3>Mine & place</h3>
                                        <p>Select pickaxe, aim with mouse, hold J / click to mine. F / right-click places blocks.</p>
                                    </article>
                                    <article>
                                        <TutorialClip kind="fight" />
                                        <h3>Fight</h3>
                                        <p>Blaster, carbine, sword, and staff fire toward your mouse. Bombers explode on death.</p>
                                    </article>
                                    <article>
                                        <TutorialClip kind="gather" />
                                        <h3>Gather</h3>
                                        <p>Hold E on trees (~1.2s) and plants (1s). Tap E at chests or the outpost stations.</p>
                                    </article>
                                    <article>
                                        <TutorialClip kind="menu" />
                                        <h3>Menus</h3>
                                        <p>I inventory · C crafting · M map · Escape pauses · Hotbar 1–8 selects gear.</p>
                                    </article>
                                    <article>
                                        <TutorialClip kind="home" />
                                        <h3>Recall</h3>
                                        <p>Hold still and press H to recall home. Damage cancels recall. Fall damage caps at 10.</p>
                                    </article>
                                </div>
                            </section>
                        </div>
                    )}

                    {import.meta.env.DEV && debug && <div className="debug">{hud.fps} FPS · {hud.chunks}/15 chunks · {hud.enemies}/12 enemies · {hud.bodies} terrain bodies · {Math.floor(hud.x)},{Math.floor(hud.y)}</div>}
                    
                    {menu && (
                        <div className="menu-shade">
                            <section ref={dialog} tabIndex={-1} className="game-menu" aria-label={`${menu} panel`}>
                                <div className="menu-heading">
                                    <div>
                                        <p className="eyebrow">EXPEDITION PAUSED</p>
                                        <h2>{{ 
                                            inventory: 'Pack & equipment', 
                                            crafting: 'Outpost crafting', 
                                            skins: 'Explorer wardrobe', 
                                            objectives: 'Earn coins', 
                                            shop: 'Salvage exchange', 
                                            map: 'Survey map', 
                                            worlds: 'Your worlds', 
                                            settings: 'Expedition settings' 
                                        }[menu]}</h2>
                                    </div>
                                    <button onClick={close} disabled={pending}>Close & play ×</button>
                                </div>
                                <div className="menu-content">
                                    {menu === 'inventory' && (
                                        <>
                                            <p>Click an item, then a slot to move or swap it. The first eight slots are your hotbar. Resources belong to this world.</p>
                                            <div className="inventory-grid">
                                                {world.inventory.map((s, i) => (
                                                    <button key={i} className={`item-slot ${i < 8 ? 'quick' : ''} ${slot === i ? 'chosen' : ''}`} title={s ? `${ITEMS[s.id].name} ×${s.count} — ${ITEMS[s.id].description}` : `Empty slot ${i + 1}`} onClick={() => {
                                                        if (slot === null) setSlot(i);
                                                        else {
                                                            const source = slot;
                                                            void transact((_b, w) => { [w.inventory[source], w.inventory[i]] = [w.inventory[i], w.inventory[source]]; });
                                                            setSlot(null);
                                                        }
                                                    }}>
                                                        <small>{i + 1}</small>
                                                        {s && <><span>{ITEMS[s.id].icon}</span><em>{s.count}</em><label>{ITEMS[s.id].name}</label></>}
                                                    </button>
                                                ))}
                                            </div>
                                            {slot !== null && world.inventory[slot] && <p>{ITEMS[world.inventory[slot]!.id].description}</p>}
                                        </>
                                    )}
                                    {menu === 'crafting' && (
                                        <>
                                            <p>{hud.nearBase ? 'Workbench and forge connected.' : 'Return to the outpost to use the workbench and forge.'} Crafted items go into your pack; move equipment into a hotbar slot.</p>
                                            <div className="recipe-grid">
                                                {RECIPES.map(r => {
                                                    const enough = Object.entries(r.ingredients).every(([id, n]) => count(world.inventory, id as ItemId) >= n);
                                                    return (
                                                        <article key={r.id}>
                                                            <div className="recipe-title">
                                                                <span>{ITEMS[r.output.id].icon}</span>
                                                                <h3>{r.name} <small>×{r.output.count}</small></h3>
                                                            </div>
                                                            <p>{r.station}</p>
                                                            <div className="ingredients">
                                                                {Object.entries(r.ingredients).map(([id, n]) => (
                                                                    <span key={id} className={count(world.inventory, id as ItemId) >= n ? 'available' : ''}>{ITEMS[id as ItemId].name} {count(world.inventory, id as ItemId)}/{n}</span>
                                                                ))}
                                                            </div>
                                                            <button disabled={!enough || !hud.nearBase || pending} onClick={() => void transact((_b, w) => craft(w, r.id, hud.nearBase))}>Craft {ITEMS[r.output.id].name}</button>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                    {menu === 'skins' && (
                                        <>
                                            <p>Cosmetics belong to your local player profile and work across worlds. Coins are spent from this world. Skins never change combat stats.</p>
                                            <div className="skin-grid">
                                                {SKINS.map(s => {
                                                    const owned = profile.owned.includes(s.id), equipped = profile.equipped === s.id;
                                                    return (
                                                        <article key={s.id} className={equipped ? 'equipped' : ''}>
                                                            <SkinPortrait id={s.id} />
                                                            <h3>{s.name}</h3>
                                                            <p>{s.description}</p>
                                                            <button disabled={equipped || pending} onClick={() => void transact((b) => {
                                                                if (owned) {
                                                                    if (!b.profile.owned.includes(s.id)) throw new Error('Unlock this skin first.');
                                                                    b.profile.equipped = s.id;
                                                                    return `${s.name} equipped`;
                                                                }
                                                                return unlock(b, s.id);
                                                            })}>{equipped ? 'Equipped' : owned ? 'Equip · free' : `Unlock · ${s.price} coins`}</button>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                    {menu === 'objectives' && (
                                        <>
                                            <p>One-time objectives for this world. Progress comes from exploring, mining, fighting, and crafting. Claim each reward once.</p>
                                            <div className="objective-list">
                                                {OBJECTIVES.map(o => {
                                                    const done = world.progress[o.id] >= o.total, claimed = world.claimed.includes(o.id);
                                                    return (
                                                        <article key={o.id}>
                                                            <div>
                                                                <h3>{o.name}</h3>
                                                                <p>{Math.min(world.progress[o.id], o.total)} / {o.total} · {claimed ? 'Claimed' : done ? 'Complete' : 'Active'}</p>
                                                                <progress max={o.total} value={world.progress[o.id]} />
                                                            </div>
                                                            <button disabled={!done || claimed || pending} onClick={() => void transact((_b, w) => claim(w, o.id))}>{claimed ? 'Reward claimed' : `Claim ${o.reward} coins`}</button>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                    {menu === 'shop' && (
                                        <>
                                            <p>{hud.nearBase ? 'Sell spare materials at the outpost terminal.' : 'Return to the outpost terminal to sell resources.'}</p>
                                            <p>Uncollected combat resources are safely held here when your pack is full.</p>
                                            <button disabled={!hud.nearBase || pending} onClick={() => void transact((_b, w) => {
                                                let total = 0;
                                                for (const [id, n] of Object.entries(w.pendingLoot ?? {})) {
                                                    if (n && add(w.inventory, id as ItemId, n)) {
                                                        delete w.pendingLoot[id as ItemId];
                                                        total += n;
                                                    }
                                                }
                                                return total ? `Collected ${total} held resources` : 'No held resources, or your inventory is still full.';
                                            })}>Collect held resources ({Object.values(world.pendingLoot ?? {}).reduce((n, v) => n + (v ?? 0), 0)})</button>
                                            <div className="sell-form">
                                                <label>Resource
                                                    <select value={sellId} onChange={e => setSellId(e.target.value as ItemId)}>
                                                        {(Object.keys(ITEMS) as ItemId[]).filter(id => ITEMS[id].value > 0 && !['tool', 'weapon'].includes(ITEMS[id].category)).map(id => (
                                                            <option value={id} key={id}>{ITEMS[id].name} · {count(world.inventory, id)} in pack</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>Quantity
                                                    <input type="number" min="1" max="999" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                                                </label>
                                                <p>{quantity} × {ITEMS[sellId].value} = <strong>{quantity * ITEMS[sellId].value} coins</strong></p>
                                                <button className="primary" disabled={!hud.nearBase || pending || !Number.isInteger(quantity) || quantity < 1 || count(world.inventory, sellId) < quantity} onClick={() => void transact((_b, w) => {
                                                    if (!hud.nearBase || !Number.isSafeInteger(quantity) || quantity < 1 || !remove(w.inventory, sellId, quantity)) throw new Error('Sale unavailable.');
                                                    const value = quantity * ITEMS[sellId].value;
                                                    w.coins += value;
                                                    return `Sold ${quantity} ${ITEMS[sellId].name} for ${value} coins`;
                                                })}>Sell {quantity} for {quantity * ITEMS[sellId].value} coins</button>
                                            </div>
                                        </>
                                    )}
                                    {menu === 'map' && (
                                        <>
                                            <p>Only surveyed chunks are shown. ◈ marks discovered caches; ● marks the outpost. Use Recall to return safely.</p>
                                            <svg viewBox="0 0 620 300" className="survey-map" role="img" aria-label="Explored terrain map">
                                                {Object.entries(world.explored).slice(-1000).map(([key, b]) => {
                                                    const [x, y] = key.split(',').map(Number), cx = Math.floor(hud.x / (CHUNK * TILE));
                                                    return (
                                                        <g key={key}>
                                                            <rect x={300 + (x - cx) * 22} y={y * 45 + 20} width="21" height="44" fill={b === 'Crystal depths' ? '#706195' : b === 'Rust wastes' ? '#9e7660' : '#608b79'} />
                                                            {landmarks(world.settings, x).some(l => Math.floor(l.y / CHUNK) === y) && <text x={305 + (x - cx) * 22} y={y * 45 + 42} fill="#f5d08f" fontSize="10">◈</text>}
                                                            {x === 0 && y === 0 && <text x={305 + (x - cx) * 22} y="38" fill="#fff">●</text>}
                                                        </g>
                                                    );
                                                })}
                                                <circle cx={311} cy={Math.floor(hud.y / (CHUNK * TILE)) * 45 + 42} r="4" fill="#fff" />
                                            </svg>
                                            <button onClick={() => { setMenu(null); engine.current?.recall(); }}>Recall to outpost · 2.5 seconds</button>
                                        </>
                                    )}
                                    {menu === 'worlds' && (
                                        <>
                                            <p>Worlds store their own items, coins, objectives, and terrain changes. Skins are shared. Saves live in this browser only; they are not cloud-synced.</p>
                                            <div className="world-list">
                                                {Object.values(store.data.worlds).map(w => (
                                                    <button key={w.id} disabled={w.id === active || pending} onClick={() => void act(async () => {
                                                        await engine.current?.save();
                                                        await store.transact(b => { b.active = w.id; });
                                                        setMenu(null);
                                                    })}>{w.name} {w.id === active ? '· Current' : '· Load world'}</button>
                                                ))}
                                            </div>
                                            <div className="world-delete-panel in-menu">
                                                <h3>Delete a world</h3>
                                                <p>You can delete every world. Deleting the last one returns you to world select.</p>
                                                <div className="world-delete-row">
                                                    <select
                                                        value={deleteTarget}
                                                        disabled={pending}
                                                        onChange={e => setDeleteTarget(e.target.value)}
                                                    >
                                                        <option value="">Select a world…</option>
                                                        {Object.values(store.data.worlds).map(w => (
                                                            <option key={w.id} value={w.id}>{w.name}{w.id === active ? ' (current)' : ''}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        disabled={pending || !deleteTarget}
                                                        onClick={() => {
                                                            const w = Object.values(store.data.worlds).find(x => x.id === deleteTarget);
                                                            if (!w) return;
                                                            if (!confirm(`Delete world “${w.name}”? This cannot be undone.`)) return;
                                                            void deleteWorld(w.id).then(() => {
                                                                setDeleteTarget('');
                                                                if (w.id === active) setMenu(null);
                                                            });
                                                        }}
                                                    >Delete selected</button>
                                                </div>
                                            </div>
                                            <details>
                                                <summary>Create a new world · existing worlds are kept</summary>
                                                <div className="generation-form">
                                                    <label>Seed<input value={settings.seed} maxLength={80} onChange={e => setSettings({ ...settings, seed: e.target.value })} /></label>
                                                    <label>Difficulty
                                                        <select value={settings.difficulty} onChange={e => setSettings({ ...settings, difficulty: e.target.value as WorldSettings['difficulty'] })}>
                                                            <option value="explorer">Explorer</option>
                                                            <option value="standard">Standard</option>
                                                            <option value="extreme">EXTREME</option>
                                                        </select>
                                                    </label>
                                                    {(['roughness', 'caves', 'abundance'] as const).map(key => (
                                                        <label key={key}>{key}<input type="range" min="0.6" max="1.4" step="0.1" value={settings[key]} onChange={e => setSettings({ ...settings, [key]: Number(e.target.value) })} /></label>
                                                    ))}
                                                    <button className="primary" disabled={pending} onClick={() => void act(async () => {
                                                        await engine.current?.save();
                                                        await store.transact(b => {
                                                            const w = newWorld(crypto.randomUUID(), settings);
                                                            b.worlds[w.id] = w;
                                                            b.active = w.id;
                                                        });
                                                        setMenu(null);
                                                    })}>Create new world</button>
                                                </div>
                                            </details>
                                            <p>Terrain settings are fixed once a world is created. New terrain settings require a new world.</p>
                                            <details>
                                                <summary>AI creation · not connected</summary>
                                                <textarea placeholder="Describe a future world…" />
                                                <button disabled>Generate world</button>
                                                <p>Future prompts will adjust supported settings, not execute generated code.</p>
                                            </details>
                                            <div className="save-actions">
                                                <button onClick={() => void act(async () => {
                                                    await engine.current?.save();
                                                    const url = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'gameforge-worlds.json';
                                                    a.click();
                                                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                                                    return 'Save file exported';
                                                })}>Export all local saves</button>
                                                <label className="import-label">Import save file
                                                    <input type="file" accept="application/json" onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (f) void act(async () => {
                                                            if (f.size > 20000000) throw new Error('Save file is too large.');
                                                            const imported = JSON.parse(await f.text());
                                                            await engine.current?.save();
                                                            await store.import(imported);
                                                            setMenu(null);
                                                            return 'Imported save';
                                                        });
                                                    }} />
                                                </label>
                                            </div>
                                            <p>Import merges worlds and cosmetic ownership. Existing worlds are preserved as separate copies if IDs match.</p>
                                        </>
                                    )}
                                    {menu === 'settings' && (
                                        <>
                                            <label className="check"><input type="checkbox" checked={shake} onChange={e => setShake(e.target.checked)} />Camera shake</label>
                                            {import.meta.env.DEV && <label className="check"><input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />Show performance overlay</label>}
                                            <p>Controls: A/D or arrows move; Space jumps; J or left click attacks/mines; F or right click places; Hold E gathers trees (~1.2s) and plants (1s); E opens chests/outpost; 1–8 selects; H recalls; I inventory; C crafting; M map; Escape pauses.</p>
                                            <button onClick={() => void act(async () => { await engine.current?.save(); return 'Saved to this browser'; })}>Save now</button>
                                        </>
                                    )}
                                </div>
                                {notice && <div className="menu-notice" role="status">{notice}</div>}
                            </section>
                        </div>
                    )}
                </div>
                
                <div className="hotbar" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>
                    {world.inventory.slice(0, 8).map((s, i) => (
                        <button key={i} className={hud.selected === i ? 'selected' : ''} onPointerDown={e => e.preventDefault()} onClick={() => engine.current?.select(i)} title={s ? `${ITEMS[s.id].name} ×${s.count} — ${ITEMS[s.id].description}` : 'Empty hotbar slot'}>
                            <kbd>{i + 1}</kbd>
                            <span>{s ? ITEMS[s.id].icon : '·'}</span>
                            <small>{s?.count ?? ''}</small>
                            <label>{s ? ITEMS[s.id].name : 'Empty'}</label>
                        </button>
                    ))}
                </div>
                <div className="reward-line" role="status">
                    <span>✦</span>
                    {hud.recall > 0 ? `Recall ${Math.round(hud.recall * 100)}%` : notice && !menu ? notice : hud.message}
                </div>

                {!menu && !showSearch && !showTutorial && hud.status !== 'playing' && (
                    <div
                        className="continue-overlay"
                        role="dialog"
                        aria-label={hud.status === 'dead' ? 'Respawn' : 'Continue Expedition'}
                        onPointerDown={e => e.stopPropagation()}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 20000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(0,0,0,0.72)', pointerEvents: 'auto',
                        }}
                    >
                        <div style={{ position: 'relative', zIndex: 20001, textAlign: 'center', maxWidth: 520, padding: '0 24px', pointerEvents: 'auto' }}>
                            <p className="eyebrow">{hud.status === 'dead' ? 'BEACON SIGNAL RECEIVED' : 'LUMEN OUTPOST / EXPEDITION PAUSED'}</p>
                            <h2 style={{ color: 'white' }}>{hud.status === 'dead' ? 'Your journey continues.' : 'A strange new frontier.'}</h2>
                            <p style={{ color: 'white' }}>{hud.status === 'dead' ? 'Respawn at the outpost. Your inventory, coins, and skins are retained.' : 'Explore living hills and buried ruins. Gather, craft, and make this planet your own.'}</p>
                            <button
                                type="button"
                                className="primary"
                                style={{ position: 'relative', zIndex: 20002, pointerEvents: 'auto', cursor: 'pointer', background: '#62dfc3', color: '#101d2b', fontWeight: 'bold', padding: '1rem 2rem', fontSize: '1.2rem', border: 'none', borderRadius: '8px' }}
                                onPointerDown={e => e.preventDefault()}
                                onClick={() => {
                                    setHudMenuOpen(false);
                                    if (hud.status === 'dead') engine.current?.respawn();
                                    else engine.current?.resume();
                                }}
                            >
                                {hud.status === 'dead' ? 'Return to checkpoint · R' : 'Continue Expedition'}
                            </button>
                            <p className="start-tip">E gathers trees and herbs · J uses your selected tool · 1–8 selects equipment</p>
                        </div>
                    </div>
                )}
            </section>
            
            <nav className="game-nav" style={hud.status !== 'playing' && !menu && !showSearch && !showTutorial ? { pointerEvents: 'none' } : undefined}>
                {([['inventory', 'Inventory · I'], ['crafting', 'Crafting · C'], ['skins', 'Skins'], ['objectives', 'Earn coins'], ['shop', 'Sell resources'], ['map', 'Map · M'], ['settings', 'Settings']] as const).map(([id, title]) => (
                    <button key={id} onClick={() => open(id)}>{title}</button>
                ))}
                <button onClick={() => { setMenu(null); engine.current?.recall(); }}>Recall · H</button>
            </nav>
            <div className="guide">
                <span><kbd>A D</kbd> Move <kbd>SPACE</kbd> Jump <kbd>J</kbd> Use tool <kbd>F</kbd> Place <kbd>E</kbd> Gather / interact</span>
                <span>Next: {OBJECTIVES.find(o => !world.claimed.includes(o.id))?.name ?? 'Explore beyond the frontier'}</span>
            </div>
            {error && <p role="alert">{error}</p>}
        </main>
    );
}
