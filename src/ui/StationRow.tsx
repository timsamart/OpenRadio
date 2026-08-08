import type { ReactNode } from 'react';
import type { Queue, Station } from '../types';
import { playback, playStation } from '../audio/engine';
import { library, toggleFavorite } from '../data/library';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { Artwork } from './Artwork';
import { Heart } from './Icons';
import { useDelayedFlag } from './hooks';

/**
 * The product's load-bearing component.
 *
 * Tapping anywhere on the row starts audio (P2, guardrail 3). The row never
 * navigates and never opens a detail screen. The favorite control is a SIBLING
 * of the play target rather than a child, because a <button> inside a <button>
 * is invalid HTML and silently breaks keyboard and assistive-technology
 * traversal in Safari — the platform PRD §20 flags as the risk surface.
 */

interface Props {
  station: Station;
  queue: Queue | null;
  /** e.g. `matched "rithmos"` — shown only when the match was not the name. */
  hint?: string | null;
  trailing?: ReactNode;
  showFavorite?: boolean;
}

export function StationRow({ station, queue, hint, trailing, showFavorite = true }: Props) {
  const { lang, t } = usePrefs();
  const { status, station: current } = useStore(playback);
  const { favorites } = useStore(library);

  const isCurrent = current?.id === station.id;
  const isConnecting =
    isCurrent && (status === 'connecting' || status === 'retrying' || status === 'failover');
  const showConnecting = useDelayedFlag(isConnecting, 400);
  const isPlaying = isCurrent && status === 'playing';
  const isFavorite = favorites.includes(station.id);
  const unhealthy = station.health.status !== 'healthy';

  const name = lang === 'el' && station.name_el ? station.name_el : station.name;
  const freq = station.frequency ? ` ${station.frequency.value}` : '';
  const label = `${name}${freq}`;

  const meta = isCurrent && status === 'unavailable'
    ? t('player.unavailableShort')
    : showConnecting
      ? t('player.connecting')
      : [station.city, station.genres[0] ? t(`genre.${station.genres[0]}` as never) : null]
          .filter(Boolean)
          .join(' · ');

  return (
    <li className={`row${isCurrent ? ' is-current' : ''}${unhealthy ? ' is-unhealthy' : ''}`}>
      <button
        type="button"
        className="row__play"
        onClick={() => playStation(station, queue)}
        aria-current={isPlaying ? 'true' : undefined}
        aria-label={`${t('player.play')} ${label}`}
      >
        <Artwork station={station} lang={lang} />
        <span className="row__text">
          <span className="row__name tnum" lang={station.name_el === name ? 'el' : undefined}>
            {label}
          </span>
          <span className="row__meta">{meta}</span>
          {hint ? (
            <span className="row__hint">
              {t('search.matched')} <em>{hint}</em>
            </span>
          ) : null}
        </span>

        {isPlaying ? (
          <>
            <span className="eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="eq-text">{t('player.playing')}</span>
          </>
        ) : null}

        {showConnecting ? (
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : null}
      </button>

      {trailing}

      {showFavorite ? (
        <button
          type="button"
          className={`icon-btn${isFavorite ? ' is-on' : ''}`}
          aria-pressed={isFavorite}
          aria-label={`${isFavorite ? t('player.unfavorite') : t('player.favorite')}: ${label}`}
          onClick={() => void toggleFavorite(station.id)}
        >
          <Heart filled={isFavorite} />
        </button>
      ) : null}
    </li>
  );
}
