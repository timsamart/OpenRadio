/**
 * Product reliability events — PRD §32.
 *
 * These are the events the PRD names, and nothing else. There is no network
 * transport wired up: no endpoint, no identifier, no profile. Counts stay in
 * memory for the Diagnostics panel, which is the only place they are ever read.
 *
 * If a transport is added later it must stay inside this file, must remain
 * anonymous, and must never block the play path.
 */

export type EventName =
  | 'station_play_requested'
  | 'station_play_success'
  | 'station_play_failure'
  | 'station_session_success'
  | 'stream_failover'
  | 'search_performed'
  | 'favorite_added'
  | 'pwa_installed';

const counts = new Map<EventName, number>();

export function track(name: EventName, detail?: Record<string, unknown>): void {
  counts.set(name, (counts.get(name) ?? 0) + 1);
  if (import.meta.env.DEV) console.debug(`[event] ${name}`, detail ?? '');
}

export function eventCounts(): [EventName, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
