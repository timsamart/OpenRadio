import type { PlaybackState } from '../types';

/**
 * OS media integration — PRD §20.
 *
 * Everything here is capability-gated. Media Session support is uneven, and a
 * missing API must degrade to "no lock-screen controls", never to a crash on
 * the play path.
 */

interface Actions {
  toggle(): void;
  next(): void;
  previous(): void;
}

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

export function bindMediaSessionActions(actions: Actions): void {
  if (!supported()) return;
  const ms = navigator.mediaSession;
  const set = (action: MediaSessionAction, handler: (() => void) | null) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      /* action unsupported on this platform — expected, not exceptional */
    }
  };
  set('play', actions.toggle);
  set('pause', actions.toggle);
  set('stop', actions.toggle);
  // Previous/next are STATION controls (PRD §11). Seek handlers are explicitly
  // nulled so the OS does not render a scrubber for a live stream.
  set('previoustrack', actions.previous);
  set('nexttrack', actions.next);
  set('seekbackward', null);
  set('seekforward', null);
  set('seekto', null);
}

export function applyMediaSession(state: PlaybackState): void {
  if (!supported()) return;
  const ms = navigator.mediaSession;
  const { station, status, meta } = state;

  if (!station) {
    ms.metadata = null;
    ms.playbackState = 'none';
    return;
  }

  const name = station.name_el ?? station.name;
  const freq = station.frequency ? ` ${station.frequency.value}` : '';
  const where = [station.city, station.genres[0]].filter(Boolean).join(' · ');

  try {
    ms.metadata = new MediaMetadata({
      title: meta?.title ? `${meta.artist ? `${meta.artist} — ` : ''}${meta.title}` : `${name}${freq}`,
      artist: meta?.title ? `${name}${freq}` : where,
      album: 'OpenRadio',
      artwork: station.logo
        ? [{ src: station.logo, sizes: '512x512' }]
        : [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  } catch {
    /* MediaMetadata unavailable */
  }

  ms.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none';
}
