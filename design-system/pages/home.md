# Page override — Home

Inherits MASTER. Deviations only.

## Job
Get the user listening in one tap. Home is a **launcher**, not a feed.

## Composition (top → bottom)

```
Header      48px   "Ραδιόφωνο" / "Radio"            [search icon 44px]
For now     ─      contextual suggestion (returning users only, ≥3 sessions)
Recently    ─      horizontal snap rail, 5 tiles max, 104px artwork
Your        ─      favorites, vertical rows, 5 max + "See all"
Popular     ─      vertical rows, 8 max
                   ↑ scroll ends here — no infinite list, no footer
```

New user (no local data): **Popular** first, then a 2×4 genre grid, then cities. Never an
empty state with an illustration — a new user gets a full screen of playable stations.

## Overrides
- The horizontal rail is the **only** horizontal scroll in the app. `scroll-snap-type: x
  mandatory`, snap to tile start, no scrollbar, no arrows, no auto-advance.
- Section labels are Latin uppercase micro-labels (MASTER §3) — swap to sentence case
  under `lang="el"`.
- "For now" (PRD §19) renders as a single row with a plain-language reason line:
  `Because you usually listen around this time`. The score is local and explainable; if the
  reason cannot be stated in one clause, do not show the section.
- Section caps are hard. If favorites exceed 5, show 5 + `See all` → My Radio. Home never
  grows unbounded.

## Do not
- Do not add a greeting ("Good morning, listener") — fake warmth, costs a row of height.
- Do not add counts, badges, "trending" arrows, or listener numbers (PRD §29: no fake activity).
- Do not put the install prompt here.
