import { useSyncExternalStore } from 'react';

export interface Store<T> {
  get(): T;
  set(patch: Partial<T> | ((prev: T) => Partial<T>)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      let changed = false;
      for (const key of Object.keys(next) as (keyof T)[]) {
        if (!Object.is(state[key], next[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Components subscribe to state. They never own it — that is the difference
 * between "the mini-player shows what is playing" and "the mini-player is
 * playing", and only the first survives a route change (PRD §13).
 */
export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
