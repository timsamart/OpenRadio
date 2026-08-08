# Page override — My Radio

Inherits MASTER. Deviations only.

## Job
The user's own shelf. Replaces the concept of a profile (PRD §9) — so it contains no
identity, no avatar, no name, no stats.

## Composition
```
Header 48px   "My Radio"
★ Favorites   reorderable rows + "Edit" toggle
◷ History     rows with relative day label, 20 max, "Clear history"
⚙ Settings    theme · language · sleep timer default · about · diagnostics
[install card]  (MASTER §6.8, bottom, dismissible)
```

## Reordering (the one genuinely tricky interaction)
Favorites order defines Previous/Next in Now Playing (PRD §9/§11), so it must be editable —
but drag is gesture-only, which §31 forbids as a sole mechanism.

- Default mode: plain rows, tap = play.
- `Edit` toggles reorder mode: rows show a drag handle **and** `Move up` / `Move down`
  buttons (44px). In edit mode the row no longer plays — the mode change is announced and
  visually obvious (handles appear, `Edit` becomes `Done`).
- Keyboard: focus a row, `Alt+↑ / Alt+↓` moves it, `aria-live` announces
  `Sfera 102.2, position 2 of 6`.
- Never destructive: removing a favorite is a tap on the filled heart, undoable via a 5s
  inline undo affordance, not a confirmation dialog (PRD Journey E: no confirmation).

## Overrides
- History rows use relative labels only (`today`, `yesterday`, `Friday`, then `12 Jul`) —
  never timestamps, which would read as surveillance in an account-free product.
- Settings is a plain list on this screen, not a separate destination with its own tab.
- The privacy line lives here, verbatim from PRD §33: **"No ads added by us."** — not
  "ad-free".

## Do not
- Do not add listening-time totals, streaks, "top station of the month", or any stat.
  This is a shelf, not a dashboard (PRD §29).
- Do not add an account/sync teaser.
