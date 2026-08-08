import { navigate, router, viewFor } from '../app/router';
import { useStore } from '../state/store';
import { usePrefs } from '../state/prefs';
import { Compass, Home, Star } from './Icons';

const TABS = [
  { path: '/', key: 'nav.home', Icon: Home, matches: ['home'] },
  { path: '/discover', key: 'nav.discover', Icon: Compass, matches: ['discover', 'genre', 'city'] },
  { path: '/my-radio', key: 'nav.myRadio', Icon: Star, matches: ['my-radio'] },
] as const;

export function TabBar() {
  const { t } = usePrefs();
  const { path } = useStore(router);
  const view = viewFor(path);

  return (
    <nav className="tabbar" aria-label={t('app.name')}>
      {TABS.map(({ path: to, key, Icon, matches }) => {
        const active = (matches as readonly string[]).includes(view.name);
        return (
          <button
            key={to}
            type="button"
            className="tab"
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(to)}
          >
            <Icon />
            {t(key)}
          </button>
        );
      })}
    </nav>
  );
}
