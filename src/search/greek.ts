/**
 * Greek ↔ Latin folding — PRD §8.
 *
 * This is the single source of truth for transliteration. The build-time catalog
 * scripts deliberately do NOT precompute transliterations; they are derived here
 * so `Ρυθμός`, `Rythmos`, `Rithmos` and `ryumos` can never drift apart between
 * the ingest pipeline and the running app.
 *
 * The strategy is a phonetic *skeleton*: both catalog entries and user queries
 * are reduced to a small alphabet where the distinctions Greeklish typists do
 * not make reliably are collapsed. Because a few mappings are genuinely
 * ambiguous (Greeklish `x` means χ to some people and ξ to others), a string
 * produces a small SET of skeletons rather than one, and a match on any of them
 * counts.
 */

const ACCENT_FOLD: Record<string, string> = {
  ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω',
  ΐ: 'ι', ΰ: 'υ', ϊ: 'ι', ϋ: 'υ', ς: 'σ',
};

/** Digraphs must be consumed before single letters or `ου` becomes `o`+`i`. */
const GREEK_DIGRAPHS: [string, string][] = [
  ['ου', 'u'], ['αυ', 'av'], ['ευ', 'ev'], ['ηυ', 'iv'],
  ['αι', 'e'], ['ει', 'i'], ['οι', 'i'], ['υι', 'i'],
  ['γγ', 'ng'], ['γκ', 'g'], ['γχ', 'nx'], ['μπ', 'b'], ['ντ', 'd'],
  ['τζ', 'tz'], ['τσ', 'ts'],
];

const GREEK_LETTERS: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: '8', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'ks', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  τ: 't', υ: 'i', φ: 'f', χ: 'x', ψ: 'ps', ω: 'o',
};

/** Strip diacritics and lowercase, for both scripts. */
export function foldCase(input: string): string {
  const lower = input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return [...lower].map((ch) => ACCENT_FOLD[ch] ?? ch).join('');
}

function greekToLatin(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const pair = s.slice(i, i + 2);
    const digraph = GREEK_DIGRAPHS.find(([g]) => g === pair);
    if (digraph) {
      out += digraph[1];
      i += 2;
      continue;
    }
    const ch = s[i]!;
    out += GREEK_LETTERS[ch] ?? ch;
    i += 1;
  }
  return out;
}

/**
 * Reduce Latin/Greeklish to the same alphabet Greek reduces to.
 * `8` is the internal symbol for θ — it is also what many Greeklish typists
 * literally type, which is convenient rather than coincidental.
 */
function latinSkeleton(s: string): string {
  return s
    .replace(/ch|kh/g, 'x')
    .replace(/th|q/g, '8')
    .replace(/ph/g, 'f')
    .replace(/h/g, '')       // silent everywhere else: "rhodes" → "rodes"
    .replace(/w/g, 'o')      // Greeklish ω
    .replace(/3/g, 'ks')     // Greeklish ξ
    .replace(/y/g, 'i')
    .replace(/[jc]/g, 'k')
    .replace(/(.)\1+/g, '$1'); // doubled consonants: "sfaira"/"sffaira"
}

/** Collapse vowel qualities Greeklish typists do not agree on. */
function vowelSkeleton(s: string): string {
  return s.replace(/ou/g, 'u').replace(/ei|oi|ui/g, 'i').replace(/ai/g, 'e');
}

function base(input: string): string {
  const folded = foldCase(input);
  const latin = greekToLatin(folded);
  return vowelSkeleton(latinSkeleton(latin)).replace(/[^a-z0-9]/g, '');
}

/**
 * All skeletons a string can plausibly be typed as. Small by construction —
 * at most four — so index size stays linear.
 */
export function skeletons(input: string): string[] {
  const primary = base(input);
  const out = new Set<string>();
  if (primary) out.add(primary);
  // Greeklish `x` is read as ξ by some typists and χ by others.
  if (primary.includes('x')) {
    out.add(primary.replace(/x/g, 'ks'));
    out.add(primary.replace(/x/g, 'k'));
  }
  // θ is written `8`, `th` or just `t` depending on the keyboard someone had.
  if (primary.includes('8')) out.add(primary.replace(/8/g, 't'));
  return [...out].filter(Boolean);
}

/** Convenience: the single canonical skeleton, for equality comparisons. */
export function skeleton(input: string): string {
  return base(input);
}

/**
 * Levenshtein distance with an early exit. Bounded because a search box only
 * ever needs "is this within 1–2 edits", never the exact distance of two
 * unrelated strings.
 */
export function editDistanceWithin(a: string, b: string, max: number): number | null {
  if (Math.abs(a.length - b.length) > max) return null;
  if (a === b) return 0;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0]!;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      if (curr[j]! < rowMin) rowMin = curr[j]!;
    }
    if (rowMin > max) return null;
    [prev, curr] = [curr, prev];
  }
  const d = prev[b.length]!;
  return d <= max ? d : null;
}

/** Tolerance scales with word length: short queries must not match everything. */
export function fuzzyBudget(query: string): number {
  if (query.length < 4) return 0;
  if (query.length < 6) return 1;
  return 2;
}
