/**
 * Modelo de nota con conciencia diatónica.
 *
 * Una nota NO se guarda como un número de semitono suelto: se guarda como
 * (letra, alteración). Esa distinción es la que permite que la transposición
 * escoja la grafía correcta — que C→D convierta F# en G#, y no en Ab.
 */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

export type Letter = (typeof LETTERS)[number];

/** Semitonos de cada letra natural respecto de C. */
const LETTER_SEMITONES: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export interface Note {
  letter: Letter;
  /** Alteración en semitonos: -2 (doble bemol) … +2 (doble sostenido). */
  alter: number;
}

/** Preferencia de grafía al resolver una nota enarmónica ambigua. */
export type AccidentalPreference = 'sharp' | 'flat';

const NOTE_PATTERN = /^([A-Ga-g])((?:#|b|♯|♭|x|𝄪)*)$/;

export class InvalidNoteError extends Error {
  constructor(input: string) {
    super(`Nota no reconocida: "${input}"`);
    this.name = 'InvalidNoteError';
  }
}

/** Convierte una cadena de alteraciones ("#", "bb", "♯") a semitonos. */
function accidentalsToAlter(accidentals: string): number {
  let alter = 0;
  for (const ch of accidentals) {
    switch (ch) {
      case '#':
      case '♯':
        alter += 1;
        break;
      case 'b':
      case '♭':
        alter -= 1;
        break;
      case 'x':
      case '𝄪':
        alter += 2;
        break;
      default:
        break;
    }
  }
  return alter;
}

/** Convierte semitonos de alteración a su grafía textual ("#", "bb"). */
export function alterToAccidentals(alter: number): string {
  if (alter === 0) return '';
  return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
}

export function parseNote(input: string): Note {
  const match = NOTE_PATTERN.exec(input.trim());
  if (!match) throw new InvalidNoteError(input);
  return {
    letter: match[1].toUpperCase() as Letter,
    alter: accidentalsToAlter(match[2]),
  };
}

export function formatNote(note: Note): string {
  return note.letter + alterToAccidentals(note.alter);
}

/** Clase de altura 0-11 (C=0). Dos notas enarmónicas comparten pitch class. */
export function pitchClass(note: Note): number {
  return (((LETTER_SEMITONES[note.letter] + note.alter) % 12) + 12) % 12;
}

export function letterIndex(letter: Letter): number {
  return LETTERS.indexOf(letter);
}

/** Dos notas suenan igual aunque se escriban distinto (F# / Gb). */
export function isEnharmonic(a: Note, b: Note): boolean {
  return pitchClass(a) === pitchClass(b);
}

/**
 * Distancia entre dos notas, en los dos ejes que importan.
 *
 * `letters` es cuántos escalones diatónicos hay que subir (0-6) y `semitones`
 * cuántos semitonos (0-11). Aplicar ambos es lo que preserva la ortografía.
 */
export interface Interval {
  letters: number;
  semitones: number;
}

export function intervalBetween(from: Note, to: Note): Interval {
  return {
    letters: (((letterIndex(to.letter) - letterIndex(from.letter)) % 7) + 7) % 7,
    semitones: (((pitchClass(to) - pitchClass(from)) % 12) + 12) % 12,
  };
}

export function isUnison(interval: Interval): boolean {
  return interval.letters === 0 && interval.semitones === 0;
}

/**
 * Transporta una nota por un intervalo.
 *
 * La letra se mueve por escalones diatónicos y la alteración se calcula
 * después, como el ajuste necesario para alcanzar la altura correcta. Si el
 * resultado exigiera más de un doble sostenido/bemol, se reescribe con la
 * enarmónica más simple según `preference`.
 */
export function transposeNote(
  note: Note,
  interval: Interval,
  preference: AccidentalPreference = 'sharp',
): Note {
  const targetLetter = LETTERS[(letterIndex(note.letter) + interval.letters) % 7];
  const targetPitch = (pitchClass(note) + interval.semitones) % 12;

  // Diferencia mínima con signo entre la letra destino y la altura buscada.
  let alter = targetPitch - LETTER_SEMITONES[targetLetter];
  if (alter > 6) alter -= 12;
  if (alter < -6) alter += 12;

  if (Math.abs(alter) <= 2) return { letter: targetLetter, alter };
  return respell(targetPitch, preference);
}

/** Grafías canónicas para cada clase de altura, por preferencia. */
const SHARP_SPELLING: readonly string[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];
const FLAT_SPELLING: readonly string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

/** Reescribe una altura con la grafía más simple disponible. */
export function respell(pitch: number, preference: AccidentalPreference = 'sharp'): Note {
  const table = preference === 'flat' ? FLAT_SPELLING : SHARP_SPELLING;
  return parseNote(table[((pitch % 12) + 12) % 12]);
}
