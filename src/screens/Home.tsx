import { useMemo } from 'react';
import { catalog, popular, stationsByIds } from '../data/catalog';
import { library, recentStationIds, suggestion } from '../data/library';
import { playback, playStation } from '../audio/engine';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { navigate, openOverlay } from '../app/router';
import { StationRow } from '../ui/StationRow';
import { Artwork } from '../ui/Artwork';
import { Search } from '../ui/Icons';
import type { Station } from '../types';

/**
 * Home is a launcher, not a feed — PRD §6.
 *
 * Every section is hard-capped. There is no infinite list, no footer, and no
 * greeting: a returning listener's favorite must be reachable without a scroll,
 * and a new listener gets a full screen of playable stations rather than an
 * empty state with an illustration.
 */
export function Home() {
  const { lang, t } = usePrefs();
  const { ready, stations } = useStore(catalog);
  const { favorites, history } = useStore(library);
  const { station: current } = useStore(playback);

  const recent = useMemo(() => stationsByIds(recentStationIds(6)), [history, stations]);
  const favoriteStations = useMemo(() => stationsByIds(favorites), [favorites, stations]);
  const top = useMemo(() => popular(10), [stations]);

  const hint = useMemo(() => suggestion(), [history, favorites]);
  const suggested = hint ? stationsByIds([hint.stationId])[0] : undefined;

  if (!ready) return <HomeSkeleton />;

  const favoriteQueue = { label: t('player.queue.favorites'), ids: favorites };
  const popularQueue = { label: t('player.queue.popular'), ids: top.map((s) => s.id) };
  const recentQueue = { label: t('player.queue.recent'), ids: recent.map((s) => s.id) };

  return (
    <>
      <header className="appbar">
        <h1>{t('app.name')}</h1>
        <span className="spacer" />
        <button
          type="button"
          className="icon-btn"
          onClick={() => openOverlay('search')}
          aria-label={t('search.open')}
        >
          <Search />
        </button>
      </header>

      <div className="screen">
        {suggested && hint ? (
          <>
            <p className="section-label">{t('home.forNow')}</p>
            <p className="reason">{t(`home.reason.${camel(hint.reason)}` as never)}</p>
            <ul>
              <StationRow
                station={suggested}
                queue={{ label: t('home.forNow'), ids: [suggested.id, ...favorites] }}
              />
            </ul>
          </>
        ) : null}

        {recent.length ? (
          <>
            <p className="section-label">{t('home.recent')}</p>
            <div className="rail">
              {recent.map((s) => (
                <RailTile key={s.id} station={s} lang={lang} current={current?.id === s.id} queue={recentQueue} />
              ))}
            </div>
          </>
        ) : null}

        {favoriteStations.length ? (
          <>
            <p className="section-label">
              {t('home.yours')}
              {favoriteStations.length > 5 ? (
                <button type="button" className="link" onClick={() => navigate('/my-radio')}>
                  {t('home.seeAll')}
                </button>
              ) : null}
            </p>
            <ul>
              {favoriteStations.slice(0, 5).map((s) => (
                <StationRow key={s.id} station={s} queue={favoriteQueue} />
              ))}
            </ul>
          </>
        ) : null}

        <p className="section-label">{t('home.popular')}</p>
        <ul>
          {top.slice(0, 8).map((s) => (
            <StationRow key={s.id} station={s} queue={popularQueue} />
          ))}
        </ul>
      </div>
    </>
  );
}

function RailTile({
  station,
  lang,
  current,
  queue,
}: {
  station: Station;
  lang: string;
  current: boolean;
  queue: { label: string; ids: string[] };
}) {
  const { t } = usePrefs();
  const name = lang === 'el' && station.name_el ? station.name_el : station.name;
  const label = `${name}${station.frequency ? ` ${station.frequency.value}` : ''}`;
  return (
    <button
      type="button"
      className={`tile${current ? ' is-current' : ''}`}
      onClick={() => playStation(station, queue)}
      aria-label={`${t('player.play')} ${label}`}
    >
      <Artwork station={station} lang={lang} eager />
      <span className="tile__name tnum">{label}</span>
    </button>
  );
}

/** Reserved space, exact final height — an async region must not shift layout. */
function HomeSkeleton() {
  return (
    <div className="screen" aria-busy="true">
      <div style={{ height: 56 }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: 8 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface-2)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '45%', borderRadius: 6, background: 'var(--surface-2)' }} />
            <div style={{ height: 11, width: '30%', borderRadius: 6, background: 'var(--surface-2)', marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function camel(reason: string): string {
  return reason.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
