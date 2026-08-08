import { playback, toggle } from '../audio/engine';
import { library, toggleFavorite } from '../data/library';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { openOverlay, stationUrl } from '../app/router';
import { Artwork } from './Artwork';
import { Heart, Pause, Play } from './Icons';
import { useDelayedFlag } from './hooks';

/**
 * The persistent mini-player — PRD §10.
 *
 * Rendered by the app shell, OUTSIDE the route outlet, with no route-derived
 * key. It cannot unmount because the user changed screens, which is the whole
 * point: the audio session does not belong to a page.
 */
export function MiniPlayer() {
  const { lang, t } = usePrefs();
  const state = useStore(playback);
  const { favorites } = useStore(library);

  const connecting =
    state.status === 'connecting' || state.status === 'retrying' || state.status === 'failover';
  const showConnecting = useDelayedFlag(connecting, 400);

  if (!state.engaged || !state.station) return null;

  const s = state.station;
  const name = lang === 'el' && s.name_el ? s.name_el : s.name;
  const label = `${name}${s.frequency ? ` ${s.frequency.value}` : ''}`;
  const isFavorite = favorites.includes(s.id);
  const playingNow = state.status === 'playing';

  const sleepLine =
    state.sleepMsLeft !== null
      ? `${Math.max(1, Math.ceil(state.sleepMsLeft / 60_000))} ${t('timer.left')}`
      : null;

  const meta = (() => {
    if (state.status === 'unavailable') return t('player.unavailableShort');
    if (showConnecting) return t('player.connecting');
    if (sleepLine) return sleepLine;
    if (state.meta?.title) return [state.meta.artist, state.meta.title].filter(Boolean).join(' — ');
    return [s.city, s.genres[0] ? t(`genre.${s.genres[0]}` as never) : null].filter(Boolean).join(' · ');
  })();

  return (
    <div className="mini">
      <button
        type="button"
        className="mini__open"
        onClick={() => openOverlay('now-playing', stationUrl(s.id))}
        aria-label={`${t('player.open')}: ${label}`}
      >
        <Artwork station={s} lang={lang} className="art" eager />
        <span className="row__text">
          <span className="mini__name tnum">{label}</span>
          <span className="mini__meta">
            {playingNow ? (
              <>
                <span className="eq" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="eq-text">{t('player.playing')}</span>
              </>
            ) : null}
            {meta}
          </span>
        </span>
      </button>

      <button
        type="button"
        className={`icon-btn${isFavorite ? ' is-on' : ''}`}
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? t('player.unfavorite') : t('player.favorite')}: ${label}`}
        onClick={() => void toggleFavorite(s.id)}
      >
        <Heart filled={isFavorite} />
      </button>

      <button
        type="button"
        className="pp"
        onClick={toggle}
        aria-label={`${playingNow || connecting ? t('player.pause') : t('player.play')}: ${label}`}
      >
        {playingNow || connecting ? <Pause size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}
