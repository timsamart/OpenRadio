# Greek Radio PWA — Design System (MASTER)

**Source of truth.** Page files in `design-system/pages/` override this file. If a page file
does not exist, this file applies exclusively.

Derived from the PRD (Product Definition v0.1) + `ui-ux-pro-max` design intelligence.
Where the two disagreed, the PRD won — see §0.

---

## 0. Two deliberate overrides of the tool's default recommendation

The design database matched this product on *"music / entertainment"* and proposed a
**Vibrant & Block-based** style with **Righteous + Poppins** and a `#22C55E` play-green on
`#0F0F23`. Both are rejected:

| Tool proposed | Rejected because | Used instead |
|---|---|---|
| Style: *Vibrant & Block-based* — "bold, energetic, playful, high color contrast, duotone" | PRD §29 requires **calm, warm, quiet**, and explicitly forbids "gradients everywhere", "dense cards", "excessive animation". Vibrant/block is the aesthetic of a *content* app; this is an *appliance*. | **Greek summer** (§2): whitewash-and-Aegean in light, a night swim in dark. Station artwork carries the color; the chrome stays quiet. |
| Type: **Righteous** (display) + **Poppins** | Neither ships a **Greek subset**. Station names are Greek-canonical by PRD §18/§25 (`Σφαίρα 102.2`) — the heading font would fall back mid-string and break the product's core noun. | **Inter** (the DB's own *Minimal Swiss* pairing), which ships `greek` and `greek-ext` subsets and tabular numerals for frequencies. |

The *warm accent* is taken from the DB's **Podcast Platform** palette (`dark audio + warm
accent`) rather than the Music-Streaming play-green, because "warm" is a stated PRD
requirement and green reads as a generic transport control, not as a brand.

**Font rule:** any font substituted later must be verified to load with
`&subset=greek` (or equivalent) **before** it ships. Verified-Greek Google families to pick
from: `Inter`, `Noto Sans`, `Roboto`, `Open Sans`, `Source Sans 3`, `Fira Sans`, `Ubuntu`.

---

## 1. Design intent

> The interface is a **light switch**, not a magazine.

| Characteristic | Expressed as |
|---|---|
| Calm | one accent hue, no gradients, no decorative motion, generous vertical rhythm |
| Warm | limewash paper ground, sun-bleached sand surfaces, bougainvillea and gold as the two non-accent voices |
| Radio-centric | station artwork is the only saturated thing on screen |
| Touch-first | 64px rows, 44px minimum controls, thumb-zone transport |
| Legible | 16px floor, tabular frequencies, Greek-safe leading |

**Anti-patterns (hard bans):** dashboard grids, dense multi-metric cards, gradient
backgrounds, marketing banners, infinite feeds, fake activity counts, hero sections,
emoji-as-icon, animation that gates playback.

---

## 2. Color tokens — Greek summer

Three semantic colours, three jobs, never swapped:

| Voice | Means | Why this hue |
|---|---|---|
| **Aegean** — `--accent` | playback identity | the one colour a Greek listener reads as sea and sky; it says *this is the station that is on* |
| **Bougainvillea** — `--live` | broadcast state | the flower on every whitewashed wall; unmistakably not the accent, and not a generic error red |
| **Sun gold** — `--focus` | keyboard focus | a third voice, so a *focused* Play button can never be confused with a *playing* one |

All ratios below were computed, not estimated. Text tokens ≥ 4.5:1;
`--border-strong` ≥ 3:1 for non-text UI boundaries. Light is the reference
theme — this is a summer product, and the daylight version is not an
afterthought bolted onto a dark one.

### Light — whitewash & midday

```css
:root {
  --bg:            #FBF7EF;  /* limewash, warm not cream */
  --surface:       #FFFFFF;
  --surface-2:     #F3ECDE;  /* sun-bleached sand */
  --border:        #E6DCC8;  /* decorative hairline only */
  --border-strong: #8A8377;  /* 3.51:1 — inputs, focusable outlines */
  --text:          #12222B;  /* 15.24:1 — deep Aegean ink, never neutral grey */
  --muted:         #566A74;  /*  5.30:1 */
  --accent:        #0A6E9E;  /*  5.26:1; white-on-accent 5.62:1 */
  --accent-ink:    #FFFFFF;
  --live:          #A81552;  /*  6.79:1 */
  --focus:         #8A5B0B;  /*  5.49:1 */
}
```

### Dark — night swim

```css
:root[data-theme="dark"] {
  --bg:            #071620;  /* deep sea, not black: this is water at night */
  --surface:       #0E2331;
  --surface-2:     #16303F;
  --border:        #1E3C4C;
  --border-strong: #5C7E8E;  /*  4.22:1 */
  --text:          #EAF3F6;  /* 16.29:1 */
  --muted:         #9AB2BD;  /*  8.28:1 */
  --accent:        #4FC3E8;  /*  9.00:1 */
  --accent-ink:    #04212C;  /*  8.18:1 on accent */
  --live:          #FF7BA8;  /*  7.56:1 */
  --focus:         #F5C86B;  /* 11.67:1 */
}
```

**Rules**

1. Accent is reserved for **playback identity**: the currently-playing station, the primary
   transport button, the active tab. Never for decoration, never for two things at once on
   one screen.
2. `--focus` is a different hue from `--accent` on purpose — a focused Play button must not
   look like a playing station.
3. Default `color-scheme: light dark` and follow the system; the theme toggle lives in
   Settings and writes `localStorage.theme` (PRD §24). The explicit choice must beat
   `prefers-color-scheme` in **both** directions.
4. Station artwork is the only place saturated color enters the layout.
5. **No gradients in the chrome.** Summer arrives through the palette, the generous
   whitespace and the artwork — not through a sunset wash behind the content. A blurred
   artwork backdrop is exactly the failure mode §29 rules out.

### Station monogram fallback (required)

Greek station logos are inconsistently available and often low-resolution. Every station
tile must degrade to a deterministic monogram, never to a broken image or grey box:

```
tile  = TILES[hash(station.id) % 8]   // stable per station, survives reinstall
glyph = first grapheme of name_el (Greek) or name (Latin), per active locale
```

The eight tiles are a Greek-summer set, not random hues — Aegean, deep sea,
terracotta, ochre, olive, cypress, bougainvillea, sand. Every one clears
**5.4:1** against the white glyph, so the fallback is legible without a second
thought. Implemented in `src/ui/Artwork.tsx`.

This keeps §29's "station artwork carries the visual character" true even with an empty
logo field.

---

## 3. Typography

```css
--font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
```

Load `subset=latin,latin-ext,greek,greek-ext`, weights 400/500/600 only. Self-host or
`preload` — the shell must be usable in <1s (PRD §28), so no render-blocking font CSS; use
`font-display: swap` with a metric-compatible system fallback.

| Role | Size / line-height | Weight | Notes |
|---|---|---|---|
| Now Playing station | 28 / 34 | 600 | `letter-spacing: -0.01em` |
| Screen title | 22 / 28 | 600 | |
| Section label | 13 / 16 | 600 | `letter-spacing: .08em`, `--text-muted`, **Latin only** |
| Station row name | 17 / 23 | 500 | |
| Row meta (`Athens · Greek Pop`) | 14 / 19 | 400 | `--text-muted` |
| Mini-player name | 15 / 20 | 500 | |
| Body / settings | 16 / 24 | 400 | 16px is the floor, everywhere |
| Micro (timer, badge) | 12 / 16 | 500 | never used for anything tappable-only |

### Greek-specific typographic rules (non-negotiable)

1. **Line-height ≥ 1.35** on any line that can contain Greek. Tonos and dialytika (`ΐ`, `ΰ`)
   extend above cap height and clip at 1.2.
2. **Never `text-transform: uppercase` on station names or any user/catalog string.** Greek
   uppercase drops the tonos, changing `Σφαίρα` → `ΣΦΑΙΡΑ` in a way that breaks
   recognisability and screen-reader pronunciation. Uppercase is allowed *only* on the
   fixed Latin section labels above, and must be swapped for sentence case when
   `lang="el"`.
3. **Frequencies use tabular figures**: `font-variant-numeric: tabular-nums;` so `102.2`,
   `99.2`, `89.8` align in a column.
4. Set `lang` correctly per string (`lang="el"` on `name_el`) so the screen reader switches
   voice instead of spelling Greek letters in English.

---

## 4. Space, radius, elevation

```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 24px; --space-6: 32px; --space-7: 48px;

--r-sm: 8px;   /* chips, badges */
--r-md: 12px;  /* rows, inputs */
--r-lg: 16px;  /* cards, artwork */
--r-xl: 24px;  /* sheets, Now Playing artwork */
--r-full: 999px;

--shadow-sheet: 0 -8px 32px rgb(0 0 0 / .28);
--shadow-mini:  0 -1px 0 var(--border), 0 -6px 24px rgb(0 0 0 / .18);
```

Elevation is expressed as **surface tint first, shadow second**. Four shadows exist and
there is no fifth:

| Token | Where | Why |
|---|---|---|
| `--shadow-mini` | mini-player lip | it floats over content |
| `--shadow-sheet` | Now Playing / timer sheet | it floats over the screen |
| `--shadow-sun` | Now Playing artwork only | midday light is hard and close, so this is tight and offset, never a haze |
| `--lit-edge` | raised surfaces (tiles, cards, chips, mini-player) | a 1px top highlight — limewash catching the light. This is what makes a surface read as plaster rather than as a card |

### The three Greek-summer devices

The palette does the work; these three do the rest, and there are only three so
each one still registers.

1. **Limewash** — a 140px fractal-noise tile at 5% opacity, `multiply` in light
   and `screen` in dark, fixed behind the app (`body::before`). ~400 bytes inline,
   GPU-composited. It is not a gradient and not decoration: it is the difference
   between an off-white background and a wall.
2. **The arch** — `--r-arch`, a semicircular head on a squared foot, the shape of
   every whitewashed chapel window in the Cyclades. Used **exactly once**, on the
   Now Playing artwork, which §29 already names as the element carrying the visual
   character. Everywhere else stays rectangular so the arch reads as intent.
3. **The waterline** — the mini-player's top edge is 2px of the accent at 30%,
   the single place a sea edge enters the chrome, and only while something plays.

Deliberately not used: the meander (Greek key). It is the most recognisable Greek
ornament and the fastest route to looking like a taverna menu. Summer here comes
from light, plaster and sea, not from souvenirs.

**Layout envelope (mobile-first):** content `padding-inline: 16px`, max content width
`480px` centred; at ≥768px the same single column is centred with the tab bar becoming a
left rail. There is no multi-column layout in V1 — a radio has one dial.

**Bottom chrome stack** — every scroll container must reserve:

```css
padding-bottom: calc(56px + 64px + env(safe-area-inset-bottom) + 16px);
/*                tabbar  mini-player  iOS home indicator      breathing room */
```

Getting this wrong hides the last favorite behind the player — the single most common bug
in this layout.

### z-index scale

```
10  sticky section headers
20  tab bar
30  mini-player
40  sleep-timer / share sheet
50  Now Playing sheet
60  offline banner  (must sit above Now Playing)
```

---

## 5. Motion

```css
--dur-instant: 120ms;  /* icon state flips */
--dur-base:    200ms;  /* row press, fades */
--dur-sheet:   260ms;  /* Now Playing open/close */
--ease-out:    cubic-bezier(.2,.8,.2,1);   /* entering */
--ease-in:     cubic-bezier(.4,0,1,1);     /* exiting */
```

**The one motion law:** *audio and interface transitions are independent.* The play request
is dispatched on `pointerdown`/`click` **before** any animation frame. No transition,
sheet, or artwork crossfade may be awaited before `audio.play()` (PRD §30, guardrail 6).

Permitted motion, and nothing else:

| Where | What |
|---|---|
| Play button | `▶` → 3-dot loader → `⏸`, crossfade `--dur-instant`, no bounce |
| Playing indicator | 3-bar equalizer, 3 bars, ~900ms loop, `--accent`; **pauses when `paused`** |
| Row press | `background: --surface-2` in `--dur-base`, no scale transform |
| Now Playing | slide-up + backdrop fade, `--dur-sheet`, `--ease-out` |
| Artwork change | 200ms opacity crossfade only |
| Sleep timer expiry | 5s volume ramp to 0, then `pause()` |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important;
    animation-iteration-count: 1 !important; transition-duration: 1ms !important; }
  .eq-bars { display: none; }        /* replaced by static ● Playing */
}
```

The equalizer is decorative *and* informational, so reduced-motion swaps it for a static
badge — state is never carried by animation alone.

---

## 6. Components

### 6.1 Station row (the product's most important component)

```
┌─────────────────────────────────────────────┐
│ [56×56  ]  Sfera 102.2                  ♡   │   64px min, 72px comfortable
│ [artwork]  Athens · Greek Pop               │
└─────────────────────────────────────────────┘
   ↑ whole row is the play target      ↑ 44×44 secondary target
```

**Markup rule — do not nest buttons.** The row is a `<button>` (or `<div role="row">` with
a single button child) and the favorite control is a **sibling**, positioned over the row,
not a descendant:

```html
<li class="row">
  <button class="row__play" aria-label="Play Sfera 102.2">…</button>
  <button class="row__fav"  aria-pressed="false" aria-label="Add Sfera 102.2 to favorites">…</button>
</li>
```

Nested `<button>` is invalid HTML and silently breaks keyboard/AT traversal in Safari —
which is the exact platform PRD §20 calls out as the risk surface.

**States**

| State | Visual | Non-color signal |
|---|---|---|
| idle | `--text` name, `--text-muted` meta | — |
| hover / focus-visible | `--surface-2` fill, 2px `--focus` ring, inset | ring |
| playing | name in `--accent`, equalizer replaces artwork corner | equalizer + `aria-current="true"` |
| connecting | name in `--accent`, 3-dot loader, meta → `Connecting…` | word "Connecting…" |
| unavailable | 60% opacity, meta → `Unavailable` | word + `aria-disabled` |

The row never navigates. One tap = audio (guardrail 3).

### 6.2 Mini-player

Fixed, directly above the tab bar, full width, `--surface` with `--shadow-mini`.
64px tall. Contents: 40px artwork · station name + one line of state/metadata ·
Play/Pause (44px) · Favorite (44px).

- Tapping the **body** opens Now Playing. Tapping the two buttons does not.
- It mounts **outside** the router outlet. It has no route-dependent key. (PRD §10, §13)
- Never unmounts once a station is selected — not on route change, not on error, not
  offline. When unavailable it shows the retry affordance in place.
- Add a 4px hairline progress-free "live" bar? **No.** Live radio has no progress.

### 6.3 Transport (Now Playing)

`◀  ⏯  ▶` — previous/next are **station** controls (PRD §11). Label them
`aria-label="Previous station"` / `"Next station"` explicitly so no user or AT ever reads
them as seek. Primary button 72px, secondary 56px, gap 24px, centred in the lower third
(thumb zone). Disable prev/next when the queue has one entry — visibly, with 40% opacity
*and* `disabled`.

### 6.4 LIVE badge

`● LIVE` — dot in `--live`, the word always present. Never a bare colored dot.

### 6.5 Category tile (Discover)

96px tall, `--surface`, `--r-lg`, single Lucide SVG icon (20px, `--text-muted`) + label.
**The PRD wireframe uses emoji (🔥🎵🎤🪩) — those are placeholders, not the spec.** Emoji
render differently per OS, are announced verbosely by screen readers, and are the single
clearest "unfinished" signal in a shipped UI. Map them:

| PRD emoji | Lucide icon |
|---|---|
| 🔥 Popular | `flame` |
| 🎵 Greek Pop | `music-2` |
| 🎤 Laïko | `mic-vocal` |
| 🎼 Éntekhno | `music-4` |
| 🪩 80s / 90s | `disc-3` |
| 🌍 International | `globe` |
| 📰 News & Talk | `newspaper` |
| ⚽ Sport | `trophy` |
| 📍 By location | `map-pin` |

### 6.6 Search field

`<input type="search" role="searchbox">` inside `<form role="search">` with a real
`<label class="sr-only">`. No submit button (PRD §8). Results region carries
`aria-live="polite"` announcing `"12 stations"` — polite, not assertive, so it doesn't
interrupt each keystroke. Because the index is local, **do not debounce**; filter
synchronously on `input` to hold the <100ms target.

### 6.7 Sleep timer sheet

Four chips (15 / 30 / 45 / 60 min) + `Off`. Active timer shows remaining minutes in the
mini-player's meta line (`Sfera 102.2 · 23 min left`). Expiry = 5s fade → pause → clear.
No notification, no dialog (PRD §26).

### 6.8 Install card

Inline card at the **bottom** of My Radio, plus at most one bottom banner, shown only
after ≥2 sessions **and** ≥30s cumulative listening. Dismissal is permanent
(`localStorage.dismissedHints`). Never a modal, never before first playback (PRD §22).

---

## 7. Playback state → UI vocabulary

The state machine (PRD §14) is internal. The UI has exactly five words:

| Machine state | User sees | Where |
|---|---|---|
| `IDLE` | nothing | — |
| `CONNECTING`, `RETRYING`, `FAILOVER` | `Connecting…` after **400ms** delay | row + mini-player, in place |
| `PLAYING` | equalizer + `Playing` (AT) | row + mini-player |
| `PAUSED` | `▶` | mini-player |
| `UNAVAILABLE` | `This station is currently unavailable.` + `Try again` + 3 alternatives | mini-player expands / Now Playing |

The 400ms delay matters: a fast connect must never flash a spinner. Retry and failover are
**silent** — the user is not told the app is on its second stream URL (PRD §15).

Never surface `BUFFERING`, `HTTP 403`, `CONNECTION RESET`, codec names, or stream URLs to
a normal user. Put them behind Settings → Diagnostics if they are needed at all.

---

## 8. Accessibility contract

- Every icon-only button has `aria-label`; every decorative glyph has `aria-hidden="true"`.
- `focus-visible` only (never `:focus`), 2px `--focus` ring + 2px offset, on **every**
  interactive element. `outline: none` without a replacement is a defect.
- Tab order = visual order. The Now Playing sheet traps focus and returns it to the
  mini-player on close; `Esc` closes it.
- Touch targets ≥ 44×44 with ≥ 8px separation. The favorite heart inside a row is the one
  place this is easy to violate — give it a 44px hit box even though the glyph is 20px.
- Playback is fully operable without gestures: no swipe-only action exists anywhere
  (PRD §31). Swipe-to-dismiss on the sheet is additive to the `↓` button, never a
  replacement.
- Announce playback changes once, politely, from a single `aria-live="polite"` region
  owned by the audio service — not from each subscribing component (that would announce
  three times).
- Respect `prefers-reduced-motion` and `prefers-contrast`.
- Test with VoiceOver (iOS) and TalkBack, not just desktop screen readers — same rationale
  as §20's device-testing gate.

---

## 9. Performance rules the design must not break

| Target (PRD §28) | Design obligation |
|---|---|
| shell < 1s | no font blocking render; icons inlined as SVG sprite, not an icon font |
| interaction < 100ms | play dispatched on the input event, before any state/animation work |
| navigation immediate | routes are pre-rendered shells; lists virtualize past ~80 rows |
| artwork | WebP/AVIF, 56px and 240px variants, `loading="lazy"` below fold, `width`/`height` always set |
| no layout shift | every async region has a reserved skeleton of the exact final height |

Skeletons, not spinners, for list loads. Spinners only inside the play button.

---

## 10. Review checklist (block release on any unchecked box)

**Visual**
- [ ] No emoji used as an icon anywhere (Discover categories included)
- [ ] All icons from one Lucide set, 24px viewBox, consistent stroke
- [ ] No gradient backgrounds; accent used for exactly one meaning per screen
- [ ] Station monogram fallback renders for a station with no logo
- [ ] Both themes shipped and reviewed; light theme is warm, not inverted grey

**Interaction**
- [ ] Tapping anywhere on a row starts audio; no row navigates
- [ ] Favorite heart does not trigger the row (event isolation verified by test)
- [ ] `cursor: pointer` on every clickable surface
- [ ] Press feedback 120–200ms, no scale transforms causing reflow

**Greek**
- [ ] Greek glyphs render in the shipped font, not a fallback (check `Σφαίρα`, `Ρυθμός`, `ΐ`)
- [ ] No `text-transform: uppercase` on any catalog string
- [ ] Frequencies tabular-aligned in lists
- [ ] `lang="el"` set on Greek strings

**A11y**
- [ ] Every interactive element has a visible `focus-visible` ring
- [ ] Icon buttons labelled; decorative icons hidden
- [ ] Touch targets ≥44px, gaps ≥8px
- [ ] `prefers-reduced-motion` disables the equalizer and replaces it with text
- [ ] No state communicated by color alone (playing, live, unavailable)

**Layout**
- [ ] Nothing hidden behind mini-player + tab bar + safe area, on any screen
- [ ] Verified at 320, 375, 414, 768, 1024, 1440px — no horizontal scroll
- [ ] Offline banner sits above the Now Playing sheet

**Guardrails (PRD §43)**
- [ ] Mini-player survives every route change (E2E test asserts audio element identity)
- [ ] No `<audio>` element instantiated inside any station component
- [ ] Zero blocking modals before first playback
- [ ] No new UI step added to the Play path
