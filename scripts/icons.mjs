#!/usr/bin/env node
/**
 * OpenRadio icon generation, zero dependencies.
 *
 * The Open Dial is one continuous mnemonic: a tuning dial, an open O, and a
 * needle that escapes the dial to become a broadcast antenna. The same source
 * produces the favicon, install icons, Apple touch icon, and maskable artwork.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const NAVY_TOP = [8, 29, 62];
const NAVY_BOTTOM = [4, 18, 42];
const CYAN_TOP = [39, 190, 234];
const CYAN_BOTTOM = [18, 169, 219];
const CORAL_TOP = [255, 118, 91];
const CORAL_BOTTOM = [255, 87, 67];

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerpColor(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

function distanceToSegment(x, y, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * abx + (y - ay) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(x - (ax + abx * t), y - (ay + aby * t));
}

/** Sample one normalized point. inset scales the mark, never the full-bleed ground. */
function sample(u, v, inset) {
  const background = lerpColor(NAVY_TOP, NAVY_BOTTOM, v);
  const scale = 1 - inset;
  const x = (u - 0.5) / scale + 0.5;
  const y = (v - 0.5) / scale + 0.5;

  const cx = 0.47;
  const cy = 0.54;
  const ringR = 0.32;
  const ringW = 0.075;
  const angle = Math.atan2(y - cy, x - cx);
  const inGap = angle > -1.23 && angle < -0.38;
  const onRing = !inGap && Math.abs(Math.hypot(x - cx, y - cy) - ringR) < ringW / 2;

  const tipX = 0.79;
  const tipY = 0.20;
  const onNeedle = distanceToSegment(x, y, cx, cy, tipX, tipY) < 0.023;
  const onPivot = Math.hypot(x - cx, y - cy) < 0.046;
  const onTip = Math.hypot(x - tipX, y - tipY) < 0.018;

  const signalDistance = Math.hypot(x - tipX, y - tipY);
  const signalAngle = Math.atan2(y - tipY, x - tipX);
  const onSignal = signalAngle > -1.72 && signalAngle < 0.55 && Math.abs(signalDistance - 0.061) < 0.010;

  if (onNeedle || onPivot || onTip || onSignal) return lerpColor(CORAL_TOP, CORAL_BOTTOM, v);
  if (onRing) return lerpColor(CYAN_TOP, CYAN_BOTTOM, v);
  return background;
}

/** @param {number} size @param {number} inset 0 = regular, 0.18 = maskable safe zone */
function draw(size, inset) {
  const px = Buffer.alloc(size * size * 4);
  const samples = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = [0, 0, 0];
      for (const [sx, sy] of samples) {
        const sampled = sample((x + sx) / size, (y + sy) / size, inset);
        for (let channel = 0; channel < 3; channel++) color[channel] += sampled[channel];
      }
      const i = (y * size + x) * 4;
      px[i] = Math.round(color[0] / samples.length);
      px[i + 1] = Math.round(color[1] / samples.length);
      px[i + 2] = Math.round(color[2] / samples.length);
      px[i + 3] = 255;
    }
  }
  return px;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="OpenRadio">
  <defs>
    <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#081D3E"/><stop offset="1" stop-color="#04122A"/></linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#27BEEA"/><stop offset="1" stop-color="#12A9DB"/></linearGradient>
    <linearGradient id="coral" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FF765B"/><stop offset="1" stop-color="#FF5743"/></linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#navy)"/>
  <path d="M298 115A164 164 0 1 0 392 204" fill="none" stroke="url(#cyan)" stroke-width="38" stroke-linecap="round"/>
  <path d="M241 276L404 102" fill="none" stroke="url(#coral)" stroke-width="24" stroke-linecap="round"/>
  <circle cx="241" cy="276" r="24" fill="url(#coral)"/>
  <path d="M391 71A32 32 0 0 1 435 117" fill="none" stroke="url(#coral)" stroke-width="10" stroke-linecap="round"/>
</svg>
`;

async function main() {
  const out = resolve(ROOT, 'public');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'icon.svg'), SVG, 'utf8');

  const jobs = [
    ['icon-192.png', 192, 0],
    ['icon-512.png', 512, 0],
    ['icon-maskable-512.png', 512, 0.18],
    ['apple-touch-icon.png', 180, 0],
  ];
  for (const [name, size, inset] of jobs) {
    await writeFile(resolve(out, name), encodePng(size, draw(size, inset)));
    console.log(`  ${name} ${size}×${size}`);
  }
  console.log('✔ Open Dial icons written to public/');
}

main().catch((err) => {
  console.error('✖ icon generation failed:', err.message);
  process.exit(1);
});
