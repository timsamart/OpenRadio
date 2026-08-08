import type { Catalog, Genre, Station } from '../types';
import { createStore } from '../state/store';
import { idb, STORE } from './db';
import { SearchIndex } from '../search';
import { setStationResolver } from '../audio/engine';

/**
 * Catalog loading — PRD §17, §23, guardrails 7 & 8.
 *
 * The catalog is a static asset generated at build time, never a live call to a
 * third party. It is cached in IndexedDB on every successful load so the app
 * shell works offline, and a failed fetch falls back to that snapshot instead
 * of showing an empty product. Favorites live in a different object store, so
 * losing the catalog can never take them with it.
 */

interface CatalogState {
  ready: boolean;
  stale: boolean;
  generated: string | null;
  stations: Station[];
  byId: Map<string, Station>;
  index: SearchIndex | null;
  error: string | null;
}

export const catalog = createStore<CatalogState>({
  ready: false,
  stale: false,
  generated: null,
  stations: [],
  byId: new Map(),
  index: null,
  error: null,
});

const SNAPSHOT_KEY = 'snapshot';

function adopt(data: Catalog, stale: boolean): void {
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  catalog.set({
    ready: true,
    stale,
    generated: data.generated,
    stations: data.stations,
    byId,
    index: new SearchIndex(data.stations),
    error: null,
  });
  setStationResolver((id) => byId.get(id) ?? null);
}

export async function loadCatalog(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}catalog.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Catalog;
    if (!Array.isArray(data.stations) || !data.stations.length) throw new Error('empty catalog');
    adopt(data, false);
    void idb.put(STORE.catalog, { key: SNAPSHOT_KEY, data });
    return;
  } catch (err) {
    const cached = await idb.get<{ key: string; data: Catalog }>(STORE.catalog, SNAPSHOT_KEY);
    if (cached?.data) {
      adopt(cached.data, true);
      return;
    }
    catalog.set({
      ready: true,
      error: err instanceof Error ? err.message : 'catalog unavailable',
    });
  }
}

/* ---------------------------------------------------------------- queries */

export function station(id: string): Station | null {
  return catalog.get().byId.get(id) ?? null;
}

export function stationsByIds(ids: string[]): Station[] {
  const { byId } = catalog.get();
  return ids.map((id) => byId.get(id)).filter((s): s is Station => Boolean(s));
}

export function byGenre(genre: Genre): Station[] {
  return catalog
    .get()
    .stations.filter((s) => s.genres.includes(genre))
    .sort(rankForDiscovery);
}

export function byCity(city: string): Station[] {
  return catalog
    .get()
    .stations.filter((s) => s.city === city)
    .sort(rankForDiscovery);
}

export function cities(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const s of catalog.get().stations) {
    if (s.city) counts.set(s.city, (counts.get(s.city) ?? 0) + 1);
  }
  // The six the PRD names stay pinned; everything else is alphabetical, so the
  // list never becomes a ranking nobody asked for.
  const PINNED = ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos'];
  const all = [...counts.entries()].map(([name, count]) => ({ name, count }));
  return [
    ...PINNED.map((n) => all.find((c) => c.name === n)).filter((c): c is { name: string; count: number } => Boolean(c)),
    ...all.filter((c) => !PINNED.includes(c.name)).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

export function popular(limit = 12): Station[] {
  return [...catalog.get().stations].sort(rankForDiscovery).slice(0, limit);
}

/**
 * Discovery ordering (PRD §16): a station whose stream keeps failing loses its
 * prominent position automatically. The listener is not the monitoring system.
 */
export function rankForDiscovery(a: Station, b: Station): number {
  const h = (s: Station) => (s.health.status === 'healthy' ? 0 : s.health.status === 'flaky' ? 1 : 2);
  return (
    h(a) - h(b) ||
    Number(b.featured) - Number(a.featured) ||
    b.health.recent_success_rate - a.health.recent_success_rate ||
    b.popularity - a.popularity
  );
}

/** Three healthy alternatives from the same genre, for the unavailable state. */
export function alternativesFor(s: Station, limit = 3): Station[] {
  const genre = s.genres[0];
  return catalog
    .get()
    .stations.filter(
      (c) => c.id !== s.id && c.health.status === 'healthy' && (genre ? c.genres.includes(genre) : true),
    )
    .sort(rankForDiscovery)
    .slice(0, limit);
}
