import { useEffect, useState } from 'react';
import { dismissHint, isDismissed, usePrefs } from '../state/prefs';
import { library } from '../data/library';
import { track } from '../audio/events';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HINT_ID = 'install';

/**
 * Install offer — PRD §22.
 *
 * Inline, at the bottom of My Radio, and only after the listener has actually
 * used the product. Never a modal, never before first playback, never on the
 * play path. Installation must never block anything (guardrail 5).
 */
export function InstallCard() {
  const { t } = usePrefs();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(() => isDismissed(HINT_ID));

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
  if (hidden || !event || !earned) return null;

  return (
    <div className="card">
      <h3>{t('install.title')}</h3>
      <p>{t('install.body')}</p>
      <div className="card__actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void event.prompt();
            setHidden(true);
          }}
        >
          {t('install.action')}
        </button>
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
      </div>
    </div>
  );
}
