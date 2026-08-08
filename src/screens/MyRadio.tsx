import { useMemo, useState } from 'react';
import { catalog, station, stationsByIds } from '../data/catalog';
import { clearHistory, library, moveFavorite } from '../data/library';
import { useStore } from '../state/store';
import { setLang, setTheme, usePrefs } from '../state/prefs';
import { StationRow } from '../ui/StationRow';
import { ArrowDown, ArrowUp } from '../ui/Icons';
import { relativeDay } from '../i18n';
import { eventCounts } from '../audio/events';
import { InstallCard } from '../ui/InstallCard';
import type { LangPref, ThemePref } from '../data/db';

/**
 * My Radio — PRD §9.
 *
 * This replaces the concept of a profile, so it contains no identity, no
 * avatar, and no statistics. It is a shelf. Listening-time totals and "top
 * station of the month" are exactly the dashboard aesthetic §29 rules out.
 */
export function MyRadio() {
  const { t, lang, theme } = usePrefs();
  const { favorites, history } = useStore(library);
  const { stations } = useStore(catalog);
  const [editing, setEditing] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const favoriteStations = useMemo(() => stationsByIds(favorites), [favorites, stations]);
  const historyRows = useMemo(
    () =>
      history
        .map((h) => ({ entry: h, station: station(h.stationId) }))
        .filter((r): r is { entry: (typeof history)[number]; station: NonNullable<ReturnType<typeof station>> } =>
          Boolean(r.station),
        )
        .slice(0, 20),
    [history, stations],
  );

  const queue = { label: t('player.queue.favorites'), ids: favorites };

  async function move(id: string, delta: number, name: string) {
    await moveFavorite(id, delta);
    const pos = library.get().favorites.indexOf(id) + 1;
    setAnnouncement(`${name}, ${t('myRadio.position')} ${pos}/${favorites.length}`);
  }

  return (
    <>
      <header className="appbar">
        <h1>{t('myRadio.title')}</h1>
      </header>

      <div className="screen">
        <p className="section-label">
          {t('myRadio.favorites')}
          {favoriteStations.length > 1 ? (
            <button type="button" className="link" onClick={() => setEditing((e) => !e)}>
              {editing ? t('myRadio.done') : t('myRadio.edit')}
            </button>
          ) : null}
        </p>

        {/* Reordering must not be drag-only: gesture-only actions are ruled out
            by §31, so the arrows are the primary mechanism, not a fallback. */}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {favoriteStations.length ? (
          <ul>
            {favoriteStations.map((s, i) => {
              const name = lang === 'el' && s.name_el ? s.name_el : s.name;
              return editing ? (
                <li key={s.id} className="row">
                  <span className="row__play" style={{ cursor: 'default' }}>
                    <span className="row__text">
                      <span className="row__name tnum">
                        {name}
                        {s.frequency ? ` ${s.frequency.value}` : ''}
                      </span>
                      <span className="row__meta tnum">
                        {t('myRadio.position')} {i + 1}/{favoriteStations.length}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === 0}
                    onClick={() => void move(s.id, -1, name)}
                    aria-label={`${t('myRadio.moveUp')}: ${name}`}
                  >
                    <ArrowUp />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === favoriteStations.length - 1}
                    onClick={() => void move(s.id, 1, name)}
                    aria-label={`${t('myRadio.moveDown')}: ${name}`}
                  >
                    <ArrowDown />
                  </button>
                </li>
              ) : (
                <StationRow key={s.id} station={s} queue={queue} />
              );
            })}
          </ul>
        ) : (
          <p className="empty">{t('myRadio.noFavorites')}</p>
        )}

        <p className="section-label">
          {t('myRadio.history')}
          {historyRows.length ? (
            <button type="button" className="link" onClick={() => void clearHistory()}>
              {t('myRadio.clearHistory')}
            </button>
          ) : null}
        </p>

        {historyRows.length ? (
          <ul>
            {historyRows.map(({ entry, station: s }) => (
              <StationRow
                key={entry.at}
                station={s}
                queue={{ label: t('player.queue.recent'), ids: historyRows.map((r) => r.station.id) }}
                showFavorite={false}
                trailing={<span className="row__meta">{relativeDay(entry.at, lang, t)}</span>}
              />
            ))}
          </ul>
        ) : (
          <p className="empty">{t('myRadio.noHistory')}</p>
        )}

        <p className="section-label">{t('myRadio.settings')}</p>

        <div className="setting">
          <span className="setting__label">{t('settings.theme')}</span>
          <div className="segmented">
            {(['system', 'light', 'dark'] as ThemePref[]).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={theme === mode}
                onClick={() => setTheme(mode)}
              >
                {t(`settings.theme.${mode}` as never)}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <span className="setting__label">{t('settings.language')}</span>
          <div className="segmented">
            {(['el', 'en', 'de'] as LangPref[]).map((code) => (
              <button key={code} type="button" aria-pressed={lang === code} onClick={() => setLang(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <Diagnostics />
        <InstallCard />

        {/* §33: the app adds no advertising. It does not claim the broadcasters
            do the same, because they do not. */}
        <p className="legal">{t('myRadio.noAds')}</p>
      </div>
    </>
  );
}

/**
 * The only place reliability counters are ever read. They never leave the
 * device and carry no identifier (§32).
 */
function Diagnostics() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const counts = open ? eventCounts() : [];
  const { generated, stale, stations } = useStore(catalog);

  return (
    <div className="setting" style={{ display: 'block' }}>
      <button type="button" className="link" style={{ padding: 0 }} onClick={() => setOpen((o) => !o)}>
        {t('settings.diagnostics')}
      </button>
      {open ? (
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
          <p className="tnum">
            catalog {stations.length}
            {generated ? ` · ${new Date(generated).toLocaleDateString()}` : ''}
            {stale ? ' (cached)' : ''}
          </p>
          {counts.map(([name, n]) => (
            <p key={name} className="tnum">
              {name} {n}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

