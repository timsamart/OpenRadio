import { useEffect, useState } from 'react';
import { dismissHint, isDismissed, usePrefs } from '../state/prefs';
import { library } from '../data/library';
import { track } from '../audio/events';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HINT_ID = 'install';

/** True once the app is already running as an installed PWA (any platform). */
function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS Safari never fires `beforeinstallprompt` — there is no one-tap install
 * there, only the manual Share ▸ Add to Home Screen path. Detected narrowly
 * (iOS + Safari, not Chrome-on-iOS/other in-app browsers, which share the
 * same limitation but would make the instructions wrong).
 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  return isIos && isSafari;
}

/**
 * Install offer — PRD §22.
 *
 * Inline, at the bottom of My Radio, and only after the listener has actually
 * used the product. Never a modal, never before first playback, never on the
 * play path. Installation must never block anything (guardrail 5).
 *
 * Two variants share that same earned, dismissible placement: the standard
 * one-tap prompt (`beforeinstallprompt`), and an instructional variant for
 * iOS Safari, which has no programmatic install — only a nudge toward the
 * manual Share ▸ Add to Home Screen path.
 */
export function InstallCard() {
  const { t } = usePrefs();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isDismissed(HINT_ID) || isStandalone());
  const ios = isIosSafari();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      track('pwa_installed');
      setHidden(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // "Experienced value" is defined, not assumed: something was actually played.
  const earned = library.get().history.length > 0;
  if (hidden || !earned || (!event && !ios)) return null;

  return (
    <div className="card">
      <h3>{t('install.title')}</h3>
      <p>{t(ios ? 'install.ios.body' : 'install.body')}</p>
      <div className="card__actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (ios) {
              // No programmatic install to trigger — this is an acknowledgement,
              // not an action, so it just dismisses the hint.
              dismissHint(HINT_ID);
              setHidden(true);
              return;
            }
            void event?.prompt();
            setHidden(true);
          }}
        >
          {t(ios ? 'install.ios.action' : 'install.action')}
        </button>
        {ios ? null : (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              dismissHint(HINT_ID);
              setHidden(true);
            }}
          >
            {t('install.dismiss')}
          </button>
        )}
      </div>
    </div>
  );
}
