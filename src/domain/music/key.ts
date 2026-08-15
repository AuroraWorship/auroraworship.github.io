/**
 * Tonalidades.
 *
 * Aurora distingue siempre entre la tonalidad ORIGINAL de una canción y la
 * tonalidad en la que el equipo la toca, que además puede variar por
 * vocalista. Este módulo es el que traduce "de G a A" en un intervalo.
 */

import {
  type AccidentalPreference,
  type Interval,
  type Note,
  formatNote,
  intervalBetween,
  parseNote,
  pitchClass,
} from './note';

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: Note;
  mode: Mode;
}

export class InvalidKeyError extends Error {
  constructor(input: string) {
    super(`Tonalidad no reconocida: "${input}"`);
    this.name = 'InvalidKeyError';
  }
}

const KEY_PATTERN = /^([A-Ga-g](?:#|b|♯|♭)*)\s*(m|min|minor|menor)?$/i;

export function parseKey(input: string): Key {
  const match = KEY_PATTERN.exec(input.trim());
  if (!match) throw new InvalidKeyError(input);
  return {
    tonic: parseNote(match[1]),
    mode: match[2] ? 'minor' : 'major',
  };
}

export function tryParseKey(input: string): Key | null {
  try {
    return parseKey(input);
  } catch {
    return null;
  }
}

export function formatKey(key: Key): string {
  return formatNote(key.tonic) + (key.mode === 'minor' ? 'm' : '');
}

export function keysEqual(a: Key, b: Key): boolean {
  return a.mode === b.mode && pitchClass(a.tonic) === pitchClass(b.tonic);
}

/**
 * Intervalo que lleva de una tonalidad a otra.
 *
 * Solo se compara la tónica: transponer de Am a Bm y de C a D es exactamente
 * el mismo desplazamiento, y el modo se conserva por definición.
 */
export function intervalBetweenKeys(from: Key, to: Key): Interval {
  return intervalBetween(from.tonic, to.tonic);
}

/**
 * Tonalidades que se escriben con bemoles.
 *
 * Determina la grafía preferida al transponer: en Eb queremos ver Ab, no G#.
 */
const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']);
const FLAT_MINOR_KEYS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']);

export function accidentalPreferenceFor(key: Key): AccidentalPreference {
  const tonic = formatNote(key.tonic);
  if (tonic.includes('b')) return 'flat';
  if (tonic.includes('#')) return 'sharp';
  const table = key.mode === 'minor' ? FLAT_MINOR_KEYS : FLAT_MAJOR_KEYS;
  return table.has(tonic) ? 'flat' : 'sharp';
}

/** Las 12 tonalidades mayores y menores usables en el selector de la UI. */
export const COMMON_MAJOR_KEYS: readonly string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
];

export const COMMON_MINOR_KEYS: readonly string[] = [
  'Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m',
];

export function commonKeysFor(mode: Mode): readonly string[] {
  return mode === 'minor' ? COMMON_MINOR_KEYS : COMMON_MAJOR_KEYS;
}

/** Distancia en semitonos, con signo, para mostrar "+2" o "-3" en la UI. */
export function semitoneOffset(from: Key, to: Key): number {
  const raw = (((pitchClass(to.tonic) - pitchClass(from.tonic)) % 12) + 12) % 12;
  return raw > 6 ? raw - 12 : raw;
}
