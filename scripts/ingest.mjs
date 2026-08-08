#!/usr/bin/env node
/**
 * Catalog ingestion — PRD §17.
 *
 * Radio Browser is a BUILD-TIME discovery source only. It is never called from
 * the app at runtime, so a Radio Browser outage cannot affect a single listener
 * (guardrail 8). Everything the product owns — canonical ids, Greek names,
 * aliases, curated genres, stream priority — lives in data/curation.json and
 * wins over anything the third party says.
 *
 *   node scripts/ingest.mjs            → data/catalog.raw.json
 *   node scripts/health.mjs            → public/catalog.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];
const UA = 'OpenRadio/0.1 (+https://github.com/openradio)';
const MAX_STATIONS = 140;

/* ------------------------------------------------------------------ fetching */

async function fetchStations() {
  for (const base of MIRRORS) {
    const url =
      `${base}/json/stations/search?countrycode=GR&hidebroken=true` +
      `&order=clickcount&reverse=true&limit=600`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json) && json.length) {
        console.log(`  source: ${base} → ${json.length} raw records`);
        return json;
      }
    } catch (err) {
      console.warn(`  mirror ${base} failed: ${err.message}`);
    }
  }
  throw new Error('all Radio Browser mirrors unreachable');
}

/* ------------------------------------------------------------- normalisation */

const GREEK_MAP = {
  ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω', ΐ: 'ι', ΰ: 'υ', ϊ: 'ι', ϋ: 'υ', ς: 'σ',
};

/** Fold a string to a comparison key: lowercase, unaccented, alphanumeric only. */
function foldKey(s) {
  return [...(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')]
    .map((ch) => GREEK_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9α-ω]/g, '');
}

const FREQ_DOTTED = /\b(\d{2,3})[.,](\d)\s*(?:fm|mhz)?\b/i;
/** Contributors also type "Easy FM 972" and "Zeppelin 1067" — same dial position. */
const FREQ_RUNTOGETHER = /\b(\d{3,4})\b(?!\s*k)/;

/** "Sfera 102.2 FM" → 102.2 ; also catches "102,2", "102.2fm" and "972". */
function extractFrequency(name) {
  const dotted = String(name).match(FREQ_DOTTED);
  if (dotted) {
    const value = Number(`${dotted[1]}.${dotted[2]}`);
    if (value >= 87 && value <= 108) return value;
  }
  const run = String(name).match(FREQ_RUNTOGETHER);
  if (run) {
    const value = Number(run[1]) / 10;
    if (value >= 87 && value <= 108) return value;
  }
  return null;
}

/**
 * The frequency is a separate field, so it must not also live inside the
 * display name — otherwise the UI renders "Zeppelin 106.7 106.7".
 */
function stripFrequency(name) {
  return name
    .replace(FREQ_DOTTED, ' ')
    .replace(FREQ_RUNTOGETHER, ' ')
    .replace(/\bfm\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[-–—.,]+|[-–—.,]+$/g, '')
    .trim();
}

/** Strip decoration Radio Browser contributors add: bitrates, "LIVE", stray pipes. */
function cleanName(raw) {
  return String(raw)
    .replace(/[–—]/g, '-')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\((?:\d+\s*k(?:bps)?|aac|mp3|hq|hd|live)\)/gi, '')
    .replace(/\b\d{2,3}\s*k(?:bps)?\b/gi, '')
    .replace(/\b(?:live|stream|online|web ?radio|radio ?station)\b/gi, ' ')
    // Contributors append the station's domain: "Rythmos FM.GR", "Vanilla
    // Radio.com". Left in, it also stops curation from matching the station.
    .replace(/[.,]\s?(gr|com|net|eu|org|info)\b/gi, ' ')
    .replace(/[|/•·]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[-–—.,]+|[-–—.,]+$/g, '')
    .trim();
}

const hasGreek = (s) => /[Ͱ-Ͽἀ-῿]/.test(s || '');

/* --------------------------------------------------------------- taxonomy map */

/**
 * Curated taxonomy (PRD §7). Raw source tags are NEVER shown to a user — they
 * only vote for one of these nine buckets. Order matters: the first rule that
 * matches wins, so specific Greek genres beat the generic "pop" catch-all.
 */
const GENRE_RULES = [
  ['sport', /\b(sport|sports|αθλητ|football|ποδοσφαιρ)\b/i],
  ['news-talk', /\b(news|talk|ενημερωσ|ειδησ|politic|πολιτικ|information|speech)\b/i],
  ['laiko', /\b(laiko|laika|λαικ|λαϊκ|skyladiko|rebetiko|ρεμπετ|folk)\b/i],
  ['entekhno', /\b(entexno|entekhno|εντεχν|έντεχν|artistic)\b/i],
  ['retro', /\b(80s|90s|70s|oldies|retro|nostalgi|classics?)\b/i],
  ['greek-pop', /\b(greek|ελληνικ|ελλην|hellenic)\b/i],
  ['international', /\b(international|foreign|english|dance|house|rock|jazz|r&b|hip ?hop|lounge|chill|club)\b/i],
];

function pickGenres(tags, name) {
  const hay = `${tags} ${name}`.toLowerCase();
  const out = [];
  for (const [genre, re] of GENRE_RULES) if (re.test(hay)) out.push(genre);
  if (!out.length) out.push(hasGreek(name) ? 'greek-pop' : 'international');
  return out.slice(0, 2);
}

const CITY_ALIASES = {
  αθηνα: 'Athens', athens: 'Athens', athina: 'Athens', attica: 'Athens', αττικη: 'Athens',
  θεσσαλονικη: 'Thessaloniki', thessaloniki: 'Thessaloniki', salonica: 'Thessaloniki', saloniki: 'Thessaloniki',
  πατρα: 'Patras', patras: 'Patras', πατρας: 'Patras',
  ηρακλειο: 'Heraklion', heraklion: 'Heraklion', iraklio: 'Heraklion', crete: 'Heraklion', κρητη: 'Heraklion',
  λαρισα: 'Larissa', larissa: 'Larissa', larisa: 'Larissa',
  βολος: 'Volos', volos: 'Volos',
  ροδος: 'Rhodes', rhodes: 'Rhodes', rodos: 'Rhodes',
  ιωαννινα: 'Ioannina', ioannina: 'Ioannina',
  χανια: 'Chania', chania: 'Chania',
  καβαλα: 'Kavala', kavala: 'Kavala',
  κερκυρα: 'Corfu', corfu: 'Corfu',
};

function pickCity(rb) {
  const candidates = [rb.state, ...String(rb.tags || '').split(',')];
  for (const c of candidates) {
    const hit = CITY_ALIASES[foldKey(c)];
    if (hit) return hit;
  }
  return null;
}

function codecOf(rb) {
  const c = String(rb.codec || '').toLowerCase();
  if (c.includes('aac')) return 'aac';
  if (c.includes('mp3')) return 'mp3';
  if (c.includes('ogg') || c.includes('vorbis')) return 'ogg';
  return c || 'unknown';
}

/** Stable slug used as the canonical station id. */
function slugify(name, freq) {
  const base = foldKey(name).replace(/[α-ω]/g, '') || foldKey(name);
  const stem = String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const id = stem || base || 'station';
  return freq ? `${id}-${String(freq).replace('.', '-')}` : id;
}

/* -------------------------------------------------------------------- merging */

async function loadCuration() {
  const p = resolve(ROOT, 'data/curation.json');
  if (!existsSync(p)) return { stations: {}, block: [], featured: [] };
  return JSON.parse(await readFile(p, 'utf8'));
}

async function main() {
  console.log('▸ ingesting Greek stations');
  const curation = await loadCuration();
  const blocked = new Set(curation.block.map(foldKey));
  const raw = await fetchStations();

  /** @type {Map<string, any>} */
  const byKey = new Map();

  for (const rb of raw) {
    const url = rb.url_resolved || rb.url;
    if (!url) continue;
    // HTTPS-compatible streams are prioritised (PRD §40). Plain http:// is
    // dropped outright: a mixed-content stream cannot play from an HTTPS PWA.
    if (!url.startsWith('https://')) continue;

    const cleaned = cleanName(rb.name);
    const freq = extractFrequency(rb.name);
    // Keep the frequency in the name only when stripping it would leave nothing
    // recognisable behind (a station genuinely called "102.2").
    const stripped = freq ? stripFrequency(cleaned) : cleaned;
    const name = stripped.length >= 2 ? stripped : cleaned;
    if (!name || name.length < 2) continue;
    if (blocked.has(foldKey(name))) continue;

    // Dedup key: same station name + frequency = same station, however many
    // times contributors uploaded it (PRD §40 "duplicate stations merged").
    const key = `${foldKey(name).replace(/\d/g, '')}|${freq ?? ''}`;

    const stream = {
      url,
      codec: codecOf(rb),
      bitrate: Number(rb.bitrate) || 0,
      priority: 1,
    };

    const existing = byKey.get(key);
    if (existing) {
      // Extra candidates become failover streams, best bitrate first (PRD §15).
      if (!existing.streams.some((s) => s.url === url) && existing.streams.length < 3) {
        existing.streams.push(stream);
        existing.streams.sort((a, b) => b.bitrate - a.bitrate);
        existing.streams.forEach((s, i) => (s.priority = i + 1));
      }
      existing._votes += Number(rb.votes) || 0;
      existing._clicks += Number(rb.clickcount) || 0;
      if (!existing.city) existing.city = pickCity(rb);
      continue;
    }

    byKey.set(key, {
      id: slugify(name, freq),
      name,
      name_el: hasGreek(name) ? name : null,
      aliases: [],
      country: 'GR',
      city: pickCity(rb),
      genres: pickGenres(rb.tags, name),
      frequency: freq ? { value: freq, unit: 'MHz' } : null,
      logo: rb.favicon && rb.favicon.startsWith('https://') ? rb.favicon : null,
      homepage: rb.homepage || null,
      streams: [stream],
      _votes: Number(rb.votes) || 0,
      _clicks: Number(rb.clickcount) || 0,
    });
  }

  let stations = [...byKey.values()]
    .sort((a, b) => b._clicks + b._votes * 3 - (a._clicks + a._votes * 3))
    .slice(0, MAX_STATIONS);

  // Curation overrides everything the third party said.
  const seen = new Set();
  stations = stations.map((s) => {
    const override =
      curation.stations[s.id] ??
      curation.stations[foldKey(s.name)] ??
      Object.values(curation.stations).find((c) =>
        (c.match || []).some((m) => foldKey(m) === foldKey(s.name)),
      );
    const merged = { ...s, ...(override ?? {}) };
    delete merged.match;
    // Guarantee id uniqueness after overrides.
    let id = merged.id;
    for (let i = 2; seen.has(id); i++) id = `${merged.id}-${i}`;
    seen.add(id);
    merged.id = id;
    merged.popularity = Math.round(s._clicks + s._votes * 3);
    delete merged._votes;
    delete merged._clicks;
    return merged;
  });

  const featured = new Set(curation.featured.map(String));
  stations.forEach((s) => {
    s.featured = featured.has(s.id);
  });

  await mkdir(resolve(ROOT, 'data'), { recursive: true });
  await writeFile(
    resolve(ROOT, 'data/catalog.raw.json'),
    JSON.stringify({ generated: new Date().toISOString(), stations }, null, 2),
    'utf8',
  );

  const withGreek = stations.filter((s) => s.name_el).length;
  const withFreq = stations.filter((s) => s.frequency).length;
  const withFailover = stations.filter((s) => s.streams.length > 1).length;
  console.log(`✔ ${stations.length} stations → data/catalog.raw.json`);
  console.log(`  greek names ${withGreek} · frequencies ${withFreq} · failover ${withFailover}`);
  console.log('  next: node scripts/health.mjs');
}

main().catch((err) => {
  console.error('✖ ingest failed:', err.message);
  process.exit(1);
});
