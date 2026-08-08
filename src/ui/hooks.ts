import { useEffect, useState } from 'react';

/**
 * True only once `active` has been continuously true for `ms`.
 *
 * This is what keeps a fast connect from flashing "Connecting…" at someone
 * (PRD §14). A stream that opens in 300 ms should look instantaneous, not busy.
 */
export function useDelayedFlag(active: boolean, ms: number): boolean {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }
    const id = window.setTimeout(() => setFlag(true), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
  return flag;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Escape closes the topmost overlay. Playback must never depend on gestures. */
export function useEscape(handler: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}
