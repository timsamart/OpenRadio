import { useEffect } from 'react';
import { catalog, loadCatalog, station } from '../data/catalog';
import { loadLibrary } from '../data/library';
import { playback, setQueue } from '../audio/engine';
import { useStore } from '../state/store';
import { applyDocument, usePrefs } from '../state/prefs';
import { applySky } from '../state/sky';
import { consumeDeepLink, href, openOverlay, router, viewFor } from './router';
import { Home } from '../screens/Home';
import { Discover, StationList } from '../screens/Discover';
import { MyRadio } from '../screens/MyRadio';
import { SearchOverlay } from '../screens/SearchOverlay';
import { NowPlaying } from '../ui/NowPlaying';
import { TimerSheet } from '../ui/TimerSheet';
import { MiniPlayer } from '../ui/MiniPlayer';
import { TabBar } from '../ui/TabBar';
import { WifiOff } from '../ui/Icons';
import { useOnline } from '../ui/hooks';

/**
 * The shell.
 *
 * Note the structure: the route outlet renders screens, and the mini-player is
 * its SIBLING, not its child. That is what makes "audio survives navigation" a
 * property of the tree rather than a promise in a comment.
 */
export function App() {
  const { t } = usePrefs();
  const { path, overlay } = useStore(router);
  const { ready, stale, error } = useStore(catalog);
  const { engaged } = useStore(playback);
  const online = useOnline();
  const view = viewFor(path);

  useEffect(() => {
    applyDocument();
    void loadLibrary();
    void loadCatalog();
    // The sky drifts with real Athens time while the app stays open — a tab
    // left open at breakfast should still be at golden hour by evening.
    const skyTicker = window.setInterval(applySky, 120_000);
    return () => window.clearInterval(skyTicker);
  }, []);

  // A /radio/:id deep link opens the sheet on the station — and stops there.
  // One Play tap is still required: browsers restrict autoplay, and pretending
  // otherwise would make the returning-user promise unreliable (§21, §27).
  useEffect(() => {
    if (!ready) return;
    const id = consumeDeepLink();
    if (!id) return;
    const target = station(id);
    if (target) {
      playback.set({ station: target, engaged: true, status: 'paused' });
      setQueue({ label: t('player.queue.popular'), ids: [target.id] });
    } else {
      window.history.replaceState({ path: '/', overlay: null }, '', href('/'));
      router.set({ path: '/', overlay: null });
    }
  }, [ready, t]);

  return (
    <div className="app">
      {!online ? (
        <p className="banner" role="status">
          <WifiOff />
          {t('offline.short')} {t('offline.body')}
        </p>
      ) : stale ? (
        <p className="banner" role="status">
          <WifiOff />
          {t('catalog.stale')}
        </p>
      ) : null}

      {error && !ready ? <p className="empty">{t('catalog.error')}</p> : null}

      {view.name === 'home' ? <Home /> : null}
      {view.name === 'discover' ? <Discover /> : null}
      {view.name === 'genre' ? <StationList kind="genre" id={view.id} /> : null}
      {view.name === 'city' ? <StationList kind="city" id={view.id} /> : null}
      {view.name === 'my-radio' ? <MyRadio /> : null}

      {/* Outside the route outlet, on purpose. */}
      <div className="dock">
        {engaged ? <MiniPlayer /> : null}
        <TabBar />
      </div>

      {overlay === 'search' ? <SearchOverlay /> : null}
      {overlay === 'now-playing' && engaged ? <NowPlaying /> : null}
      {overlay === 'timer' ? <TimerSheet /> : null}
    </div>
  );
}

/** Exported for the deep-link path so the sheet can be opened programmatically. */
export { openOverlay };
