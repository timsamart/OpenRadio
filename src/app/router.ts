import { createStore } from '../state/store';

/**
 * Routing — PRD §5 vs §27, resolved.
 *
 * Three tabs are real routes. Now Playing, Search and the sleep timer are
 * *overlays*: they push a history entry so Back and Esc close them, but they
 * never become the current route, so the tab bar underneath stays correct and
 * the screen beneath keeps its scroll position.
 *
 * `/radio/:id` is an entry point, not a destination — it renders Home with the
 * Now Playing sheet on top, and still requires one Play tap (§21, §27).
 */

export type Overlay = 'now-playing' | 'search' | 'timer' | null;

interface RouteState {
  path: string;
  overlay: Overlay;
  /** Station id carried by a /radio/:id deep link, consumed once on boot. */
  deepLink: string | null;
}

/**
 * Everything below works in app-space ("/discover"), never in URL-space
 * ("/openradio/discover"). `BASE` is the only place the deployment prefix
 * exists, so hosting under a project-Pages subpath cannot leak into routing.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

function readPath(): string {
  let path = window.location.pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  return path.replace(/\/+$/, '') || '/';
}

/** App-space path → the URL to actually put in the address bar. */
export function href(path: string): string {
  return `${BASE}${path}` || '/';
}

/** The shareable URL for a station (PRD §27). */
export function stationUrl(id: string): string {
  return href(`/radio/${id}`);
}

const initialPath = readPath();
const deepLinkMatch = /^\/radio\/([^/]+)$/.exec(initialPath);

export const router = createStore<RouteState>({
  path: deepLinkMatch ? '/' : initialPath,
  overlay: deepLinkMatch ? 'now-playing' : null,
  deepLink: deepLinkMatch?.[1] ?? null,
});

export function navigate(path: string, replace = false): void {
  const current = router.get();
  if (current.path === path && current.overlay === null) return;
  const method = replace ? 'replaceState' : 'pushState';
  window.history[method]({ path, overlay: null }, '', href(path));
  router.set({ path, overlay: null });
}

export function openOverlay(overlay: Exclude<Overlay, null>, url?: string): void {
  const { path } = router.get();
  window.history.pushState({ path, overlay }, '', url ?? window.location.pathname);
  router.set({ overlay });
}

export function closeOverlay(): void {
  if (router.get().overlay === null) return;
  // Going back is what the user's own Back button would do — keep them identical
  // so the sheet never becomes a trap that history disagrees with.
  window.history.back();
}

export function consumeDeepLink(): string | null {
  const { deepLink } = router.get();
  if (deepLink) router.set({ deepLink: null });
  return deepLink;
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    const state = (e.state ?? {}) as Partial<RouteState>;
    router.set({
      path: state.path ?? readPath(),
      overlay: state.overlay ?? null,
    });
  });
}

/** Parsed view for the current path. Kept dumb on purpose — three tabs and two lists. */
export type View =
  | { name: 'home' }
  | { name: 'discover' }
  | { name: 'genre'; id: string }
  | { name: 'city'; id: string }
  | { name: 'my-radio' };

export function viewFor(path: string): View {
  if (path === '/discover') return { name: 'discover' };
  if (path === '/my-radio') return { name: 'my-radio' };
  const genre = /^\/discover\/genre\/([^/]+)$/.exec(path);
  if (genre?.[1]) return { name: 'genre', id: decodeURIComponent(genre[1]) };
  const city = /^\/discover\/city\/([^/]+)$/.exec(path);
  if (city?.[1]) return { name: 'city', id: decodeURIComponent(city[1]) };
  return { name: 'home' };
}
