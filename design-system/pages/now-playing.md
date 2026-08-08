# Page override — Now Playing

Inherits MASTER. Deviations only.

## Job
A player state, **not a destination** (PRD §5). It is a sheet over the current screen.

## Routing resolution (PRD §5 vs §27)
§5 says Now Playing is not a navigation destination. §27 requires a shareable
`/radio/sfera-102-2` URL. Resolve without contradiction:

- Opening the sheet pushes a **history state**, not a route: `history.pushState({np: id})`.
  Back/`Esc`/swipe-down close the sheet and return to the screen underneath, unchanged and
  still scrolled where it was.
- `/radio/:id` is an **entry point only**: it renders Home underneath and opens the sheet
  with that station on top. One Play tap starts audio (§27 — no autoplay, §21).
- Sharing from the sheet emits `/radio/:id`. The sheet never becomes the app's current route
  in the tab bar; the active tab underneath stays lit.

## Composition
```
↓  (44px, top-left)                    ⋯ share (44px, top-right)
        artwork  288×288, --r-xl, centred
        Σφαίρα 102.2            28/34 600      lang="el"
        Athens · Greek Pop      14/19 muted
        ● LIVE                  badge
        ── metadata (optional) ─────────────
        Konstantinos Argiros
        Elpida                  14/19 muted
        ◀    ⏯(72)    ▶         gap 24, thumb zone
        ♡ Favorite      ⏱ Timer          (labelled, 44px)
        Cast / AirPlay                    (only if API present)
```

## Overrides
- **Metadata is additive and must not move the transport.** Reserve a fixed 44px slot for
  the artist/track lines. If metadata is absent or arrives late, the slot stays empty —
  the play button never shifts under the user's thumb (PRD §12: playback never depends on
  metadata; the layout must not either).
- Previous/Next are **station** controls. `aria-label="Previous station"` /
  `"Next station"` — never "rewind"/"forward", never a seek bar, never a progress
  scrubber. Live radio has no timeline; a scrubber would be a lie.
- Queue context is shown as one muted line above the transport when it isn't Favorites:
  `From: Laïko` / `From: search "sfera"`. Without it, Next is unpredictable.
- Cast/AirPlay renders **only** when the platform API exists (`RemotePlayback` /
  `webkitShowPlaybackTargetPicker`). A permanently disabled cast button is worse than none.
- Artwork is the only large saturated element in the app. It gets `--r-xl`, no shadow, no
  gradient scrim, no blurred backdrop bleed — §29 keeps the app quiet, and a blurred-artwork
  background is exactly the "everything is a gradient" failure mode.

## Unavailable state (PRD §39)
Replaces the transport in place, inside the sheet — no dialog, no toast:

```
This station is currently unavailable.
[ Try again ]                 ← primary, 44px, --accent
Try instead:  Rythmos · Dromos · Melodia    ← 3 rows, one tap each = audio
```

Reached only after retry + failover have silently exhausted (guardrail 9). The three
alternatives come from the same genre, healthy-only, and are real rows — the recovery path
is still one tap.

## Do not
- Do not add lyrics, track history, "up next", station schedule, or a website link.
- Do not animate the artwork on play (no pulse, no rotation — this is not a vinyl app).
- Do not require swipe-down to close; `↓` is the primary affordance, swipe is additive.
