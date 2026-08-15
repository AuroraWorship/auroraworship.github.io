/**
 * Motor de acordes.
 *
 * Un acorde se guarda estructurado (raíz, calidad, extensión, alteraciones,
 * bajo) pero conserva además su sufijo textual original. La transposición
 * reescribe únicamente raíz y bajo: el sufijo viaja intacto. Así "Cmaj7#11"
 * transpuesto sigue siendo un maj7#11 y no un acorde reinterpretado por
 * nosotros.
 */

import {
  type AccidentalPreference,
  type Interval,
  type Note,
  formatNote,
  isUnison,
  parseNote,
  transposeNote,
} from './note';

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'dominant'
  | 'diminished'
  | 'half-diminished'
  | 'augmented'
  | 'suspended'
  | 'power';

export type Suspension = 'sus2' | 'sus4';

export interface Chord {
  root: Note;
  quality: ChordQuality;
  /** Extensión principal: '6', '7', '9', '11', '13', 'maj7'… */
  extension: string | null;
  /** Alteraciones sobre la extensión: 'b5', '#9', 'b13'… */
  alterations: string[];
  /** Notas añadidas sin acumular la serie: 'add9', 'add11'… */
  additions: string[];
  suspension: Suspension | null;
  /** Bajo de un slash chord (D en "Bb/D"), si lo hay. */
  bass: Note | null;
  /** Sufijo tal cual venía escrito, sin raíz ni bajo. */
  suffix: string;
  /** Texto original completo, para poder devolverlo sin tocar. */
  raw: string;
}

export class InvalidChordError extends Error {
  constructor(input: string) {
    super(`Acorde no reconocido: "${input}"`);
    this.name = 'InvalidChordError';
  }
}

const CHORD_PATTERN = /^([A-Ga-g](?:#|b|♯|♭|x)*)([^/]*)(?:\/([A-Ga-g](?:#|b|♯|♭|x)*))?$/;

/**
 * Piezas admitidas dentro de un sufijo, de más larga a más corta.
 *
 * Sin esta lista blanca cualquier palabra que empiece por A-G se colaría como
 * acorde: "Coro" se leería como un C con sufijo "oro". Y eso importa de
 * verdad, porque el cuerpo de la canción decide qué hay dentro de cada
 * corchete preguntando precisamente si es un acorde.
 */
const SUFFIX_TOKENS: readonly string[] = [
  'maj', 'Maj', 'MAJ', 'min', 'Min', 'sus', 'add', 'dim', 'aug', 'alt',
  'M', 'm', 'Δ', 'ø', '°', '-', '+', '#', 'b', '♯', '♭', '(', ')', ',', ' ',
];

function isValidSuffix(suffix: string): boolean {
  let rest = suffix;
  outer: while (rest.length > 0) {
    if (/^\d/.test(rest)) {
      rest = rest.replace(/^\d+/, '');
      continue;
    }
    for (const token of SUFFIX_TOKENS) {
      if (rest.startsWith(token)) {
        rest = rest.slice(token.length);
        continue outer;
      }
    }
    return false;
  }
  return true;
}

/**
 * Detecta la calidad a partir del sufijo.
 *
 * El orden importa: "maj7" debe examinarse antes que "m", y "m7b5" antes que
 * "m", porque los prefijos se solapan.
 */
function detectQuality(suffix: string): ChordQuality {
  const s = suffix;
  if (/^(m|min|-)?7?(b5|°|dim)/i.test(s) && /(°|dim|m7b5|min7b5|-7b5|ø)/i.test(s)) {
    return /m7b5|min7b5|-7b5|ø/i.test(s) ? 'half-diminished' : 'diminished';
  }
  if (/^(dim|°)/i.test(s)) return 'diminished';
  if (/^(aug|\+)/i.test(s)) return 'augmented';
  if (/^5$/.test(s)) return 'power';
  if (/^(maj|Maj|M|Δ)/.test(s) && !/^m(?!aj|Maj)/.test(s)) return 'major';
  if (/^(m|min|-)(?!aj)/i.test(s)) return 'minor';
  if (/^(sus)/i.test(s)) return 'suspended';
  if (/^\d/.test(s)) return 'dominant';
  if (s === '') return 'major';
  return 'major';
}

function detectExtension(suffix: string): string | null {
  const maj = /(maj|Maj|M|Δ)(6|7|9|11|13)/.exec(suffix);
  if (maj) return `maj${maj[2]}`;
  const plain = /(?:^|[^b#adds])(6\/9|13|11|9|7|6)/.exec(suffix);
  if (plain) return plain[1];
  return null;
}

function detectAlterations(suffix: string): string[] {
  return [...suffix.matchAll(/([b#♭♯])(5|9|11|13)/g)]
    .map((m) => `${m[1] === '♭' ? 'b' : m[1] === '♯' ? '#' : m[1]}${m[2]}`)
    // "b5" dentro de "m7b5" ya queda descrito por la calidad half-diminished,
    // pero se conserva igualmente: describe el acorde, no lo duplica.
    .filter((alt, i, all) => all.indexOf(alt) === i);
}

function detectAdditions(suffix: string): string[] {
  return [...suffix.matchAll(/add(\d+)/gi)].map((m) => `add${m[1]}`);
}

function detectSuspension(suffix: string): Suspension | null {
  if (/sus2/i.test(suffix)) return 'sus2';
  if (/sus4/i.test(suffix)) return 'sus4';
  if (/sus(?!\d)/i.test(suffix)) return 'sus4'; // "sus" a secas es sus4 por convención
  return null;
}

export function parseChord(input: string): Chord {
  const raw = input.trim();
  const match = CHORD_PATTERN.exec(raw);
  if (!match) throw new InvalidChordError(input);

  const [, rootText, suffix, bassText] = match;
  if (!isValidSuffix(suffix)) throw new InvalidChordError(input);
  const root = parseNote(rootText);
  const bass = bassText ? parseNote(bassText) : null;

  return {
    root,
    quality: detectQuality(suffix),
    extension: detectExtension(suffix),
    alterations: detectAlterations(suffix),
    additions: detectAdditions(suffix),
    suspension: detectSuspension(suffix),
    bass,
    suffix,
    raw,
  };
}

export function tryParseChord(input: string): Chord | null {
  try {
    return parseChord(input);
  } catch {
    return null;
  }
}

/** Comprueba si un token parece un acorde sin lanzar excepción. */
export function isChord(input: string): boolean {
  return tryParseChord(input) !== null;
}

export function formatChord(chord: Chord): string {
  const base = formatNote(chord.root) + chord.suffix;
  return chord.bass ? `${base}/${formatNote(chord.bass)}` : base;
}

/**
 * Transporta un acorde. Sufijo, alteraciones y extensiones no se tocan:
 * solo cambian de altura la raíz y el bajo.
 */
export function transposeChord(
  chord: Chord,
  interval: Interval,
  preference: AccidentalPreference = 'sharp',
): Chord {
  if (isUnison(interval)) return chord;
  const root = transposeNote(chord.root, interval, preference);
  const bass = chord.bass ? transposeNote(chord.bass, interval, preference) : null;
  const next: Chord = { ...chord, root, bass };
  return { ...next, raw: formatChord(next) };
}

/** Atajo de texto a texto, útil en UI y en pruebas. */
export function transposeChordSymbol(
  symbol: string,
  interval: Interval,
  preference: AccidentalPreference = 'sharp',
): string {
  return formatChord(transposeChord(parseChord(symbol), interval, preference));
}
