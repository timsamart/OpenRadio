/**
 * The living sky — Greek summer, in real time.
 *
 * No weather API, no network call: six real anchor points across the actual
 * Athens clock, linearly interpolated and written to CSS custom properties.
 * A background that visibly agrees with the sky over Athens right now reads
 * as alive rather than decorated — and it is a detail a generic template
 * would not bother faking (see rory-sutherland-principles.md, #43/#48/#52).
 */

type RGB = readonly [number, number, number];
export type Greeting = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'sunset';

interface Anchor {
  hour: number;
  top: RGB;
  mid: RGB;
  sun: RGB;
  sunY: number; // vh, negative = above the viewport (high sun)
}

// Warm, high-luminance pastels only — text still sits on translucent glass
// surfaces above this, but the sky itself must never get dark or saturated
// enough to threaten body-text contrast in the light theme.
const LIGHT_ANCHORS: Anchor[] = [
  { hour: 0, top: [30, 44, 58], mid: [24, 38, 52], sun: [90, 150, 190], sunY: 55 },
  { hour: 5, top: [40, 52, 66], mid: [34, 48, 62], sun: [130, 165, 195], sunY: 35 },
  { hour: 6.5, top: [253, 214, 179], mid: [251, 224, 196], sun: [255, 202, 150], sunY: 6 },
  { hour: 9, top: [230, 244, 246], mid: [246, 240, 224], sun: [255, 240, 210], sunY: -8 },
  { hour: 12, top: [222, 241, 247], mid: [244, 237, 223], sun: [255, 255, 255], sunY: -14 },
  { hour: 16, top: [239, 233, 211], mid: [247, 221, 196], sun: [255, 206, 141], sunY: -6 },
  { hour: 19, top: [247, 217, 196], mid: [233, 184, 176], sun: [232, 138, 108], sunY: 16 },
  { hour: 21, top: [58, 50, 68], mid: [34, 40, 56], sun: [200, 140, 170], sunY: 42 },
  { hour: 24, top: [30, 44, 58], mid: [24, 38, 52], sun: [90, 150, 190], sunY: 55 },
];

// Dark mode is "night swim" always — the sky only drifts the moon-glow
// position and warmth, never the depth of the water.
const DARK_ANCHORS: Anchor[] = [
  { hour: 0, top: [7, 22, 32], mid: [14, 35, 51], sun: [79, 195, 232], sunY: 52 },
  { hour: 6, top: [10, 27, 38], mid: [17, 40, 56], sun: [140, 175, 195], sunY: 18 },
  { hour: 12, top: [10, 28, 40], mid: [19, 43, 59], sun: [150, 195, 205], sunY: -6 },
  { hour: 18, top: [9, 25, 37], mid: [17, 39, 55], sun: [205, 155, 165], sunY: 18 },
  { hour: 21, top: [7, 20, 30], mid: [13, 32, 47], sun: [150, 130, 190], sunY: 42 },
  { hour: 24, top: [7, 22, 32], mid: [14, 35, 51], sun: [79, 195, 232], sunY: 52 },
];

function athensHour(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '12');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h + m / 60;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgbTriple([r, g, b]: RGB): string {
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
}

function isDark(): boolean {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function sample(anchors: Anchor[], hour: number) {
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    if (hour >= a.hour && hour <= b.hour) {
      const t = (hour - a.hour) / (b.hour - a.hour);
      return { top: mixRGB(a.top, b.top, t), mid: mixRGB(a.mid, b.mid, t), sun: mixRGB(a.sun, b.sun, t), sunY: lerp(a.sunY, b.sunY, t) };
    }
  }
  const last = anchors[anchors.length - 1]!;
  return { top: last.top, mid: last.mid, sun: last.sun, sunY: last.sunY };
}

/** Pure — used for the greeting copy, independent of the CSS side effect below. */
export function greetingBucket(hour: number = athensHour()): Greeting {
  if (hour < 5.5) return 'night';
  if (hour < 7.5) return 'dawn';
  if (hour < 11.5) return 'morning';
  if (hour < 16.5) return 'midday';
  if (hour < 19.5) return 'afternoon';
  if (hour < 21.5) return 'sunset';
  return 'night';
}

/** Writes the current sky to CSS custom properties on the root element. */
export function applySky(): void {
  if (typeof document === 'undefined') return;
  const hour = athensHour();
  const s = sample(isDark() ? DARK_ANCHORS : LIGHT_ANCHORS, hour);
  const root = document.documentElement.style;
  root.setProperty('--sky-top', rgbTriple(s.top));
  root.setProperty('--sky-mid', rgbTriple(s.mid));
  root.setProperty('--sky-sun', rgbTriple(s.sun));
  root.setProperty('--sky-sun-y', `${s.sunY}vh`);
}
