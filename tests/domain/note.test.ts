import { describe, expect, it } from 'vitest';
import {
  InvalidNoteError,
  formatNote,
  intervalBetween,
  isEnharmonic,
  parseNote,
  pitchClass,
  respell,
  transposeNote,
} from '../../src/domain/music/note';

describe('parseNote', () => {
  it('lee notas naturales', () => {
    expect(parseNote('C')).toEqual({ letter: 'C', alter: 0 });
    expect(parseNote('G')).toEqual({ letter: 'G', alter: 0 });
  });

  it('lee sostenidos y bemoles', () => {
    expect(parseNote('F#')).toEqual({ letter: 'F', alter: 1 });
    expect(parseNote('Bb')).toEqual({ letter: 'B', alter: -1 });
    expect(parseNote('C##')).toEqual({ letter: 'C', alter: 2 });
    expect(parseNote('Ebb')).toEqual({ letter: 'E', alter: -2 });
  });

  it('acepta los símbolos musicales ♯ y ♭', () => {
    expect(parseNote('F♯')).toEqual({ letter: 'F', alter: 1 });
    expect(parseNote('B♭')).toEqual({ letter: 'B', alter: -1 });
  });

  it('normaliza minúsculas', () => {
    expect(parseNote('a')).toEqual({ letter: 'A', alter: 0 });
  });

  it('rechaza lo que no es una nota', () => {
    expect(() => parseNote('H')).toThrow(InvalidNoteError);
    expect(() => parseNote('')).toThrow(InvalidNoteError);
    expect(() => parseNote('C#m')).toThrow(InvalidNoteError);
  });
});

describe('pitchClass', () => {
  it('sitúa cada natural en su semitono', () => {
    expect(pitchClass(parseNote('C'))).toBe(0);
    expect(pitchClass(parseNote('E'))).toBe(4);
    expect(pitchClass(parseNote('B'))).toBe(11);
  });

  it('da la vuelta correctamente en los extremos', () => {
    expect(pitchClass(parseNote('B#'))).toBe(0);
    expect(pitchClass(parseNote('Cb'))).toBe(11);
  });

  it('reconoce enarmónicos', () => {
    expect(isEnharmonic(parseNote('F#'), parseNote('Gb'))).toBe(true);
    expect(isEnharmonic(parseNote('F#'), parseNote('G'))).toBe(false);
  });
});

describe('transposeNote', () => {
  it('respeta la grafía diatónica al subir un tono', () => {
    const up = intervalBetween(parseNote('C'), parseNote('D'));
    expect(formatNote(transposeNote(parseNote('C'), up))).toBe('D');
    expect(formatNote(transposeNote(parseNote('F'), up))).toBe('G');
    // La prueba que separa un motor correcto de uno ingenuo: F# debe ir a
    // G#, nunca a Ab, porque el escalón diatónico manda.
    expect(formatNote(transposeNote(parseNote('F#'), up))).toBe('G#');
    expect(formatNote(transposeNote(parseNote('B'), up))).toBe('C#');
  });

  it('conserva bemoles cuando el destino los pide', () => {
    const up = intervalBetween(parseNote('C'), parseNote('Eb'));
    expect(formatNote(transposeNote(parseNote('C'), up, 'flat'))).toBe('Eb');
    expect(formatNote(transposeNote(parseNote('F'), up, 'flat'))).toBe('Ab');
    expect(formatNote(transposeNote(parseNote('G'), up, 'flat'))).toBe('Bb');
  });

  it('vuelve a la nota de partida tras un ciclo de octava', () => {
    const unison = intervalBetween(parseNote('C'), parseNote('C'));
    expect(formatNote(transposeNote(parseNote('A#'), unison))).toBe('A#');
  });

  it('reescribe en lugar de emitir triples alteraciones', () => {
    const note = transposeNote(parseNote('B#'), intervalBetween(parseNote('C'), parseNote('C#')));
    expect(Math.abs(note.alter)).toBeLessThanOrEqual(2);
  });
});

describe('respell', () => {
  it('elige la grafía simple según la preferencia', () => {
    expect(formatNote(respell(6, 'sharp'))).toBe('F#');
    expect(formatNote(respell(6, 'flat'))).toBe('Gb');
    expect(formatNote(respell(0, 'flat'))).toBe('C');
  });
});

describe('registerCustomInstruments (catálogo)', () => {
  it('instrumentById resuelve un instrumento registrado dinámicamente', async () => {
    const { registerCustomInstruments, instrumentById } = await import(
      '../../src/domain/model'
    );
    registerCustomInstruments([{ id: 'custom-saxo', name: 'Saxofón', family: 'other' }]);
    expect(instrumentById('custom-saxo')?.name).toBe('Saxofón');
    expect(instrumentById('piano')?.name).toBe('Piano');
    registerCustomInstruments([]);
  });
});
