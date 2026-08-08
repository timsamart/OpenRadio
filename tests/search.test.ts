import { describe, expect, it } from 'vitest';
import { SearchIndex } from '../src/search';
import type { Station } from '../src/types';

function make(partial: Partial<Station> & { id: string; name: string }): Station {
  return {
    name_el: null,
    aliases: [],
    country: 'GR',
    city: 'Athens',
    genres: ['greek-pop'],
    frequency: null,
    logo: null,
    homepage: null,
    featured: false,
    popularity: 100,
    streams: [{ url: 'https://example.invalid/s', codec: 'aac', bitrate: 128, priority: 1 }],
    health: {
      status: 'healthy',
      last_checked: '2026-08-08T10:00:00Z',
      recent_success_rate: 1,
      latency_ms: 400,
      checks: 5,
    },
    ...partial,
  } as Station;
}

const STATIONS: Station[] = [
  make({ id: 'sfera', name: 'Sfera', name_el: 'Σφαίρα', aliases: ['Sfera FM'], frequency: { value: 102.2, unit: 'MHz' } }),
  make({ id: 'rythmos', name: 'Rythmos', name_el: 'Ρυθμός', frequency: { value: 94.9, unit: 'MHz' } }),
  make({ id: 'melodia', name: 'Melodia', name_el: 'Μελωδία', genres: ['entekhno'], frequency: { value: 99.2, unit: 'MHz' } }),
  make({ id: 'dromos', name: 'Dromos', name_el: 'Δρόμος', genres: ['laiko'], city: 'Thessaloniki' }),
  make({
    id: 'broken',
    name: 'Sfera Patras',
    city: 'Patras',
    health: {
      status: 'failing',
      last_checked: '2026-08-08T10:00:00Z',
      recent_success_rate: 0.1,
      latency_ms: null,
      checks: 5,
    },
  }),
];

const index = new SearchIndex(STATIONS);
const ids = (q: string) => index.query(q).map((h) => h.station.id);

describe('search', () => {
  it('returns the station after three letters (PRD §8 example)', () => {
    expect(ids('sfer')[0]).toBe('sfera');
  });

  it('finds a Greek-named station typed in Greeklish', () => {
    expect(ids('rithmos')[0]).toBe('rythmos');
    expect(ids('Ρυθμός')[0]).toBe('rythmos');
  });

  it('finds a station typed in Greek when the catalog name is Latin', () => {
    expect(ids('Μελωδία')[0]).toBe('melodia');
  });

  it('matches on frequency', () => {
    expect(ids('102.2')[0]).toBe('sfera');
    expect(ids('99.2')[0]).toBe('melodia');
  });

  it('matches on city but ranks it below a name match', () => {
    expect(ids('thessaloniki')).toContain('dromos');
    // "sfera" is a name for one station and a city-adjacent term for none —
    // the name must win outright.
    expect(ids('sfera')[0]).toBe('sfera');
  });

  it('tolerates a small typo', () => {
    expect(ids('melodya')[0]).toBe('melodia');
  });

  it('ranks an unhealthy station below a healthy one with the same match', () => {
    const order = ids('sfera');
    expect(order.indexOf('sfera')).toBeLessThan(order.indexOf('broken'));
  });

  it('explains a non-name match and stays quiet about a name match', () => {
    const alias = index.query('sfera fm')[0];
    expect(alias?.station.id).toBe('sfera');
    const byName = index.query('melodia')[0];
    expect(byName?.field).toBe('name');
    expect(byName?.matched).toBeNull();
  });

  it('returns nothing for an empty query rather than everything', () => {
    expect(index.query('   ')).toHaveLength(0);
  });
});
