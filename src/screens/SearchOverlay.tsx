import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalog, popular } from '../data/catalog';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { closeOverlay } from '../app/router';
import { StationRow } from '../ui/StationRow';
import { ChevronLeft, Close, Search } from '../ui/Icons';
import { useEscape } from '../ui/hooks';
import { track } from '../audio/events';
import { playStation } from '../audio/engine';

const RECENTS_KEY = 'openradio.recentSearches.v1';

function readRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Global search — PRD §8.
 *
 * The index is local, so there is deliberately NO debounce: a debounce would be
 * the only thing standing between the keystroke and the <100 ms target. There
 * is no Search button either; results appear as you type, and Enter plays the
 * top one.
 */
export function SearchOverlay() {
  const { t, lang } = usePrefs();
  const { index } = useStore(catalog);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState(readRecents);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => closeOverlay(), []);
  useEscape(close);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hits = useMemo(() => (index && query.trim() ? index.query(query) : []), [index, query]);

  const remember = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    const next = [trimmed, ...recents.filter((r) => r !== trimmed)].slice(0, 3);
    setRecents(next);
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    track('search_performed', { length: trimmed.length, results: hits.length });
  };

  const queue = { label: `${t('player.queue.search')} “${query.trim()}”`, ids: hits.map((h) => h.station.id) };
  const fallback = popular(3);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('search.label')}>
      <div className="appbar" style={{ gap: 4, paddingInline: 8 }}>
        <button type="button" className="icon-btn" onClick={close} aria-label={t('search.close')}>
          <ChevronLeft />
        </button>
        <form className="search-bar" role="search" onSubmit={(e) => e.preventDefault()}>
          <Search size={17} />
          <label className="sr-only" htmlFor="station-search">
            {t('search.label')}
          </label>
          <input
            id="station-search"
            ref={inputRef}
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              remember(query);
              const top = hits[0];
              if (top) playStation(top.station, queue);
            }}
            onBlur={() => remember(query)}
          />
          {query ? (
            <button
              type="button"
              className="icon-btn"
              style={{ width: 32, height: 32 }}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label={t('search.clear')}
            >
              <Close size={16} />
            </button>
          ) : null}
        </form>
      </div>

      <div className="screen no-mini" style={{ overflowY: 'auto' }}>
        {/* Polite, not assertive: a count should not interrupt every keystroke. */}
        <p className="section-label" aria-live="polite">
          {query.trim() ? `${hits.length} ${t('search.results')}` : t('search.recent')}
        </p>

        {query.trim() ? (
          hits.length ? (
            <ul>
              {hits.map((hit) => (
                <StationRow
                  key={hit.station.id}
                  station={hit.station}
                  queue={queue}
                  hint={hit.field === 'name' ? null : hit.matched}
                />
              ))}
            </ul>
          ) : (
            <>
              <p className="empty">{t('search.none')}</p>
              <p className="section-label">{t('search.noneHint')}</p>
              <ul>
                {fallback.map((s) => (
                  <StationRow
                    key={s.id}
                    station={s}
                    queue={{ label: t('player.queue.popular'), ids: fallback.map((f) => f.id) }}
                  />
                ))}
              </ul>
            </>
          )
        ) : recents.length ? (
          <ul>
            {recents.map((r) => (
              <li key={r} className="row">
                <button type="button" className="row__play" onClick={() => setQuery(r)}>
                  <span className="row__text">
                    <span className="row__name" lang={lang}>
                      {r}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul>
            {fallback.map((s) => (
              <StationRow
                key={s.id}
                station={s}
                queue={{ label: t('player.queue.popular'), ids: fallback.map((f) => f.id) }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
