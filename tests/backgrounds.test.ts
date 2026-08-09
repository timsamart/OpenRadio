import { describe, expect, it } from 'vitest';
import { BACKGROUND_FAMILY_COUNTS, backgroundForStation } from '../src/ui/backgrounds';
import type { Genre, Station } from '../src/types';

function station(id: string, genre: Genre): Station {
  return {
    id,
    name: id,
    name_el: null,
    aliases: [],
    country: 'GR',
    city: 'Athens',
    genres: [genre],
    frequency: null,
    logo: null,
    homepage: null,
    featured: false,
    popularity: 1,
    streams: [],
    health: {
      status: 'healthy',
      last_checked: '2026-08-09T00:00:00Z',
      recent_success_rate: 1,
      latency_ms: 100,
      checks: 1,
    },
  };
}

describe('radio backgrounds', () => {
  it('keeps the same station and metadata on the same artwork', () => {
    const s = station('melodia', 'greek-pop');
    expect(backgroundForStation(s, 'Artist|Track')).toEqual(backgroundForStation(s, 'Artist|Track'));
  });

  it('keeps news and sports inside their literal visual families', () => {
    expect(backgroundForStation(station('news', 'news-talk')).family).toBe('news-talk');
    expect(backgroundForStation(station('sport', 'sport')).family).toBe('sports');
  });

  it('always returns an existing variant and a base-aware WebP URL', () => {
    const genres: Genre[] = ['greek-pop', 'laiko', 'entekhno', 'retro', 'international', 'news-talk', 'sport'];

    for (const genre of genres) {
      const background = backgroundForStation(station(`station-${genre}`, genre), 'now playing');
      expect(background.variant).toBeGreaterThanOrEqual(1);
      expect(background.variant).toBeLessThanOrEqual(BACKGROUND_FAMILY_COUNTS[background.family]);
      expect(background.src).toMatch(/backgrounds\/[a-z-]+-\d{2}\.webp$/);
    }
  });
});
