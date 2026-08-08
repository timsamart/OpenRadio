import { useState } from 'react';
import type { Station } from '../types';
import { stationHash } from '../search';

/**
 * Station artwork with a designed fallback.
 *
 * Greek station logos are inconsistently available, often tiny, and carry
 * rights questions before a commercial launch (PRD §34). So the monogram is
 * not an error state — it is the default, and a logo is the enhancement. The
 * hue is derived from the station id, so a station looks the same on every
 * device and after every reinstall.
 *
 * All eight tile colours clear 5.4:1 against the white glyph.
 */

const TILES = [
  '#1b6f9c', // aegean
  '#14456b', // deep sea
  '#a8442a', // terracotta
  '#8a6216', // ochre
  '#4f5e2c', // olive
  '#2f6b52', // cypress
  '#972e5f', // bougainvillea
  '#7a5f3a', // sand
] as const;

interface Props {
  station: Station;
  lang: string;
  className?: string;
  /** Only pass true for artwork above the fold. */
  eager?: boolean;
}

export function Artwork({ station, lang, className = 'art', eager = false }: Props) {
  const [broken, setBroken] = useState(false);
  const tile = TILES[stationHash(station.id) % TILES.length]!;
  const source = lang === 'el' && station.name_el ? station.name_el : station.name;
  // Take the first grapheme, not the first code unit: Greek is fine either way
  // but an emoji-prefixed station name would otherwise render half a glyph.
  const monogram = [...source.trim()][0] ?? '?';

  return (
    <div className={className} style={{ background: tile }} aria-hidden="true">
      {station.logo && !broken ? (
        <img
          src={station.logo}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width={512}
          height={512}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        monogram.toLocaleUpperCase(lang === 'el' ? 'el-GR' : 'en-GB')
      )}
    </div>
  );
}
