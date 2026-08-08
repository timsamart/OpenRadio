import type { PlaybackState, Queue, Station } from '../types';
import { createStore } from '../state/store';
import { recordListen } from '../data/library';
import { track } from './events';
import { applyMediaSession, bindMediaSessionActions } from './mediaSession';

/**
 * The global audio engine — PRD §13.
 *
 * There is exactly ONE HTMLAudioElement in the application and it is created
 * here, at module scope, outside React. No component may construct another.
 * Routing, mounting and unmounting are invisible to this file; that is what
 * makes "playback survives the UI" (P5) structurally true rather than
 * something we remember to be careful about.
 */

const CONNECT_TIMEOUT_MS = 12_000;
const REBUFFER_GRACE_MS = 6_000;
const RETRY_DELAY_MS = 600;
const RETRIES_PER_STREAM = 1;
const FADE_MS = 5_000;

export const playback = createStore<PlaybackState>({
  status: 'idle',
  station: null,
  meta: null,
  queue: null,
  sleepMsLeft: null,
  engaged: false,
});

let el: HTMLAudioElement | null = null;
let streamIndex = 0;
let retries = 0;
let connectWatchdog: number | null = null;
let rebufferWatchdog: number | null = null;
let retryTimer: number | null = null;
let audibleSince: number | null = null;
let accruedMs = 0;
let sleepDeadline: number | null = null;
let sleepTicker: number | null = null;
let fadeRaf: number | null = null;
let intentionalPause = false;

/* --------------------------------------------------------------- lifecycle */

function element(): HTMLAudioElement {
  if (el) return el;
  const audio = document.createElement('audio');
  audio.preload = 'none';
  audio.autoplay = false;
  // Live radio has no timeline; make that explicit to the platform so OS UI
  // does not render a scrubber the user could drag into nothing.
  audio.setAttribute('x-webkit-airplay', 'allow');
  audio.style.display = 'none';
  document.body.appendChild(audio);

  audio.addEventListener('playing', onPlaying);
  audio.addEventListener('pause', onPause);
  audio.addEventListener('waiting', onWaiting);
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('error', onError);
  // Deliberately NOT listening for `stalled`. It fires after ~3s without data,
  // which a slow-but-fine Icecast start does routinely, and — worse — a stalled
  // event left over from an abandoned stream would drive the station the user
  // just switched TO into failover. The connect watchdog already covers real
  // failure with a timeout that means something.

  el = audio;
  bindMediaSessionActions({ toggle, next, previous });
  return audio;
}

/* ------------------------------------------------------------------ helpers */

function clearTimer(id: number | null): null {
  if (id !== null) window.clearTimeout(id);
  return null;
}

function clearAllTimers(): void {
  connectWatchdog = clearTimer(connectWatchdog);
  rebufferWatchdog = clearTimer(rebufferWatchdog);
  retryTimer = clearTimer(retryTimer);
}

function currentStreams(): Station['streams'] {
  return playback.get().station?.streams ?? [];
}

/** Flush accrued audible time into history and the personalization stats. */
function flushListen(): void {
  const { station } = playback.get();
  if (audibleSince !== null) {
    accruedMs += Date.now() - audibleSince;
    audibleSince = null;
  }
  if (station && accruedMs > 0) {
    const seconds = Math.round(accruedMs / 1000);
    void recordListen(station.id, seconds);
    if (seconds >= 30) track('station_session_success', { id: station.id, seconds });
  }
  accruedMs = 0;
}

/* ------------------------------------------------------------- media events */

function onPlaying(): void {
  clearAllTimers();
  retries = 0;
  intentionalPause = false;
  if (audibleSince === null) audibleSince = Date.now();
  const { station, status } = playback.get();
  if (status !== 'playing') track('station_play_success', { id: station?.id });
  playback.set({ status: 'playing' });
  applyMediaSession(playback.get());
}

function onPause(): void {
  if (audibleSince !== null) {
    accruedMs += Date.now() - audibleSince;
    audibleSince = null;
  }
  // A pause we did not ask for during playback is a network event, not a user
  // event — the recovery path handles it. Only report PAUSED when we meant it.
  if (intentionalPause) {
    playback.set({ status: 'paused' });
    applyMediaSession(playback.get());
  }
}

function onWaiting(): void {
  // Do not flap the UI on every rebuffer. Only if the gap outlives the grace
  // period does the listener get told anything at all (PRD §14).
  if (playback.get().status !== 'playing') return;
  rebufferWatchdog = clearTimer(rebufferWatchdog);
  rebufferWatchdog = window.setTimeout(() => {
    if (playback.get().status === 'playing') playback.set({ status: 'connecting' });
  }, REBUFFER_GRACE_MS);
}

function onEnded(): void {
  // A live stream that "ends" was cut by the server. Reconnect silently —
  // the listener should never have to press play because a CDN hiccuped.
  if (!intentionalPause && playback.get().status === 'playing') failStep('ended');
}

function onError(): void {
  // Tearing down a source fires `error` with no MediaError attached. Only a
  // real decode/network failure carries one.
  if (!el?.error) return;
  failStep(`media-${el.error.code}`);
}

/* ------------------------------------------------------- connect / recovery */

function attach(): void {
  const audio = element();
  const streams = currentStreams();
  const stream = streams[streamIndex];
  if (!stream) {
    giveUp();
    return;
  }
  clearAllTimers();
  // Abort any previous load synchronously before starting the next one, so a
  // late event from the stream we just abandoned cannot be mistaken for a
  // failure of the stream we are about to open.
  if (audio.getAttribute('src')) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  audio.src = stream.url;
  audio.load();
  void audio.play().catch((err: unknown) => {
    if (err instanceof DOMException) {
      // AbortError means a newer load superseded this play() — which is what
      // switching stations quickly looks like from the element's point of view.
      // Treating it as a stream failure would send the station the user just
      // chose into failover and then into "unavailable".
      if (err.name === 'AbortError') return;
      // NotAllowedError only happens without a user gesture. Every play path in
      // this app originates from a tap, so treat it as paused, not broken.
      if (err.name === 'NotAllowedError') {
        intentionalPause = true;
        playback.set({ status: 'paused' });
        return;
      }
    }
    failStep('play-rejected');
  });
  connectWatchdog = window.setTimeout(() => failStep('timeout'), CONNECT_TIMEOUT_MS);
}

/**
 * Retry, then failover, then and only then admit defeat (guardrail 9).
 * None of these intermediate states are named to the user.
 */
function failStep(reason: string): void {
  clearAllTimers();
  const streams = currentStreams();
  if (!playback.get().station) return;

  if (retries < RETRIES_PER_STREAM) {
    retries += 1;
    playback.set({ status: 'retrying' });
    retryTimer = window.setTimeout(attach, RETRY_DELAY_MS);
    return;
  }
  if (streamIndex + 1 < streams.length) {
    streamIndex += 1;
    retries = 0;
    playback.set({ status: 'failover' });
    track('stream_failover', { id: playback.get().station?.id, reason, to: streamIndex });
    retryTimer = window.setTimeout(attach, RETRY_DELAY_MS);
    return;
  }
  giveUp(reason);
}

function giveUp(reason = 'exhausted'): void {
  clearAllTimers();
  flushListen();
  el?.removeAttribute('src');
  playback.set({ status: 'unavailable' });
  track('station_play_failure', { id: playback.get().station?.id, reason });
}

/* -------------------------------------------------------------- public API */

export function playStation(station: Station, queue: Queue | null = null): void {
  const state = playback.get();

  // Same station, currently paused → resume. Do not tear down and rebuild a
  // working connection just because the user tapped the row again.
  if (state.station?.id === station.id && (state.status === 'paused' || state.status === 'unavailable')) {
    if (state.status === 'paused') {
      resume();
      if (queue) playback.set({ queue });
      return;
    }
  }

  if (state.station?.id !== station.id) flushListen();

  clearAllTimers();
  cancelFade();
  streamIndex = 0;
  retries = 0;
  intentionalPause = false;
  playback.set({
    station,
    status: 'connecting',
    meta: null,
    queue: queue ?? state.queue,
    engaged: true,
  });
  track('station_play_requested', { id: station.id });
  applyMediaSession(playback.get());
  attach();
}

export function resume(): void {
  const { station } = playback.get();
  if (!station) return;
  intentionalPause = false;
  const audio = element();
  playback.set({ status: 'connecting' });
  // A stream held open while paused is stale by definition — reattach so the
  // listener gets live audio, not the buffered fragment from five minutes ago.
  if (!audio.src) attach();
  else {
    void audio.play().catch(() => failStep('resume-rejected'));
    connectWatchdog = window.setTimeout(() => failStep('timeout'), CONNECT_TIMEOUT_MS);
  }
}

export function pause(): void {
  intentionalPause = true;
  clearAllTimers();
  cancelFade();
  const audio = element();
  audio.pause();
  // Drop the connection: a paused live stream keeps consuming bandwidth on
  // some servers and reconnects stale anyway.
  audio.removeAttribute('src');
  flushListen();
  playback.set({ status: 'paused' });
  applyMediaSession(playback.get());
}

export function toggle(): void {
  const { status, station } = playback.get();
  if (!station) return;
  if (status === 'playing' || status === 'connecting' || status === 'retrying' || status === 'failover') pause();
  else resume();
}

export function retry(): void {
  const { station, queue } = playback.get();
  if (station) playStation(station, queue);
}

export function setQueue(queue: Queue | null): void {
  playback.set({ queue });
}

function step(delta: number): void {
  const { queue, station } = playback.get();
  if (!queue || !station || queue.ids.length < 2) return;
  const at = queue.ids.indexOf(station.id);
  if (at === -1) return;
  const nextId = queue.ids[(at + delta + queue.ids.length) % queue.ids.length];
  const target = nextId ? resolveStation(nextId) : null;
  if (target) playStation(target, queue);
}

export const next = () => step(1);
export const previous = () => step(-1);

/** Injected by the catalog layer so the engine never imports the catalog. */
let resolveStation: (id: string) => Station | null = () => null;
export function setStationResolver(fn: (id: string) => Station | null): void {
  resolveStation = fn;
}

export function setMetadata(meta: PlaybackState['meta']): void {
  playback.set({ meta });
  applyMediaSession(playback.get());
}

/* ------------------------------------------------------------- sleep timer */

function cancelFade(): void {
  if (fadeRaf !== null) cancelAnimationFrame(fadeRaf);
  fadeRaf = null;
  if (el) el.volume = 1;
}

export function setSleepTimer(minutes: number | null): void {
  if (sleepTicker !== null) window.clearInterval(sleepTicker);
  sleepTicker = null;
  cancelFade();

  if (minutes === null) {
    sleepDeadline = null;
    playback.set({ sleepMsLeft: null });
    return;
  }

  sleepDeadline = Date.now() + minutes * 60_000;
  playback.set({ sleepMsLeft: minutes * 60_000 });

  sleepTicker = window.setInterval(() => {
    if (sleepDeadline === null) return;
    const left = sleepDeadline - Date.now();
    playback.set({ sleepMsLeft: Math.max(0, left) });
    if (left <= FADE_MS && fadeRaf === null) startFade(left);
    if (left <= 0) {
      window.clearInterval(sleepTicker!);
      sleepTicker = null;
      sleepDeadline = null;
      pause();
      cancelFade();
      playback.set({ sleepMsLeft: null });
    }
  }, 500);
}

/** Fade the volume rather than cutting it — waking someone with silence is kinder. */
function startFade(remaining: number): void {
  const audio = element();
  const from = audio.volume;
  const started = performance.now();
  const span = Math.max(200, remaining);
  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / span);
    audio.volume = Math.max(0, from * (1 - t));
    if (t < 1) fadeRaf = requestAnimationFrame(tick);
    else fadeRaf = null;
  };
  fadeRaf = requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ cleanup */

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushListen);
  // Network transitions (Wi-Fi → cellular) surface as a stalled stream. Nudge
  // recovery instead of waiting for a watchdog the user can hear.
  window.addEventListener('online', () => {
    const { status } = playback.get();
    if (status === 'unavailable' || status === 'connecting') retry();
  });
}
