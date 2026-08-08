import { useCallback } from 'react';
import { playback, setSleepTimer } from '../audio/engine';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { closeOverlay } from '../app/router';
import { useEscape } from './hooks';

const OPTIONS = [15, 30, 45, 60] as const;

/**
 * Sleep timer — PRD §26. Four options and Off, nothing else.
 * "End of current program" needs a schedule feed the catalog does not have, so
 * it stays out of V1 rather than shipping as a guess.
 */
export function TimerSheet() {
  const { t } = usePrefs();
  const { sleepMsLeft } = useStore(playback);
  const close = useCallback(() => closeOverlay(), []);
  useEscape(close);

  const activeMinutes = sleepMsLeft !== null ? Math.ceil(sleepMsLeft / 60_000) : null;

  const choose = (minutes: number | null) => {
    setSleepTimer(minutes);
    close();
  };

  return (
    <>
      <div className="scrim" onClick={close} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t('timer.title')}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>{t('timer.title')}</h2>
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={sleepMsLeft === null}
            onClick={() => choose(null)}
          >
            {t('timer.off')}
          </button>
          {OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip tnum"
              aria-pressed={activeMinutes !== null && Math.abs(activeMinutes - m) < 1}
              onClick={() => choose(m)}
            >
              {m} {t('timer.min')}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
