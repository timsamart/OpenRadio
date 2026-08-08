import type { Station } from '../types';
import { editDistanceWithin, foldCase, fuzzyBudget, skeleton, skeletons } from './greek';

export type MatchField = 'name' | 'alias' | 'frequency' | 'city' | 'genre';

export interface SearchHit {
  station: Station;
  score: number;
  /** Which dimension matched, so the UI can explain a non-obvious result. */
  field: MatchField;
  /** The literal text that matched, e.g. "rithmos". Null when it was the name. */
  matched: string | null;
}

interface Entry {
  station: Station;
  name: string[];
  alias: string[];
  frequency: string[];
  city: string[];
  genre: string[];
  /** Original strings, parallel to `alias`, for the "matched X" hint. */
  aliasSource: string[];
}

const GENRE_WORDS: Record<string, string[]> = {
  'greek-pop': ['greek pop', 'ελληνικά', 'pop'],
  laiko: ['laiko', 'λαϊκό', 'laika'],
  entekhno: ['entekhno', 'έντεχνο'],
  retro: ['retro', '80s', '90s'],
  international: ['international', 'ξένα', 'foreign'],
  'news-talk': ['news', 'talk', 'ενημέρωση'],
  sport: ['sport', 'αθλητικά'],
};

/**
 * Weights are fixed and ordered on purpose (PRD §8.5): a station name always
 * outranks a metadata match, so typing a city can never bury the station
 * actually called that.
 */
const WEIGHT = {
  nameExact: 1000,
  namePrefix: 720,
  nameWord: 620,
  nameContains: 520,
  nameFuzzy: 380,
  aliasExact: 470,
  aliasPrefix: 420,
  frequency: 360,
  city: 260,
  genre: 180,
} as const;

export class SearchIndex {
  private entries: Entry[];

  constructor(stations: Station[]) {
    this.entries = stations.map((station) => {
      const names = [station.name, station.name_el].filter(Boolean) as string[];
      const aliasSource = [
        ...station.aliases,
        ...(station.city ? [station.city] : []),
      ];
      return {
        station,
        name: unique(names.flatMap(skeletons)),
        alias: unique(station.aliases.flatMap(skeletons)),
        aliasSource,
        frequency: station.frequency ? [String(station.frequency.value)] : [],
        city: station.city ? skeletons(station.city) : [],
        genre: unique(station.genres.flatMap((g) => (GENRE_WORDS[g] ?? [g]).flatMap(skeletons))),
      };
    });
  }

  query(raw: string, limit = 30): SearchHit[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const qSkeletons = skeletons(trimmed);
    const qDigits = foldCase(trimmed).replace(/[^0-9.,]/g, '').replace(',', '.');
    const budget = fuzzyBudget(qSkeletons[0] ?? '');

    const hits: SearchHit[] = [];
    for (const entry of this.entries) {
      const hit = this.scoreEntry(entry, qSkeletons, qDigits, budget);
      if (hit) hits.push(hit);
    }

    hits.sort(
      (a, b) =>
        b.score - a.score ||
        healthRank(a.station) - healthRank(b.station) ||
        b.station.popularity - a.station.popularity,
    );
    return hits.slice(0, limit);
  }

  private scoreEntry(
    entry: Entry,
    qs: string[],
    qDigits: string,
    budget: number,
  ): SearchHit | null {
    let best: { score: number; field: MatchField; matched: string | null } | null = null;
    const take = (score: number, field: MatchField, matched: string | null) => {
      if (!best || score > best.score) best = { score, field, matched };
    };

    for (const q of qs) {
      if (!q) continue;

      for (const key of entry.name) {
        if (key === q) take(WEIGHT.nameExact, 'name', null);
        else if (key.startsWith(q)) take(WEIGHT.namePrefix + lengthBonus(q, key), 'name', null);
        else if (key.includes(q)) take(WEIGHT.nameContains + lengthBonus(q, key), 'name', null);
      }

      entry.alias.forEach((key, i) => {
        if (key === q) take(WEIGHT.aliasExact, 'alias', entry.aliasSource[i] ?? null);
        else if (key.startsWith(q)) take(WEIGHT.aliasPrefix, 'alias', entry.aliasSource[i] ?? null);
      });

      for (const key of entry.city) {
        if (key.startsWith(q)) take(WEIGHT.city, 'city', entry.station.city);
      }
      for (const key of entry.genre) {
        if (key.startsWith(q)) take(WEIGHT.genre, 'genre', null);
      }
    }

    if (qDigits.length >= 2) {
      for (const key of entry.frequency) {
        if (key.startsWith(qDigits)) take(WEIGHT.frequency, 'frequency', key);
      }
    }

    // Fuzzy runs only when nothing matched cleanly — a typo tolerance that fires
    // on top of real matches just reshuffles good results.
    if (!best && budget > 0) {
      const q = qs[0]!;
      for (const key of entry.name) {
        const d = editDistanceWithin(q, key, budget);
        if (d !== null) take(WEIGHT.nameFuzzy - d * 60, 'name', null);
        else if (key.length > q.length) {
          // Typo inside a prefix: "sfaria" should still find "sfaira…".
          const dp = editDistanceWithin(q, key.slice(0, q.length), budget);
          if (dp !== null) take(WEIGHT.nameFuzzy - dp * 60 - 20, 'name', null);
        }
      }
    }

    if (!best) return null;
    const resolved = best as { score: number; field: MatchField; matched: string | null };
    return {
      station: entry.station,
      score: resolved.score + healthBoost(entry.station),
      field: resolved.field,
      matched: resolved.matched,
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/** Shorter keys are better matches: "sfer" against "sfera" beats "sferaradio". */
function lengthBonus(q: string, key: string): number {
  return Math.round((q.length / key.length) * 60);
}

function healthRank(s: Station): number {
  return s.health.status === 'healthy' ? 0 : s.health.status === 'flaky' ? 1 : 2;
}

function healthBoost(s: Station): number {
  return s.health.status === 'healthy' ? 12 : s.health.status === 'flaky' ? 0 : -40;
}

/** Display name: the Greek branding wins when the reader asked for Greek. */
export function displayName(s: Station, lang: string): string {
  return lang === 'el' && s.name_el ? s.name_el : s.name;
}

export function displayNameWithFrequency(s: Station, lang: string): string {
  const base = displayName(s, lang);
  return s.frequency ? `${base} ${s.frequency.value}` : base;
}

/** Deterministic per-station skeleton for monogram colouring. */
export function stationHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export { skeleton };
