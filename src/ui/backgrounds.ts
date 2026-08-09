import { stationHash } from '../search';
import type { Genre, Station } from '../types';

export const BACKGROUND_FAMILY_COUNTS = {
  'greek-contemporary': 7,
  laiko: 7,
  traditional: 4,
  rock: 5,
  'dance-electronic': 5,
  'jazz-lounge': 4,
  'news-talk': 3,
  sports: 3,
  'international-pop': 6,
  chill: 7,
} as const;

export type BackgroundFamily = keyof typeof BACKGROUND_FAMILY_COUNTS;

export interface RadioBackground {
  id: string;
  family: BackgroundFamily;
  variant: number;
  src: string;
}

/**
 * The station catalog intentionally uses broad discovery genres. Each broad
 * genre therefore owns a small, semantically safe visual neighbourhood rather
 * than a single repetitive art family.
 */
const FAMILIES_BY_GENRE: Record<Genre, readonly BackgroundFamily[]> = {
  'greek-pop': ['greek-contemporary', 'international-pop', 'chill'],
  laiko: ['laiko', 'traditional'],
  entekhno: ['greek-contemporary', 'jazz-lounge', 'chill'],
  retro: ['international-pop', 'rock', 'jazz-lounge'],
  international: ['international-pop', 'dance-electronic', 'rock', 'jazz-lounge', 'chill'],
  'news-talk': ['news-talk'],
  sport: ['sports'],
};

interface Candidate {
  id: string;
  family: BackgroundFamily;
  variant: number;
}

function candidates(families: readonly BackgroundFamily[]): Candidate[] {
  return families.flatMap((family) =>
    Array.from({ length: BACKGROUND_FAMILY_COUNTS[family] }, (_, index) => {
      const variant = index + 1;
      return {
        id: `${family}-${String(variant).padStart(2, '0')}`,
        family,
        variant,
      };
    }),
  );
}

const CANDIDATES_BY_GENRE = Object.fromEntries(
  Object.entries(FAMILIES_BY_GENRE).map(([genre, families]) => [genre, candidates(families)]),
) as Record<Genre, Candidate[]>;

/**
 * Pick an image deterministically: a station keeps its visual identity, while
 * a metadata seed lets the ambient scene evolve when the track changes.
 */
export function backgroundForStation(station: Station, metadataSeed = ''): RadioBackground {
  const genre = station.genres[0] ?? 'international';
  const choices = CANDIDATES_BY_GENRE[genre];
  const normalizedSeed = metadataSeed.trim().toLocaleLowerCase('en');
  const hash = stationHash(`${station.id}\u0000${normalizedSeed}`);
  const choice = choices[hash % choices.length]!;

  return {
    ...choice,
    src: `${import.meta.env.BASE_URL}backgrounds/${choice.id}.webp`,
  };
}
