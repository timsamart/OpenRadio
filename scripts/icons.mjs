#!/usr/bin/env node
/**
 * Icon generation, zero dependencies.
 *
 * Draws the mark into an RGBA buffer and encodes PNG with node's built-in zlib,
 * so the build does not pull in an image toolchain to produce four flat files.
 *
 * The mark: Aegean blue ground, whitewash arcs radiating from a dot — a radio
 * wave and a horizon at once.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const AEGEAN = [10, 110, 158];
const DEEP = [7, 42, 62];
const WHITEWASH = [251, 247, 239];

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
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** @param {number} size @param {number} inset 0 = full bleed, 0.1 = maskable safe zone */
function draw(size, inset) {
  const px = Buffer.alloc(size * size * 4);
  const r = size / 2;
  const originX = size * 0.32;
  const originY = size * 0.74;
  const scale = 1 - inset;

  // Three arcs plus the emitter dot, in units of the icon's half-width.
  const rings = [0.34, 0.52, 0.70].map((v) => v * r * scale);
  const ringW = Math.max(2, size * 0.055 * scale);
  const dotR = Math.max(3, size * 0.055 * scale);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Rounded-square ground with a soft vertical shift from Aegean to deep sea.
      const t = y / size;
      let color = [
        Math.round(AEGEAN[0] + (DEEP[0] - AEGEAN[0]) * t),
        Math.round(AEGEAN[1] + (DEEP[1] - AEGEAN[1]) * t),
        Math.round(AEGEAN[2] + (DEEP[2] - AEGEAN[2]) * t),
      ];

      const d = Math.hypot(x - originX, y - originY);
      const angle = Math.atan2(originY - y, x - originX);
      // Only the upper-right quadrant sweep: a wave leaving the transmitter.
      const inSweep = angle > -0.15 && angle < Math.PI / 2 + 0.15;

      if (d < dotR) color = WHITEWASH;
      else if (inSweep && rings.some((rr) => Math.abs(d - rr) < ringW / 2)) color = WHITEWASH;

      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = 255;
    }
  }
  return px;
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="OpenRadio">
  <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0A6E9E"/><stop offset="1" stop-color="#072A3E"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#sea)"/>
  <g fill="none" stroke="#FBF7EF" stroke-width="26" stroke-linecap="round">
    <path d="M164 379a88 88 0 0 1 88-88"/>
    <path d="M164 379a134 134 0 0 1 134-134"/>
    <path d="M164 379a180 180 0 0 1 180-180"/>
  </g>
  <circle cx="164" cy="379" r="27" fill="#FBF7EF"/>
</svg>
`;

async function main() {
  const out = resolve(ROOT, 'public');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'icon.svg'), SVG, 'utf8');

  const jobs = [
    ['icon-192.png', 192, 0],
    ['icon-512.png', 512, 0],
    ['icon-maskable-512.png', 512, 0.18], // safe zone for adaptive masks
    ['apple-touch-icon.png', 180, 0],
  ];
  for (const [name, size, inset] of jobs) {
    await writeFile(resolve(out, name), encodePng(size, draw(size, inset)));
    console.log(`  ${name} ${size}×${size}`);
  }
  console.log('✔ icons written to public/');
}

main().catch((err) => {
  console.error('✖ icon generation failed:', err.message);
  process.exit(1);
});
