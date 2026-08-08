import { idb, STORE } from './db';
import { createStore } from '../state/store';
import type { HistoryEntry, Station } from '../types';
import { track } from '../audio/events';

/**
 * Favorites, history and the local personalization score — PRD §9, §19, §24.
 *
 * Nothing here leaves the device. The score is a handful of additions the user
 * could read out loud, which is the point: "For now" must be explainable in one
 * clause or it does not get shown.
 */

interface FavoriteRecord {
  stationId: string;
  order: number;
  addedAt: number;
}

interface StatRecord {
  stationId: string;
  plays: number;
  seconds: number;
  lastAt: number;
  /** Play counts bucketed by hour of day, 24 slots. */
  hours: number[];
  /** Play counts bucketed by day of week, 7 slots. */
  days: number[];
}

interface LibraryState {
  ready: boolean;
  favorites: string[];
  history: HistoryEntry[];
  stats: Record<string, StatRecord>;
}

export const library = createStore<LibraryState>({
  ready: false,
  favorites: [],
  history: [],
  stats: {},
});

const HISTORY_LIMIT = 50;

export async function loadLibrary(): Promise<void> {
  const [favs, hist, stats] = await Promise.all([
    idb.getAll<FavoriteRecord>(STORE.favorites),
    idb.getAll<HistoryEntry>(STORE.history),
    idb.getAll<StatRecord>(STORE.stats),
  ]);
  library.set({
    ready: true,
    favorites: favs.sort((a, b) => a.order - b.order).map((f) => f.stationId),
    history: hist.sort((a, b) => b.at - a.at).slice(0, HISTORY_LIMIT),
    stats: Object.fromEntries(stats.map((s) => [s.stationId, s])),
  });
}

/* ------------------------------------------------------------- favorites */

export function isFavorite(id: string): boolean {
  return library.get().favorites.includes(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const current = library.get().favorites;
  if (current.includes(id)) {
    await idb.del(STORE.favorites, id);
    library.set({ favorites: current.filter((f) => f !== id) });
  } else {
    const next = [...current, id];
    await idb.put<FavoriteRecord>(STORE.favorites, {
      stationId: id,
      order: next.length - 1,
      addedAt: Date.now(),
    });
    library.set({ favorites: next });
    track('favorite_added', { id });
  }
}

/** Move a favorite by one position. Used by both drag and the arrow buttons. */
export async function moveFavorite(id: string, delta: number): Promise<void> {
  const list = [...library.get().favorites];
  const from = list.indexOf(id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= list.length) return;
  list.splice(to, 0, ...list.splice(from, 1));
  library.set({ favorites: list });
  await Promise.all(
    list.map((stationId, order) =>
      idb.put<FavoriteRecord>(STORE.favorites, { stationId, order, addedAt: Date.now() }),
    ),
  );
}

/* --------------------------------------------------------------- history */

export async function recordListen(stationId: string, seconds: number): Promise<void> {
  if (seconds < 3) return; // a mis-tap is not a listening session

  const at = Date.now();
  const entry: HistoryEntry = { stationId, at, seconds };
  await idb.put(STORE.history, entry);

  const prev = library.get().stats[stationId];
  const d = new Date(at);
  const hours = prev ? [...prev.hours] : new Array<number>(24).fill(0);
  const days = prev ? [...prev.days] : new Array<number>(7).fill(0);
  hours[d.getHours()] = (hours[d.getHours()] ?? 0) + 1;
  days[d.getDay()] = (days[d.getDay()] ?? 0) + 1;

  const stat: StatRecord = {
    stationId,
    plays: (prev?.plays ?? 0) + 1,
    seconds: (prev?.seconds ?? 0) + seconds,
    lastAt: at,
    hours,
    days,
  };
  await idb.put(STORE.stats, stat);

  const state = library.get();
  library.set({
    history: [entry, ...state.history.filter((h) => h.at !== at)].slice(0, HISTORY_LIMIT),
    stats: { ...state.stats, [stationId]: stat },
  });
}

export async function clearHistory(): Promise<void> {
  await idb.clear(STORE.history);
  library.set({ history: [] });
}

/** Most recent distinct stations, newest first. */
export function recentStationIds(limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of library.get().history) {
    if (seen.has(h.stationId)) continue;
    seen.add(h.stationId);
    out.push(h.stationId);
    if (out.length >= limit) break;
  }
  return out;
}

/* ------------------------------------------------- local personalization */

export interface Suggestion {
  stationId: string;
  /** The single clause shown to the user. If we cannot write one, we show nothing. */
  reason: 'time-of-day' | 'weekday' | 'most-played';
}

/**
 * A transparent additive score (PRD §19). Deliberately not a model: every term
 * below can be explained in one sentence, and the winning term becomes the
 * reason line. If no term dominates, "For now" is not rendered at all.
 */
export function suggestion(now = new Date()): Suggestion | null {
  const { stats, favorites, history } = library.get();
  if (history.length < 3) return null; // not enough evidence to claim a habit

  const hour = now.getHours();
  const day = now.getDay();

  let best: { id: string; score: number; reason: Suggestion['reason'] } | null = null;

  for (const stat of Object.values(stats)) {
    const nearHour =
      (stat.hours[hour] ?? 0) * 3 +
      (stat.hours[(hour + 23) % 24] ?? 0) +
      (stat.hours[(hour + 1) % 24] ?? 0);
    const sameDay = stat.days[day] ?? 0;
    const recencyDays = (Date.now() - stat.lastAt) / 86_400_000;
    const recency = Math.max(0, 5 - recencyDays);
    const favorite = favorites.includes(stat.stationId) ? 4 : 0;

    const score = nearHour * 4 + sameDay * 2 + recency + favorite + Math.min(stat.plays, 10);
    const reason: Suggestion['reason'] =
      nearHour >= 2 ? 'time-of-day' : sameDay >= 2 ? 'weekday' : 'most-played';

    if (!best || score > best.score) best = { id: stat.stationId, score, reason };
  }

  // A suggestion nobody would recognise as a habit is noise, not personalization.
  if (!best || best.score < 8) return null;
  return { stationId: best.id, reason: best.reason };
}

/** Ranking used for "Popular now" — health first, then the catalog's own signal. */
export function popularityRank(a: Station, b: Station): number {
  const h = (s: Station) => (s.health.status === 'healthy' ? 0 : s.health.status === 'flaky' ? 1 : 2);
  return h(a) - h(b) || Number(b.featured) - Number(a.featured) || b.popularity - a.popularity;
}
