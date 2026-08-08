#!/usr/bin/env node
/**
 * Stream health validation — PRD §16.
 *
 * "The user should not be the monitoring system." This runs on a schedule (CI
 * cron), actually opens every candidate stream, and records whether audio bytes
 * came back. Stations that persistently fail sink out of prominent discovery
 * positions before a listener ever taps them.
 *
 * History is kept across runs in data/health.history.json so recent_success_rate
 * means something after the first execution.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONCURRENCY = 12;
const TIMEOUT_MS = 8000;
const HISTORY_DEPTH = 20;

const AUDIO_TYPE =
  /^(audio\/|application\/(ogg|octet-stream|vnd\.apple\.mpegurl|x-mpegurl)|video\/mp2t)/i;

/**
 * Open the stream and read a few kilobytes. A HEAD request is not enough: many
 * Icecast/Shoutcast servers answer HEAD with 405 while streaming fine, and some
 * answer 200 to anything while never sending a byte. Only real bytes count.
 */
async function probe(url) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'OpenRadio/0.1 healthcheck', Icy_MetaData: '0', Range: 'bytes=0-16383' },
    });
    if (!res.ok && res.status !== 206) {
      return { ok: false, reason: `http-${res.status}`, latency_ms: Date.now() - started };
    }
    const type = res.headers.get('content-type') || '';
    if (type && !AUDIO_TYPE.test(type)) {
      // An HTML body here almost always means a captive portal or an error page
      // served with 200 — the classic "plays silence forever" failure.
      return { ok: false, reason: `content-type:${type.split(';')[0]}`, latency_ms: Date.now() - started };
    }
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, reason: 'no-body', latency_ms: Date.now() - started };
    let bytes = 0;
    while (bytes < 4096) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value?.byteLength ?? 0;
    }
    await reader.cancel().catch(() => {});
    if (bytes < 1024) return { ok: false, reason: 'no-media', latency_ms: Date.now() - started };
    return { ok: true, reason: null, latency_ms: Date.now() - started, content_type: type.split(';')[0] };
  } catch (err) {
    const reason = err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : 'network';
    return { ok: false, reason, latency_ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** Bounded-concurrency map. Keeps ~140 stations from opening 140 sockets at once. */
async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

async function main() {
  const rawPath = resolve(ROOT, 'data/catalog.raw.json');
  if (!existsSync(rawPath)) {
    console.error('✖ data/catalog.raw.json missing — run: node scripts/ingest.mjs');
    process.exit(1);
  }
  const { stations } = JSON.parse(await readFile(rawPath, 'utf8'));

  const historyPath = resolve(ROOT, 'data/health.history.json');
  const history = existsSync(historyPath) ? JSON.parse(await readFile(historyPath, 'utf8')) : {};

  // Flatten to one probe per candidate stream — failover URLs are checked too,
  // otherwise a station looks healthy on a secondary that has been dead for weeks.
  const jobs = [];
  for (const s of stations) for (const st of s.streams) jobs.push({ station: s, stream: st });

  console.log(`▸ probing ${jobs.length} streams across ${stations.length} stations`);
  let done = 0;
  const results = await pool(jobs, CONCURRENCY, async (job) => {
    const r = await probe(job.stream.url);
    done++;
    if (done % 25 === 0) process.stdout.write(`  ${done}/${jobs.length}\n`);
    return { job, r };
  });

  for (const { job, r } of results) {
    job.stream.health = { ok: r.ok, reason: r.reason, latency_ms: r.latency_ms };
    if (r.content_type) job.stream.content_type = r.content_type;
  }

  const checkedAt = new Date().toISOString();
  for (const s of stations) {
    // Reorder so a working stream is always tried first (PRD §15). The listener
    // never sees the failover happen if priority 1 is already the healthy one.
    s.streams.sort((a, b) => {
      if (a.health.ok !== b.health.ok) return a.health.ok ? -1 : 1;
      return a.health.latency_ms - b.health.latency_ms;
    });
    s.streams.forEach((st, i) => (st.priority = i + 1));

    const anyOk = s.streams.some((st) => st.health.ok);
    const past = history[s.id] ?? [];
    const series = [...past, anyOk ? 1 : 0].slice(-HISTORY_DEPTH);
    history[s.id] = series;
    const rate = series.reduce((a, b) => a + b, 0) / series.length;

    s.health = {
      status: anyOk ? (rate >= 0.8 ? 'healthy' : 'flaky') : rate === 0 && series.length >= 3 ? 'dead' : 'failing',
      last_checked: checkedAt,
      recent_success_rate: Number(rate.toFixed(2)),
      latency_ms: s.streams[0]?.health.ok ? s.streams[0].health.latency_ms : null,
      checks: series.length,
    };
  }

  // A station confirmed dead across three consecutive runs leaves the catalog
  // entirely. Anything merely flaky stays, but ranks below healthy stations.
  const shipped = stations.filter((s) => s.health.status !== 'dead');
  const rank = { healthy: 0, flaky: 1, failing: 2 };
  shipped.sort(
    (a, b) =>
      rank[a.health.status] - rank[b.health.status] ||
      Number(b.featured) - Number(a.featured) ||
      b.popularity - a.popularity,
  );

  const catalog = {
    version: 1,
    generated: checkedAt,
    station_count: shipped.length,
    stations: shipped.map((s) => ({
      id: s.id,
      name: s.name,
      name_el: s.name_el,
      aliases: s.aliases ?? [],
      country: s.country,
      city: s.city,
      genres: s.genres,
      frequency: s.frequency,
      logo: s.logo,
      homepage: s.homepage,
      featured: Boolean(s.featured),
      popularity: s.popularity,
      streams: s.streams.map((st) => ({
        url: st.url,
        codec: st.codec,
        bitrate: st.bitrate,
        priority: st.priority,
      })),
      health: s.health,
    })),
  };

  await mkdir(resolve(ROOT, 'public'), { recursive: true });
  await writeFile(resolve(ROOT, 'public/catalog.json'), JSON.stringify(catalog), 'utf8');
  await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf8');

  const tally = shipped.reduce((acc, s) => ((acc[s.health.status] = (acc[s.health.status] ?? 0) + 1), acc), {});
  console.log(`✔ public/catalog.json — ${shipped.length} stations shipped, ${stations.length - shipped.length} dropped as dead`);
  console.log(`  ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

main().catch((err) => {
  console.error('✖ health check failed:', err.message);
  process.exit(1);
});
