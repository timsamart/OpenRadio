# Page override — Search

Inherits MASTER. Deviations only.

## Job
Type three letters, tap the result, hear audio.

## Composition
Search is an **overlay over the current screen**, not a tab. It opens from the header icon
on any primary screen, keeps the mini-player visible, and closes with `Esc` / back.

```
[ ← ]  [ search input, autofocus ]  [ ✕ clear ]
        aria-live="polite" → "12 stations"
recent searches (3 max, local)      ← empty query state
station rows                        ← results
```

## Overrides
- **No debounce.** The index is local (PRD §17/§42), so filter synchronously on `input`.
  A debounce would be the only thing standing between the keystroke and the 100ms target.
- **No submit button, no Enter requirement** (PRD §8). `Enter` plays the top result.
- Result rows show the matched dimension when it is not the name, so the match is
  explainable: `Ρυθμός 94.9 — Athens · matched "rithmos"`.
- Ranking weight order is fixed: exact name > name prefix > alias/transliteration >
  frequency > city > genre > tag. Name matches always outrank metadata matches.
- Normalization pipeline (display it nowhere, test it everywhere):
  `lowercase → strip tonos/diaeresis (NFD, drop U+0300–U+036F) → Greek↔Latin
  transliteration map → collapse digraphs (θ/th, χ/ch/h, ψ/ps, ου/ou/u, ι/η/υ/ει/oi → i)
  → fuzzy, Levenshtein ≤1 for len<6, ≤2 for len≥6`.
  `Ρυθμός` = `Rythmos` = `Rithmos` = `ryqmos` must all hit the same station.
- Empty result state is a single line plus three popular stations — never a dead end.

## Do not
- Do not show a loading spinner. Local search does not load.
- Do not add filters, sort controls, or a "search history" management screen.
- Do not autocomplete into the input; suggest with rows, never by rewriting what was typed.
