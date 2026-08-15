import { describe, expect, it } from 'vitest';
import {
  InvalidChordError,
  formatChord,
  isChord,
  parseChord,
} from '../../src/domain/music/chord';

describe('parseChord — raíz y bajo', () => {
  it('lee tríadas simples', () => {
    const c = parseChord('C');
    expect(formatChord(c)).toBe('C');
    expect(c.quality).toBe('major');
    expect(c.bass).toBeNull();
  });

  it('lee menores', () => {
    expect(parseChord('Am').quality).toBe('minor');
    expect(parseChord('F#m').quality).toBe('minor');
    expect(parseChord('Cmin').quality).toBe('minor');
    expect(parseChord('C-').quality).toBe('minor');
  });

  it('distingue maj7 de m7', () => {
    expect(parseChord('Cmaj7').quality).toBe('major');
    expect(parseChord('Cmaj7').extension).toBe('maj7');
    expect(parseChord('Cm7').quality).toBe('minor');
    expect(parseChord('Cm7').extension).toBe('7');
  });

  it('lee slash chords', () => {
    const chord = parseChord('Bb/D');
    expect(formatChord(chord)).toBe('Bb/D');
    expect(chord.bass).toEqual({ letter: 'D', alter: 0 });
  });

  it('conserva el texto original del sufijo', () => {
    expect(parseChord('Cmaj7#11').suffix).toBe('maj7#11');
    expect(formatChord(parseChord('Cmaj7#11'))).toBe('Cmaj7#11');
  });
});

describe('parseChord — calidades', () => {
  const cases: Array<[string, string]> = [
    ['C7', 'dominant'],
    ['Cdim', 'diminished'],
    ['C°', 'diminished'],
    ['Caug', 'augmented'],
    ['C+', 'augmented'],
    ['Csus4', 'suspended'],
    ['Csus2', 'suspended'],
    ['C5', 'power'],
    ['Cm7b5', 'half-diminished'],
  ];

  it.each(cases)('%s → %s', (symbol, quality) => {
    expect(parseChord(symbol).quality).toBe(quality);
  });
});

describe('parseChord — detalle estructurado', () => {
  it('detecta suspensiones', () => {
    expect(parseChord('Csus4').suspension).toBe('sus4');
    expect(parseChord('Csus2').suspension).toBe('sus2');
    expect(parseChord('Csus').suspension).toBe('sus4');
    expect(parseChord('C').suspension).toBeNull();
  });

  it('detecta añadidos', () => {
    expect(parseChord('Cadd9').additions).toEqual(['add9']);
    expect(parseChord('C').additions).toEqual([]);
  });

  it('detecta alteraciones', () => {
    expect(parseChord('C7b9').alterations).toContain('b9');
    expect(parseChord('Cmaj7#11').alterations).toContain('#11');
    expect(parseChord('C7#5b9').alterations).toEqual(expect.arrayContaining(['#5', 'b9']));
  });

  it('detecta extensiones', () => {
    expect(parseChord('C9').extension).toBe('9');
    expect(parseChord('C13').extension).toBe('13');
    expect(parseChord('C6').extension).toBe('6');
    expect(parseChord('C').extension).toBeNull();
  });
});

describe('parseChord — errores', () => {
  it('rechaza texto que no es un acorde', () => {
    expect(() => parseChord('Hola')).toThrow(InvalidChordError);
    expect(() => parseChord('')).toThrow(InvalidChordError);
  });

  it('isChord no lanza', () => {
    expect(isChord('C')).toBe(true);
    expect(isChord('Coro')).toBe(false);
  });
});
