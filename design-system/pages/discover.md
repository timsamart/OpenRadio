# Page override — Discover

Inherits MASTER. Deviations only.

## Job
Category → audio in **two taps maximum** (PRD §7).

## Composition
```
Header 48px  "Discover"                         [search 44px]
Genre grid   2 columns × 96px tiles, gap 12px   (9 tiles, MASTER §6.5 icon map)
By location  city rows, 56px, single line, no artwork
```

## The two-tap rule
Tap 1 = category → opens a **station list** (a route, not a sheet).
Tap 2 = station row → audio.
There is no intermediate "category landing" with a description, a hero, or subcategories.

## Overrides
- Category list pages sort by health first (PRD §16), then curated rank. `health.status !=
  healthy` sinks to the bottom of the list; `dead` is filtered out entirely, never rendered
  greyed.
- Cities are a flat list, alphabetical after the first six (Athens, Thessaloniki, Patras,
  Heraklion, Larissa, Volos). No map, no region tree — one level only.
- Taxonomy depth is capped at **2** by design. If a future genre needs a child, it becomes
  a sibling instead.

## Do not
- Do not expose raw Radio Browser tags (PRD §7). The tile label set is closed and curated.
- Do not add "All stations" / A–Z directory — that is the enormous-directory failure mode
  the screen exists to avoid.
