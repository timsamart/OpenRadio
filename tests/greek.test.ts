import { describe, expect, it } from 'vitest';
import { editDistanceWithin, foldCase, skeleton, skeletons } from '../src/search/greek';

/**
 * The PRD names these exact equivalences (§8) and makes them release gates
 * (§40). They are asserted here rather than eyeballed in a search box.
 */
describe('Greek ↔ Latin folding', () => {
  it('resolves the PRD example set to one skeleton', () => {
    const target = skeleton('Ρυθμός');
    for (const variant of ['Rythmos', 'Rithmos', 'rythmos', 'ΡΥΘΜΟΣ', 'Ρυθμος']) {
      expect(skeletons(variant)).toContain(target);
    }
  });

  it('resolves Thessaloniki across scripts and spellings', () => {
    const target = skeleton('Θεσσαλονίκη');
    for (const variant of ['Thessaloniki', 'thesaloniki', '8essaloniki']) {
      expect(skeletons(variant)).toContain(target);
    }
  });

  it('matches Sfera written with either vowel choice', () => {
    expect(skeleton('sfaira')).toBe(skeleton('Σφαίρα'));
    expect(skeleton('sfera')).toBe(skeleton('Σφαίρα'));
  });

  it('strips tonos and final sigma without changing the word', () => {
    expect(foldCase('Σφαίρα')).toBe('σφαιρα');
    expect(foldCase('Ρυθμός')).toBe('ρυθμοσ');
    expect(foldCase('ΐ')).toBe('ι');
  });

  it('folds the digraphs that carry meaning in Greek', () => {
    expect(skeleton('μπάλα')).toBe(skeleton('bala'));
    expect(skeleton('ντέρτι')).toBe(skeleton('derti'));
    expect(skeleton('ούζο')).toBe(skeleton('uzo'));
  });

  it('does not collapse genuinely different stations', () => {
    expect(skeleton('Σφαίρα')).not.toBe(skeleton('Μελωδία'));
    expect(skeleton('Δρόμος')).not.toBe(skeleton('Κόσμος'));
  });

  it('bounds edit distance and bails out early', () => {
    expect(editDistanceWithin('sfera', 'sfera', 1)).toBe(0);
    expect(editDistanceWithin('sfrea', 'sfera', 2)).toBe(2);
    expect(editDistanceWithin('sfera', 'melodia', 2)).toBeNull();
  });
});
