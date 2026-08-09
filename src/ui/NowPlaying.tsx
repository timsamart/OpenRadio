import { useCallback, useEffect, useRef, useState } from 'react';
import { next, playback, previous, retry, toggle } from '../audio/engine';
import { alternativesFor } from '../data/catalog';
import { library, toggleFavorite } from '../data/library';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { closeOverlay, openOverlay, stationUrl } from '../app/router';
import { Artwork } from './Artwork';
import { ChevronDown, Heart, NextStation, Pause, Play, PrevStation, Share, Timer } from './Icons';
import { StationRow } from './StationRow';
import { TuningDial } from './TuningDial';
import { useDelayedFlag, useEscape } from './hooks';

/**
 * Now Playing — a player state, not a navigation destination (PRD §5).
 *
 * It is an overlay over whatever screen the user was on, opened by pushing a
 * history entry, so Back, Esc and the ↓ button are the same gesture and the
 * screen underneath keeps its scroll position. `/radio/:id` is an entry point
 * into this sheet, never a route the tab bar knows about (§27).
 */
export function NowPlaying() {
  const { lang, t } = usePrefs();
  const state = useStore(playback);
  const { favorites } = useStore(library);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [shared, setShared] = useState(false);

  const close = useCallback(() => closeOverlay(), []);
  useEscape(close);

  const connecting =
    state.status === 'connecting' || state.status === 'retrying' || state.status === 'failover';
  const showConnecting = useDelayedFlag(connecting, 400);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Keep Tab inside the sheet while it is open; return focus on close is
  // handled by the browser restoring the mini-player button.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, []);

  const s = state.station;
  if (!s) return null;

  const name = lang === 'el' && s.name_el ? s.name_el : s.name;
  const label = `${name}${s.frequency ? ` ${s.frequency.value}` : ''}`;
  const isFavorite = favorites.includes(s.id);
  const playingNow = state.status === 'playing';
  const queueSize = state.queue?.ids.length ?? 0;
  const canStep = queueSize > 1;
  const url = `${window.location.origin}${stationUrl(s.id)}`;

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: label, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* the user dismissed the share sheet — not an error */
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={label} ref={containerRef}>
      <div className="np">
        <div className="np__top">
          <button ref={closeRef} type="button" className="icon-btn" onClick={close} aria-label={t('player.close')}>
            <ChevronDown />
          </button>
          <span className="spacer" style={{ marginLeft: 'auto' }} />
          <button type="button" className="icon-btn" onClick={() => void share()} aria-label={`${t('player.share')}: ${label}`}>
            <Share />
          </button>
        </div>

        <Artwork station={s} lang={lang} className="art np__art" eager />

        <h2 className="np__name tnum" lang={s.name_el === name ? 'el' : undefined}>
          {label}
        </h2>
        <p className="np__sub">
          {[s.city, s.genres[0] ? t(`genre.${s.genres[0]}` as never) : null].filter(Boolean).join(' · ')}
        </p>

        {state.status === 'unavailable' ? (
          <Unavailable />
        ) : (
          <>
            <p className="live">
              <span className="dot" aria-hidden="true" />
              {showConnecting ? t('player.connecting') : t('player.live')}
            </p>
            <TuningDial active={showConnecting} />

            <div className="np__meta" aria-live="polite">
              {state.meta?.title ? (
                <>
                  <div className="t">{state.meta.artist ?? state.meta.title}</div>
                  {state.meta.artist ? <div className="a">{state.meta.title}</div> : null}
                </>
              ) : null}
            </div>

            <div className="transport">
              <button
                type="button"
                className="tbtn"
                onClick={previous}
                disabled={!canStep}
                aria-label={t('player.prev')}
              >
                <PrevStation />
              </button>
              <button
                type="button"
                className="tbtn tbtn--main"
                onClick={toggle}
                aria-label={`${playingNow || connecting ? t('player.pause') : t('player.play')}: ${label}`}
              >
                {playingNow || connecting ? <Pause size={26} /> : <Play size={26} />}
              </button>
              <button
                type="button"
                className="tbtn"
                onClick={next}
                disabled={!canStep}
                aria-label={t('player.next')}
              >
                <NextStation />
              </button>
            </div>

            <div className="np__actions">
              <button
                type="button"
                className={`np__action${isFavorite ? ' is-on' : ''}`}
                aria-pressed={isFavorite}
                aria-label={`${isFavorite ? t('player.unfavorite') : t('player.favorite')}: ${label}`}
                onClick={() => void toggleFavorite(s.id)}
              >
                <Heart size={22} filled={isFavorite} />
                {t('myRadio.favorites')}
              </button>
              <button
                type="button"
                className={`np__action${state.sleepMsLeft !== null ? ' is-on' : ''}`}
                onClick={() => openOverlay('timer')}
                aria-label={t('player.timer')}
              >
                <Timer />
                {state.sleepMsLeft !== null
                  ? `${Math.max(1, Math.ceil(state.sleepMsLeft / 60_000))} ${t('timer.min')}`
                  : t('player.timer')}
              </button>
            </div>

            {state.queue ? (
              <p className="np__queue">
                {t('player.from')}: {state.queue.label}
                {queueSize > 1 ? ` · ${queueSize}` : ''}
              </p>
            ) : null}

            {shared ? (
              <p className="np__queue" role="status">
                {url}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Reached only after retry AND failover have both silently exhausted
 * (guardrail 9). The recovery path is still one tap: the alternatives are real
 * station rows, not a link to a list.
 */
function Unavailable() {
  const { t } = usePrefs();
  const state = useStore(playback);
  const station = state.station;
  const alternatives = station ? alternativesFor(station) : [];

  return (
    <div className="error-box">
      <p role="alert">{t('player.unavailable')}</p>
      <button type="button" className="btn" onClick={retry}>
        {t('player.tryAgain')}
      </button>

      {alternatives.length ? (
        <>
          <p className="section-label" style={{ justifyContent: 'center' }}>
            {t('player.tryInstead')}
          </p>
          <ul>
            {alternatives.map((alt) => (
              <StationRow
                key={alt.id}
                station={alt}
                queue={{ label: t('player.tryInstead'), ids: alternatives.map((a) => a.id) }}
                showFavorite={false}
              />
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
