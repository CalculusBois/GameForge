// Analytics module — logs game events and syncs to SIGNAL for analysis
const SIGNAL_URL = 'http://localhost:8000/api/gameforge/events';
const STORAGE_KEY = 'gameforge-analytics';
const MAX_EVENTS = 5000;

export interface GameEvent {
  session_id: string;
  world_id: string;
  difficulty: string;
  event_type: string;
  timestamp: number;
  time_in_session_s: number;
  value1: string;
  value2: string;
  value3: string;
}

let sessionId = '';
let worldId = '';
let difficulty = '';
let sessionStart = 0;
let buffer: GameEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function sessionStart_(wid: string, diff: string) {
  sessionId = crypto.randomUUID();
  worldId = wid;
  difficulty = diff;
  sessionStart = Date.now();
  // Load any persisted events
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) buffer = JSON.parse(raw);
    if (!Array.isArray(buffer)) buffer = [];
  } catch {
    buffer = [];
  }
  track('session_start', diff, wid, '');
}

export function track(eventType: string, v1 = '', v2 = '', v3 = '') {
  if (!sessionId) return;
  const event: GameEvent = {
    session_id: sessionId,
    world_id: worldId,
    difficulty,
    event_type: eventType,
    timestamp: Date.now(),
    time_in_session_s: Math.round((Date.now() - sessionStart) / 1000),
    value1: String(v1),
    value2: String(v2),
    value3: String(v3),
  };
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) buffer = buffer.slice(-MAX_EVENTS);
  persist();
  scheduleSend();
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer)); } catch { /* quota */ }
}

function scheduleSend() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = undefined; sendToSignal(); }, 5000);
}

function sendToSignal() {
  if (!buffer.length) return;
  const payload = buffer.slice();
  fetch(SIGNAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: payload }),
  }).catch(() => { /* SIGNAL not running — events are persisted locally */ });
}

export function exportCsv(): string {
  const header = 'session_id,world_id,difficulty,event_type,timestamp,time_in_session_s,value1,value2,value3';
  const rows = buffer.map(e =>
    [e.session_id, e.world_id, e.difficulty, e.event_type, e.timestamp, e.time_in_session_s, e.value1, e.value2, e.value3]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCsv() {
  const csv = exportCsv();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gameforge-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getEvents(): GameEvent[] {
  return buffer.slice();
}

export function clearEvents() {
  buffer = [];
  localStorage.removeItem(STORAGE_KEY);
}
