export type Genre =
  | 'greek-pop'
  | 'laiko'
  | 'entekhno'
  | 'retro'
  | 'international'
  | 'news-talk'
  | 'sport';

export type HealthStatus = 'healthy' | 'flaky' | 'failing' | 'dead';

export interface Stream {
  url: string;
  codec: string;
  bitrate: number;
  priority: number;
}

export interface Health {
  status: HealthStatus;
  last_checked: string;
  recent_success_rate: number;
  latency_ms: number | null;
  checks: number;
}

export interface Station {
  id: string;
  name: string;
  name_el: string | null;
  aliases: string[];
  country: string;
  city: string | null;
  genres: Genre[];
  frequency: { value: number; unit: string } | null;
  logo: string | null;
  homepage: string | null;
  featured: boolean;
  popularity: number;
  streams: Stream[];
  health: Health;
}

export interface Catalog {
  version: number;
  generated: string;
  station_count: number;
  stations: Station[];
}

/**
 * PRD §14. `RETRYING` and `FAILOVER` exist so the engine can reason about
 * recovery, but they are deliberately collapsed to "Connecting…" in the UI —
 * a listener is never told which stream URL attempt they are on.
 */
export type PlaybackStatus =
  | 'idle'
  | 'connecting'
  | 'retrying'
  | 'failover'
  | 'playing'
  | 'paused'
  | 'unavailable';

export interface NowPlayingMeta {
  artist?: string;
  title?: string;
  program?: string;
}

/** Where Previous/Next should go next. Never a time position — this is live radio. */
export interface Queue {
  /** Human-readable origin, e.g. "Favorites" or 'search "sfera"'. */
  label: string;
  ids: string[];
}

export interface PlaybackState {
  status: PlaybackStatus;
  station: Station | null;
  meta: NowPlayingMeta | null;
  queue: Queue | null;
  /** Milliseconds remaining on the sleep timer, or null when it is off. */
  sleepMsLeft: number | null;
  /** True once a station has ever been selected — gates the mini-player. */
  engaged: boolean;
}

export interface HistoryEntry {
  stationId: string;
  at: number;
  /** Seconds of audible playback, used by the local personalization score. */
  seconds: number;
}
