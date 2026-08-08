# OpenRadio

**Άνοιξε. Πάτα. Άκου.** — Open. Tap. Listen.

Greek live radio as a PWA. No account, no onboarding, no ads added by us, and
exactly one deliberate tap between opening the app and hearing a station.

---

## Quick start

```bash
npm install
npm run catalog:build   # fetch + health-check the Greek station catalog
npm run dev
```

```bash
npm run build && npm run preview
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | Typecheck, then production build with service worker |
| `npm test` | Greek folding + search ranking tests |
| `npm run catalog:ingest` | Radio Browser → `data/catalog.raw.json` |
| `npm run catalog:health` | Probe every stream → `public/catalog.json` |
| `npm run catalog:build` | Both, in order |
| `node scripts/icons.mjs` | Regenerate PWA icons (zero dependencies) |

---

## Architecture

```
Radio Browser  ─┐
manual curation ┼─► scripts/ingest.mjs ─► data/catalog.raw.json
station sites  ─┘                                  │
                                        scripts/health.mjs
                                                   │
                                        public/catalog.json  (static asset)
                                                   │
┌──────────────────────────────────────────────────▼───────────────────────┐
│                              OpenRadio PWA                               │
│                                                                          │
│  src/app/App.tsx ── route outlet ─┬─ screens/                            │
│                                   └─ ui/MiniPlayer  ← SIBLING, not child │
│                                                                          │
│  src/audio/engine.ts     one <audio>, module scope, outside React        │
│  src/data/               IndexedDB: favorites · history · stats · catalog │
│  src/search/greek.ts     Greek ↔ Latin ↔ Greeklish folding               │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │  direct playback, no relay
                      broadcaster stream
```

Radio Browser is a **build-time** source only. Nothing in the running app ever
calls it, so a Radio Browser outage cannot reach a listener.

---

## The invariants

These are enforced by structure, not by remembering:

| # | Invariant | How it is enforced |
|---|---|---|
| 1 | Audio state is global | `src/audio/engine.ts` creates the only `HTMLAudioElement`, at module scope |
| 2 | Routing never owns audio | The mini-player is a sibling of the route outlet in `App.tsx`, with no route-derived key |
| 3 | One tap starts a station | `StationRow` plays on click and never navigates |
| 4 | Login is never required | There is no auth code in this repository |
| 5 | Installation is never required | `InstallCard` renders inline, after playback, and is dismissible |
| 6 | Playback beats animation | `playStation()` dispatches on the click, before any transition |
| 7 | Catalog failure spares favorites | Separate IndexedDB object stores; a failed fetch falls back to the snapshot |
| 8 | No third-party runtime SPOF | The catalog is a static asset |
| 9 | Recover before erroring | retry → failover → *then* `unavailable` |
| 10 | No new friction on the play path | — |

### Verified in a real browser

Playing the actual Sfera stream, then navigating Home → Discover → My Radio:

```
sameElement      true     one <audio>, identical object across routes
srcUnchanged     true
stillPlaying     true
audioElements    1        after four rapid station switches
```

Two bugs that only a real browser surfaces were found and fixed this way:

- `play()` rejects with **`AbortError`** when a newer load supersedes it. Treating
  that as a stream failure sent the station the user just tapped through failover
  and into "unavailable". It is now ignored, because it is not a failure.
- The **`stalled`** event fires ~3s into a slow-but-healthy Icecast start, and a
  stalled event left over from an abandoned stream drove the *next* station into
  failover. The listener was removed; the connect watchdog covers real failure.

---

## The catalog

`npm run catalog:build` produces a curated, health-checked catalog:

```
140 stations shipped · 139 healthy · 1 failing · 0 dead
```

- **Ingest** deduplicates by name+frequency, drops non-HTTPS streams (a mixed-content
  stream cannot play from an HTTPS PWA), maps source tags onto a closed nine-item
  taxonomy, and strips contributor decoration (`[HD 320]`, `FM.GR`, bitrate tags).
- **Health** opens every candidate stream and reads real bytes — a HEAD request is
  not enough, because Icecast answers HEAD with 405 while streaming fine, and a
  captive portal answers 200 with HTML forever. Streams are then reordered so a
  working one is always priority 1.
- `data/curation.json` holds product-owned facts (canonical ids, Greek names,
  aliases, cities, genres) and **wins over anything the third party says**.
- Transliterations are deliberately *not* precomputed — they are derived at runtime
  by `src/search/greek.ts`, so ingest and app can never disagree.

Run `catalog:health` on a schedule. `data/health.history.json` keeps the last 20
runs per station, so `recent_success_rate` means something and a station dead
across three consecutive runs leaves the catalog on its own.

---

## Deploying

GitHub Pages, via `.github/workflows/pages.yml` on every push to `main`.
Enable it once: **Settings → Pages → Source: GitHub Actions**.

It lands at `https://<user>.github.io/OpenRadio/` — a *subpath*, which is why the
build takes a base:

```bash
PAGES_BASE=/OpenRadio/ npm run build
```

`import.meta.env.BASE_URL` is the only place that prefix exists. Routing works in
app-space (`/discover`), and `src/app/router.ts` translates at the boundary, so
the app runs identically at a subpath, at a domain root, or on a custom domain
(drop `PAGES_BASE` for the last two).

**This is a good fit.** The product is static by design — the browser talks to
broadcaster streams directly and there is no relay (PRD §34), so there is nothing
for a server to do. Ingest already drops non-HTTPS streams, which is exactly what
makes an HTTPS-only host viable: a mixed-content stream could not have played
anyway.

Two things to know:

1. **Deep links return HTTP 404.** GitHub Pages has no rewrite rules, so
   `/OpenRadio/radio/sfera` is served from `404.html` — a copy of the shell. The
   app boots and renders correctly (verified), but the status line says 404,
   which link-preview crawlers dislike. If shared station URLs start mattering,
   a host with a real `200` rewrite (Cloudflare Pages, Netlify — one line of
   `_redirects`) fixes it without touching the app.
2. **The repository must be public**, or Pages needs a paid plan.

The nightly catalog job commits to `main`, which triggers a redeploy — station
health and the live site stay in sync without anyone thinking about it.

---

## Search

One index, six dimensions, no debounce (the index is local; a debounce would be
the only thing between the keystroke and the <100 ms target).

| Typed | Finds |
|---|---|
| `sfer` | Sfera 102.2 |
| `rithmos` | Ρυθμός |
| `Ρυθμός` | Ρυθμός |
| `102.2` | Sfera 102.2 |
| `8essaloniki` | Thessaloniki stations |
| `melodya` | Μελωδία 99.2 |

Both catalog entries and queries are reduced to a phonetic *skeleton*. Where
Greeklish is genuinely ambiguous — `x` means χ to some typists and ξ to others —
a string produces a small set of skeletons and a match on any counts.

Name matches always outrank metadata matches, so typing a city can never bury
the station actually called that.

---

## Design

The design system lives in [`design-system/`](design-system/MASTER.md).
`MASTER.md` is the source of truth; files in `design-system/pages/` override it
per screen.

**Greek summer.** Whitewashed limewash at midday, Aegean blue as the one voice
that means *this is playing*, bougainvillea for LIVE, sun gold for focus. Dark
is a night swim — same three voices off a deep-sea ground. Three semantic
colours, three jobs, never swapped: focus is a different hue from the accent on
purpose, so a focused Play button never reads as a playing one.

Every contrast ratio in `src/styles.css` was computed, not estimated.

Three rules a Latin-first design system gets wrong:

1. `line-height` ≥ 1.35 anywhere Greek can appear — tonos and dialytika (`ΐ`, `ΰ`)
   clip at 1.2.
2. Never `text-transform: uppercase` on a catalog string. Greek uppercase drops
   the tonos, which changes the word and how a screen reader pronounces it.
3. `font-variant-numeric: tabular-nums` on frequencies, so 102.2 / 99.2 / 89.8
   line up in a column.

Station artwork carries the colour. Where a logo is missing — often, and with
rights questions attached — a deterministic monogram tile stands in, drawn from
a Greek-summer hue set that all clears 5.4:1 against the white glyph.

---

## Not in V1

Accounts, sync, podcasts, notifications, reviews, playlists, a recommendation
engine, and a premium tier are out by decision, not by omission. Personalization
is a handful of additions in `src/data/library.ts` that a listener could read out
loud — if the reason cannot be written as one clause, the suggestion is not shown.

Live track metadata is stubbed at `setMetadata()`. ICY metadata is not readable
from a cross-origin `HTMLAudioElement`, so shipping it would require a metadata
proxy — an explicit product decision, not a small addition.

---

## Still to verify on hardware

Background audio cannot be signed off from a desktop browser (PRD §20). The
device matrix — Android Chrome, iOS Safari, both installed, screen locked,
backgrounded, Bluetooth, headset, call interruption, Wi-Fi ↔ cellular — is a
release gate and is **not** met yet.

---

## Licence and rights

Station names, logos and streams belong to their broadcasters. Streams are linked
directly; nothing is retransmitted or cached. Review name and logo usage rights
before any public commercial launch.

The app adds no advertising. Advertising inside a broadcaster's live stream is
part of that station — hence *"No ads added by us"*, never *"ad-free"*.
