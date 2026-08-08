import { useMemo, type ComponentType } from 'react';
import { byCity, byGenre, catalog, cities, popular } from '../data/catalog';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { navigate, openOverlay } from '../app/router';
import { StationRow } from '../ui/StationRow';
import {
  ChevronLeft,
  Disc,
  Flame,
  Globe,
  MapPin,
  Mic,
  MusicNote,
  Newspaper,
  Notes,
  Search,
  Trophy,
} from '../ui/Icons';
import type { Genre } from '../types';
import type { MessageKey } from '../i18n';

/**
 * Discover — PRD §7.
 *
 * Category → audio in two taps, and the taxonomy is capped at two levels by
 * design. There is no A–Z directory and no raw source tags: the tile set below
 * is closed and curated, which is the whole reason this screen exists instead
 * of a search box over 30,000 stations.
 */

const CATEGORIES: {
  genre: Genre | 'popular';
  key: MessageKey;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  { genre: 'popular', key: 'genre.popular', Icon: Flame },
  { genre: 'greek-pop', key: 'genre.greek-pop', Icon: MusicNote },
  { genre: 'laiko', key: 'genre.laiko', Icon: Mic },
  { genre: 'entekhno', key: 'genre.entekhno', Icon: Notes },
  { genre: 'retro', key: 'genre.retro', Icon: Disc },
  { genre: 'international', key: 'genre.international', Icon: Globe },
  { genre: 'news-talk', key: 'genre.news-talk', Icon: Newspaper },
  { genre: 'sport', key: 'genre.sport', Icon: Trophy },
];

export function Discover() {
  const { t } = usePrefs();
  const { ready, stations } = useStore(catalog);
  const cityList = useMemo(() => cities(), [stations]);

  return (
    <>
      <header className="appbar">
        <h1>{t('discover.title')}</h1>
        <span className="spacer" />
        <button type="button" className="icon-btn" onClick={() => openOverlay('search')} aria-label={t('search.open')}>
          <Search />
        </button>
      </header>

      <div className="screen">
        <div className="cats">
          {CATEGORIES.map(({ genre, key, Icon }) => (
            <button
              key={genre}
              type="button"
              className="cat"
              onClick={() => navigate(`/discover/genre/${genre}`)}
            >
              <Icon />
              <span>{t(key)}</span>
            </button>
          ))}
        </div>

        <p className="section-label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} />
            {t('discover.byLocation')}
          </span>
        </p>

        {ready ? (
          <ul>
            {cityList.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  className="city-row"
                  onClick={() => navigate(`/discover/city/${encodeURIComponent(c.name)}`)}
                >
                  <span className="row__name">{c.name}</span>
                  <span className="count tnum">{c.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}

/** Second and final level. Tapping a row here plays — nothing drills deeper. */
export function StationList({ kind, id }: { kind: 'genre' | 'city'; id: string }) {
  const { t } = usePrefs();
  const { stations } = useStore(catalog);

  const list = useMemo(() => {
    if (kind === 'city') return byCity(id);
    if (id === 'popular') return popular(24);
    return byGenre(id as Genre);
  }, [kind, id, stations]);

  const title = kind === 'city' ? id : t(`genre.${id}` as MessageKey);
  const queue = { label: title, ids: list.map((s) => s.id) };

  return (
    <>
      <header className="appbar">
        <button type="button" className="icon-btn" onClick={() => navigate('/discover')} aria-label={t('nav.discover')}>
          <ChevronLeft />
        </button>
        <h1>{title}</h1>
      </header>

      <div className="screen">
        <p className="section-label">
          {list.length} {t('discover.stations')}
        </p>
        {list.length ? (
          <ul>
            {list.map((s) => (
              <StationRow key={s.id} station={s} queue={queue} />
            ))}
          </ul>
        ) : (
          <p className="empty">{t('search.none')}</p>
        )}
      </div>
    </>
  );
}
