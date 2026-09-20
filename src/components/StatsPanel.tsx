import { useMemo, type ReactNode } from 'react';
import { getEvents } from '../analytics';
import type { WorldSave } from '../sandbox/model';
import { OBJECTIVES } from '../sandbox/model';

// ─── Tiny chart primitives ──────────────────────────────────────────────────

function BarChart({ data, color = '#3B82F6' }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  if (!data.length) return <p style={{ color: '#606080', fontSize: 12 }}>No data yet</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map(d => (
        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 88, fontSize: 11, color: '#9090AA', textAlign: 'right', flexShrink: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
          <div style={{ flex: 1, height: 14, background: '#0A0A0F', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              height: '100%',
              background: color,
              borderRadius: 3,
              transition: 'width 0.5s ease',
              minWidth: d.value > 0 ? 4 : 0,
            }} />
          </div>
          <div style={{ width: 28, fontSize: 12, fontFamily: 'monospace', color: '#F0F0FF', textAlign: 'right', flexShrink: 0 }}>{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points, color = '#10B981', label = '' }: { points: number[]; color?: string; label?: string }) {
  if (points.length < 2) return <p style={{ color: '#606080', fontSize: 12 }}>Not enough data yet</p>;
  const w = 340, h = 80, pad = 8;
  const min = Math.min(...points), max = Math.max(...points, min + 1);
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - pad * 2));
  const ys = points.map(v => h - pad - ((v - min) / (max - min)) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${d} L${xs[xs.length - 1].toFixed(1)},${h - pad} L${pad},${h - pad} Z`;
  return (
    <div>
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${label})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {/* end dot */}
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#606080', fontFamily: 'monospace', marginTop: 2 }}>
        <span>start</span><span>now</span>
      </div>
    </div>
  );
}

function StatCard({ value, label, sub, color = '#3B82F6' }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: '#12121A',
      border: '1px solid #2A2A3A',
      borderRadius: 8,
      padding: '14px 16px',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#F0F0FF', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#606080', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#606080', textTransform: 'uppercase', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function StatsPanel({ world }: { world: WorldSave }) {
  const events = useMemo(() => getEvents(), []);

  const sessionEvents = useMemo(() =>
    events.filter(e => e.world_id === world.id), [events, world.id]);

  // ── Derived stats ──
  const kills = sessionEvents.filter(e => e.event_type === 'enemy_defeated');
  const mines = sessionEvents.filter(e => e.event_type === 'block_mined');
  const deaths = sessionEvents.filter(e => e.event_type === 'player_death');

  const killsByKind = useMemo(() => {
    const counts: Record<string, number> = {};
    kills.forEach(e => { counts[e.value1] = (counts[e.value1] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [kills]);

  const minesByMaterial = useMemo(() => {
    const counts: Record<string, number> = {};
    mines.forEach(e => { const mat = e.value2 || e.value1; counts[mat] = (counts[mat] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [mines]);

  const weaponUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    kills.forEach(e => { if (e.value2 && e.value2 !== 'unknown') counts[e.value2] = (counts[e.value2] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [kills]);

  const deathsByBiome = useMemo(() => {
    const counts: Record<string, number> = {};
    deaths.forEach(e => { counts[e.value1] = (counts[e.value1] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [deaths]);

  // Cumulative kills over session time (one point per minute)
  const killTimeline = useMemo(() => {
    if (!kills.length) return [];
    const maxT = Math.max(...kills.map(e => e.time_in_session_s), 1);
    const buckets = Math.max(Math.ceil(maxT / 60), 2);
    const counts = Array(buckets).fill(0);
    kills.forEach(e => {
      const bucket = Math.min(Math.floor(e.time_in_session_s / 60), buckets - 1);
      counts[bucket]++;
    });
    // cumulative
    let cum = 0;
    return counts.map(n => { cum += n; return cum; });
  }, [kills]);

  // Average health when defeating enemies (aggression proxy)
  const avgHealthOnKill = kills.length
    ? Math.round(kills.reduce((s, e) => s + Number(e.value3 || 0), 0) / kills.length)
    : null;

  const sessionTimeMin = sessionEvents.length
    ? Math.round((Math.max(...sessionEvents.map(e => e.time_in_session_s)) || 0) / 60)
    : 0;

  const biomesExplored = Object.keys(world.explored).length;
  const allTimeKills = world.progress.kills;

  return (
    <div style={{ color: '#F0F0FF', maxWidth: 720 }}>

      {/* Hero stat row */}
      <Section title="Session snapshot">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard value={kills.length} label="Enemies defeated" sub="this session" color="#EF4444" />
          <StatCard value={mines.length} label="Blocks mined" sub="this session" color="#F59E0B" />
          <StatCard value={deaths.length} label="Deaths" sub="this session" color="#9090AA" />
          <StatCard value={`${sessionTimeMin}m`} label="Session time" color="#3B82F6" />
          {avgHealthOnKill !== null && (
            <StatCard value={`${avgHealthOnKill}hp`} label="Avg health on kill" sub="higher = safer fighter" color="#10B981" />
          )}
        </div>
      </Section>

      {/* All-time (from save) */}
      <Section title="All-time (this world)">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard value={allTimeKills} label="Total kills" color="#EF4444" />
          <StatCard value={world.progress.stone} label="Stone mined" color="#F59E0B" />
          <StatCard value={biomesExplored} label={`Biome${biomesExplored !== 1 ? 's' : ''} found`} color="#8B5CF6" />
          <StatCard value={world.opened.length} label="Chests opened" color="#10B981" />
          <StatCard value={world.coins} label="Coins held" color="#F0C040" />
          <StatCard
            value={`${world.claimed.length}/${OBJECTIVES.length}`}
            label="Objectives done"
            color={world.claimed.length === OBJECTIVES.length ? '#10B981' : '#3B82F6'}
          />
        </div>
      </Section>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#606080', textTransform: 'uppercase', marginBottom: 12 }}>
            Kills by enemy type
          </div>
          <BarChart data={killsByKind} color="#EF4444" />
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#606080', textTransform: 'uppercase', marginBottom: 12 }}>
            Resources mined
          </div>
          <BarChart data={minesByMaterial} color="#F59E0B" />
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#606080', textTransform: 'uppercase', marginBottom: 12 }}>
            Weapon usage (kills)
          </div>
          <BarChart data={weaponUsage} color="#8B5CF6" />
        </div>

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#606080', textTransform: 'uppercase', marginBottom: 12 }}>
            Deaths by biome
          </div>
          <BarChart data={deathsByBiome} color="#9090AA" />
        </div>

      </div>

      {/* Kill rate timeline */}
      <Section title="Cumulative kills over session">
        <LineChart points={killTimeline} color="#EF4444" label="kills" />
      </Section>

      {sessionEvents.length === 0 && (
        <p style={{ color: '#606080', fontSize: 13 }}>
          No session data yet — start playing and the stats will fill in automatically.
        </p>
      )}

    </div>
  );
}
