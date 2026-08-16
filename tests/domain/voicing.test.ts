import { describe, expect, it } from 'vitest';
import { parseChord } from '../../src/domain/music/chord';
import { chordTones } from '../../src/domain/music/chord-tones';
import { pitchClass } from '../../src/domain/music/note';
import {
  TUNINGS,
  findVoicings,
  keyboardVoicing,
  tuningFor,
  voicingMidi,
} from '../../src/domain/music/voicing';

const guitar = TUNINGS['acoustic-guitar'];
const bass = TUNINGS.bass;

/** Semitonos sobre la fundamental, que es como se leen los acordes. */
function degreesOf(symbol: string): number[] {
  return chordTones(parseChord(symbol)).map((tone) => tone.semitones);
}

describe('notas de un acorde', () => {
  it('arma las tríadas básicas', () => {
    expect(degreesOf('C')).toEqual([0, 4, 7]);
    expect(degreesOf('Am')).toEqual([0, 3, 7]);
    expect(degreesOf('Caug')).toEqual([0, 4, 8]);
    expect(degreesOf('Cdim')).toEqual([0, 3, 6]);
  });

  it('distingue la séptima de dominante de la mayor', () => {
    expect(degreesOf('C7')).toEqual([0, 4, 7, 10]);
    expect(degreesOf('Cmaj7')).toEqual([0, 4, 7, 11]);
    expect(degreesOf('Am7')).toEqual([0, 3, 7, 10]);
  });

  it('resuelve el semidisminuido, que es el caso que más se escribe mal', () => {
    // Am7b5: la quinta baja y la séptima es menor, no disminuida.
    expect(degreesOf('Am7b5')).toEqual([0, 3, 6, 10]);
  });

  it('sustituye la tercera en los suspendidos', () => {
    expect(degreesOf('Csus4')).toEqual([0, 5, 7]);
    expect(degreesOf('Csus2')).toEqual([0, 2, 7]);
    expect(degreesOf('Csus4')).not.toContain(4);
  });

  it('acumula la serie en las extensiones y no en los add', () => {
    // Una novena arrastra la séptima; un add9 no.
    expect(degreesOf('C9')).toContain(10);
    expect(degreesOf('C9')).toContain(2);
    expect(degreesOf('Cadd9')).toContain(2);
    expect(degreesOf('Cadd9')).not.toContain(10);
  });

  it('marca opcional la quinta justa pero no la alterada', () => {
    const justa = chordTones(parseChord('C')).find((tone) => tone.semitones === 7);
    const alterada = chordTones(parseChord('C7b5')).find((tone) => tone.semitones === 6);
    expect(justa?.optional).toBe(true);
    expect(alterada?.optional).toBe(false);
  });
});

describe('digitaciones', () => {
  it('encuentra la postura estándar de Am en guitarra', () => {
    const voicings = findVoicings(parseChord('Am'), guitar, 6);
    const shapes = voicings.map((voicing) => voicing.frets.join(','));
    // x02210: la que toca todo el mundo.
    expect(shapes).toContain(',0,2,2,1,0');
  });

  it('encuentra la postura estándar de C en guitarra', () => {
    const voicings = findVoicings(parseChord('C'), guitar, 6);
    const shapes = voicings.map((voicing) => voicing.frets.join(','));
    // x32010
    expect(shapes).toContain(',3,2,0,1,0');
  });

  it('nunca omite la tercera ni la séptima', () => {
    for (const symbol of ['Am7', 'Cmaj7', 'G7', 'Dm7b5', 'F#m']) {
      const chord = parseChord(symbol);
      const root = pitchClass(chord.root);
      const essential = chordTones(chord)
        .filter((tone) => !tone.optional)
        .map((tone) => (root + tone.semitones) % 12);

      const voicings = findVoicings(chord, guitar, 3);
      expect(voicings.length).toBeGreaterThan(0);

      for (const voicing of voicings) {
        const heard = new Set(voicingMidi(voicing, guitar).map((midi) => midi % 12));
        for (const pitch of essential) expect(heard).toContain(pitch);
      }
    }
  });

  it('pone la fundamental en el bajo siempre que puede', () => {
    for (const symbol of ['C', 'Am', 'G', 'Em', 'D']) {
      const chord = parseChord(symbol);
      const [best] = findVoicings(chord, guitar, 1);
      expect(voicingMidi(best, guitar)[0] % 12).toBe(pitchClass(chord.root));
    }
  });

  it('respeta el bajo de un slash chord', () => {
    const [best] = findVoicings(parseChord('C/G'), guitar, 1);
    const lowest = voicingMidi(best, guitar)[0] % 12;
    expect(lowest).toBe(7); // G
  });

  it('no abre la mano más de cuatro trastes', () => {
    for (const symbol of ['Am7b5', 'Cmaj9', 'F#7', 'Bb', 'Ebm']) {
      for (const voicing of findVoicings(parseChord(symbol), guitar, 3)) {
        const pressed = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
        if (pressed.length > 1) {
          expect(Math.max(...pressed) - Math.min(...pressed)).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('acepta el bajo, que toca una nota por acorde', () => {
    const voicings = findVoicings(parseChord('E'), bass, 3);
    expect(voicings.length).toBeGreaterThan(0);
    expect(voicingMidi(voicings[0], bass)[0] % 12).toBe(4);
  });

  it('no tiene afinación para lo que no lleva acordes', () => {
    expect(tuningFor('drums')).toBeUndefined();
    expect(tuningFor('voice')).toBeUndefined();
    expect(tuningFor('acoustic-guitar')).toBeDefined();
  });
});

describe('teclado', () => {
  it('coloca el acorde en posición cerrada sobre la fundamental', () => {
    // C4 = 60. Un Do mayor son 60, 64 y 67.
    expect(keyboardVoicing(parseChord('C'))).toEqual([60, 64, 67]);
  });

  it('baja el bajo del slash chord por debajo del acorde', () => {
    const notes = keyboardVoicing(parseChord('C/G'));
    expect(notes[0] % 12).toBe(7);
    expect(notes[0]).toBeLessThan(60);
  });
});
