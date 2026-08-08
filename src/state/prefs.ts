import { createStore, useStore } from './store';
import { loadPrefs, savePrefs, type LangPref, type Prefs, type ThemePref } from '../data/db';
import { translator, localeOf, type MessageKey } from '../i18n';

export const prefs = createStore<Prefs>(loadPrefs());

function persist(): void {
  savePrefs(prefs.get());
  applyDocument();
}

/** The theme toggle must beat `prefers-color-scheme` in both directions. */
export function applyDocument(): void {
  const { theme, lang } = prefs.get();
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.lang = localeOf[lang];
}

export function setTheme(theme: ThemePref): void {
  prefs.set({ theme });
  persist();
}

export function setLang(lang: LangPref): void {
  prefs.set({ lang });
  persist();
}

export function dismissHint(id: string): void {
  const list = prefs.get().dismissedHints;
  if (list.includes(id)) return;
  prefs.set({ dismissedHints: [...list, id] });
  persist();
}

export function isDismissed(id: string): boolean {
  return prefs.get().dismissedHints.includes(id);
}

export function usePrefs(): Prefs & { t: (key: MessageKey) => string } {
  const state = useStore(prefs);
  return { ...state, t: translator(state.lang) };
}
