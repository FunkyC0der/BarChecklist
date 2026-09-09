import { getSupabase } from './supabase';
import type { LogEntry } from './logger';

const MAX_RING = 50;
const MAX_BATCH = 20;
const FLUSH_INTERVAL_MS = 10_000;

export const sessionId = crypto.randomUUID();

const ring: LogEntry[] = [];
const queue: LogEntry[] = [];
let flushing = false;
let listening = false;

function pushRing(entry: LogEntry) {
  ring.push(entry);
  if (ring.length > MAX_RING) ring.shift();
}

function toRow(entry: LogEntry) {
  return {
    level: entry.level,
    event: entry.event,
    code: entry.error?.code ?? null,
    context: entry.context,
    occurredAt: entry.occurredAt,
    teamId:
      typeof entry.context.teamId === 'string' ? entry.context.teamId : null,
    sessionId,
    appVersion: __APP_VERSION__,
  };
}

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const { error } = await getSupabase().rpc('log_client_event', {
      p_events: batch.map(toRow),
    });
    if (error) throw error;
  } catch {
    // The sink never throws and never re-enters logger.* to report its own
    // failure — there is no session (RPC requires auth) or the network is
    // down, and either way that's not something worth surfacing recursively.
  } finally {
    flushing = false;
  }
}

function ensureListening() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush();
  });
}

/** Called only for warn/error entries — logger.ts keeps debug/info local. */
export function queueLogEvent(entry: LogEntry) {
  pushRing(entry);
  queue.push(entry);
  if (queue.length > MAX_BATCH) queue.shift();
  ensureListening();
  if (entry.level === 'error') void flush();
}

/** Base for a future "send diagnostics" button — the last 50 log entries,
 * already allowlist-filtered by logger.ts. */
export function getRecentEvents(): readonly LogEntry[] {
  return ring;
}
