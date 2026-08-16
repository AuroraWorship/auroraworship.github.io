/**
 * Notas que componen un acorde.
 *
 * `chord.ts` guarda el acorde como estructura (raíz, calidad, extensión,
 * alteraciones) pero no dice qué suena. Aquí se traduce esa estructura a
 * distancias en semitonos sobre la fundamental, que es lo que necesitan tanto
 * el diagrama de digitación como la reproducción del acorde.
 *
 * Cada nota lleva además dos datos que el buscador de digitaciones necesita
 * para decidir bien: qué papel cumple (fundamental, tercera, quinta…) y si se
 * puede omitir. En la guitarra rara vez caben todas las notas bajo la mano, y
 * omitir la quinta de un Cmaj9 es normal; omitir la tercera lo convierte en
 * otro acorde.
 */

import type { Chord } from './chord';

export type ToneRole = 'root' | 'third' | 'fifth' | 'seventh' | 'extension';

export interface ChordTone {
  /** Distancia en semitonos sobre la fundamental, 0-11. */
  semitones: number;
  role: ToneRole;
  /** Verdadero si la nota puede omitirse sin desvirtuar el acorde. */
  optional: boolean;
}

/** Tríada base de cada calidad, sin extensiones. */
const TRIADS: Record<Chord['quality'], readonly (readonly [number, ToleratedRole])[]> = {
  major: [
    [0, 'root'],
    [4, 'third'],
    [7, 'fifth'],
  ],
  minor: [
    [0, 'root'],
    [3, 'third'],
    [7, 'fifth'],
  ],
  dominant: [
    [0, 'root'],
    [4, 'third'],
    [7, 'fifth'],
  ],
  diminished: [
    [0, 'root'],
    [3, 'third'],
    [6, 'fifth'],
  ],
  'half-diminished': [
    [0, 'root'],
    [3, 'third'],
    [6, 'fifth'],
  ],
  augmented: [
    [0, 'root'],
    [4, 'third'],
    [8, 'fifth'],
  ],
  suspended: [
    [0, 'root'],
    [7, 'fifth'],
  ],
  power: [
    [0, 'root'],
    [7, 'fifth'],
  ],
};

type ToleratedRole = ToneRole;

/** Séptima que implica cada calidad cuando el sufijo pide una. */
const SEVENTH_BY_QUALITY: Partial<Record<Chord['quality'], number>> = {
  dominant: 10,
  minor: 10,
  major: 10,
  diminished: 9,
  'half-diminished': 10,
  augmented: 10,
  suspended: 10,
};

/** Semitonos que añade cada grado por encima de la octava. */
const EXTENSION_DEGREES: Record<string, number> = {
  '9': 2,
  '11': 5,
  '13': 9,
};

/** Alteraciones que reemplazan la quinta en vez de añadir una nota. */
const FIFTH_ALTERATIONS: Record<string, number> = {
  b5: 6,
  '#5': 8,
  '+5': 8,
};

/** Alteraciones que añaden una tensión propia. */
const TENSION_ALTERATIONS: Record<string, number> = {
  b9: 1,
  '#9': 3,
  '#11': 6,
  b13: 8,
};

/** Notas añadidas sin arrastrar la serie de séptima y novena. */
const ADDITIONS: Record<string, number> = {
  add2: 2,
  add9: 2,
  add4: 5,
  add11: 5,
  add6: 9,
  add13: 9,
};

function normalize(token: string): string {
  return token.toLowerCase().replace('♭', 'b').replace('♯', '#');
}

/**
 * Notas del acorde, ordenadas de grave a agudo dentro de la octava.
 *
 * No se devuelven octavas concretas: un acorde es un conjunto de clases de
 * altura, y decidir en qué octava cae cada nota es trabajo del instrumento.
 */
export function chordTones(chord: Chord): ChordTone[] {
  const tones = new Map<number, ChordTone>();

  const add = (semitones: number, role: ToneRole, optional: boolean): void => {
    const pitch = ((semitones % 12) + 12) % 12;
    const previous = tones.get(pitch);
    // Si dos grados caen en la misma tecla, manda el más esencial.
    if (previous && (!previous.optional || optional)) return;
    tones.set(pitch, { semitones: pitch, role, optional });
  };

  for (const [semitones, role] of TRIADS[chord.quality]) {
    // La quinta justa se puede soltar; la alterada es el color del acorde.
    add(semitones, role, role === 'fifth' && semitones === 7);
  }

  if (chord.suspension) {
    add(chord.suspension === 'sus2' ? 2 : 5, 'third', false);
  }

  const suffix = normalize(chord.suffix);
  const extension = chord.extension ? normalize(chord.extension) : null;

  // La séptima mayor se escribe aparte porque no depende de la calidad.
  if (extension === 'maj7' || suffix.includes('maj7') || suffix.includes('maj9')) {
    add(11, 'seventh', false);
  } else if (extension && extension !== '6') {
    const seventh = SEVENTH_BY_QUALITY[chord.quality];
    if (seventh !== undefined) add(seventh, 'seventh', false);
  }

  if (extension === '6' || suffix.includes('6')) {
    add(9, 'extension', false);
  }

  // Un acorde de novena arrastra la séptima; uno de trecena, todo lo de abajo.
  if (extension && extension in EXTENSION_DEGREES) {
    const ceiling = Number(extension);
    for (const [degree, semitones] of Object.entries(EXTENSION_DEGREES)) {
      if (Number(degree) <= ceiling) add(semitones, 'extension', Number(degree) < ceiling);
    }
  }

  for (const raw of chord.alterations) {
    const token = normalize(raw);
    const altered = FIFTH_ALTERATIONS[token];
    if (altered !== undefined) {
      tones.delete(7);
      add(altered, 'fifth', false);
      continue;
    }
    const tension = TENSION_ALTERATIONS[token];
    if (tension !== undefined) add(tension, 'extension', false);
  }

  for (const raw of chord.additions) {
    const semitones = ADDITIONS[normalize(raw)];
    if (semitones !== undefined) add(semitones, 'extension', false);
  }

  return [...tones.values()].sort((a, b) => a.semitones - b.semitones);
}

/** Clases de altura absolutas (0-11) del acorde, con la fundamental incluida. */
export function chordPitchClasses(chord: Chord, rootPitch: number): number[] {
  return chordTones(chord).map((tone) => (rootPitch + tone.semitones) % 12);
}
