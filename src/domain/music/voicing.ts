/**
 * Digitaciones de un acorde sobre un instrumento concreto.
 *
 * No hay ni una sola digitación guardada a mano. Se buscan a partir de las
 * notas del acorde y de la afinación del instrumento, y por eso funcionan
 * igual con un Am que con un Am7b5 o con cualquier cosa que aparezca dentro
 * de tres años. Guardar imágenes habría significado mantener un archivo
 * enorme y aun así quedarse corto en cuanto alguien escribiera un acorde raro.
 *
 * El buscador puntúa cada combinación posible y devuelve las mejores. Las
 * reglas de puntuación son las que usaría un guitarrista: que suene la
 * fundamental en el bajo, que no falte la tercera ni la séptima, que la mano
 * no tenga que abrirse más de cuatro trastes, y que no haya cuerdas muteadas
 * en medio de las que suenan, que es lo difícil de tocar limpio.
 */

import type { Chord } from './chord';
import { chordTones } from './chord-tones';
import { pitchClass } from './note';
import type { InstrumentId } from '../model';

/** Afinación al aire de un instrumento de cuerda, en notas MIDI. */
export interface Tuning {
  /** De la cuerda más grave a la más aguda, como se dibuja de arriba abajo. */
  strings: readonly number[];
  /** Cuántos trastes tiene sentido mostrar en el diagrama. */
  visibleFrets: number;
}

/**
 * Afinaciones estándar.
 *
 * Sólo los instrumentos donde una digitación significa algo. La batería, la
 * güira o el tambor alegre no tienen acordes, y pedir un diagrama para ellos
 * devuelve nada en vez de inventarse una respuesta.
 */
export const TUNINGS: Readonly<Record<string, Tuning>> = {
  'acoustic-guitar': { strings: [40, 45, 50, 55, 59, 64], visibleFrets: 5 },
  'electric-guitar': { strings: [40, 45, 50, 55, 59, 64], visibleFrets: 5 },
  bass: { strings: [28, 33, 38, 43], visibleFrets: 5 },
  ukulele: { strings: [67, 60, 64, 69], visibleFrets: 5 },
};

export function tuningFor(instrument: InstrumentId): Tuning | undefined {
  return TUNINGS[instrument];
}

/** Traste pisado, 0 al aire, o `null` si la cuerda no suena. */
export type FretChoice = number | null;

export interface Voicing {
  /** Un elemento por cuerda, de la más grave a la más aguda. */
  frets: readonly FretChoice[];
  /** Traste más bajo pisado. 0 si la postura es abierta. */
  baseFret: number;
  /** Cuanto más alto, mejor postura. Sólo sirve para ordenar. */
  score: number;
}

const MAX_POSITION = 12;
const MAX_SPAN = 3;

/** Nota MIDI que produce una cuerda pisada en un traste. */
function midiAt(openString: number, fret: number): number {
  return openString + fret;
}

/**
 * Trastes que, en esta cuerda y dentro de esta posición, dan una nota del
 * acorde. Siempre se ofrece además la opción de no tocar la cuerda.
 */
function candidatesForString(
  openString: number,
  pitches: ReadonlySet<number>,
  baseFret: number,
): FretChoice[] {
  const options: FretChoice[] = [null];

  // La cuerda al aire sirve en cualquier posición: no obliga a mover la mano.
  if (pitches.has(midiAt(openString, 0) % 12)) options.push(0);

  const from = Math.max(baseFret, 1);
  for (let fret = from; fret <= baseFret + MAX_SPAN; fret += 1) {
    if (pitches.has(midiAt(openString, fret) % 12)) options.push(fret);
  }

  return options;
}

interface Scored {
  frets: FretChoice[];
  baseFret: number;
  score: number;
}

/**
 * Puntúa una postura ya completa. Devuelve `null` si es inaceptable, para no
 * arrastrar candidatas que jamás se mostrarían.
 */
function scoreVoicing(
  frets: readonly FretChoice[],
  tuning: Tuning,
  rootPitch: number,
  bassPitch: number,
  essential: ReadonlySet<number>,
  all: ReadonlySet<number>,
): number | null {
  const sounding: { string: number; pitch: number; midi: number }[] = [];
  frets.forEach((fret, index) => {
    if (fret === null) return;
    const midi = midiAt(tuning.strings[index], fret);
    sounding.push({ string: index, pitch: midi % 12, midi });
  });

  // Un acorde con menos de tres notas no es un acorde, salvo en el bajo.
  const minimum = tuning.strings.length <= 4 && tuning.strings[0] < 40 ? 1 : 3;
  if (sounding.length < minimum) return null;

  const heard = new Set(sounding.map((note) => note.pitch));
  for (const pitch of essential) if (!heard.has(pitch)) return null;
  if (!heard.has(rootPitch)) return null;

  let score = 100;

  // Cada nota del acorde que sí suena suma; las que faltan ya no restan dos veces.
  for (const pitch of all) if (heard.has(pitch)) score += 6;

  // El bajo correcto es lo que más cambia el carácter del acorde.
  const lowest = sounding.reduce((a, b) => (a.midi <= b.midi ? a : b));
  if (lowest.pitch === bassPitch) score += 18;
  else if (lowest.pitch === rootPitch) score += 10;
  else score -= 12;

  const pressed = frets.filter((fret): fret is number => fret !== null && fret > 0);
  if (pressed.length > 0) {
    const span = Math.max(...pressed) - Math.min(...pressed);
    score -= span * 5;
    // Cuanto más arriba del mástil, menos cómoda y menos legible.
    score -= Math.min(...pressed);
  }

  // Muteadas: las de los extremos se perdonan, las de en medio no.
  const first = sounding[0].string;
  const last = sounding[sounding.length - 1].string;
  for (let i = first; i <= last; i += 1) {
    if (frets[i] === null) score -= 14;
  }
  score -= (tuning.strings.length - sounding.length) * 3;

  // Las cuerdas al aire suenan más llenas y se tocan mejor.
  score += frets.filter((fret) => fret === 0).length * 2;

  return score;
}

/**
 * Busca las mejores digitaciones del acorde en este instrumento.
 *
 * Devuelve como mucho `limit`, ordenadas de más a menos recomendable, y sin
 * repetir la misma postura encontrada desde dos posiciones distintas.
 */
export function findVoicings(chord: Chord, tuning: Tuning, limit = 4): Voicing[] {
  const rootPitch = pitchClass(chord.root);
  const bassPitch = chord.bass ? pitchClass(chord.bass) : rootPitch;

  const tones = chordTones(chord);
  const all = new Set(tones.map((tone) => (rootPitch + tone.semitones) % 12));
  const essential = new Set(
    tones.filter((tone) => !tone.optional).map((tone) => (rootPitch + tone.semitones) % 12),
  );

  const found: Scored[] = [];

  for (let baseFret = 0; baseFret <= MAX_POSITION; baseFret += 1) {
    const perString = tuning.strings.map((open) => candidatesForString(open, all, baseFret));

    const combo: FretChoice[] = new Array(tuning.strings.length).fill(null);

    const walk = (index: number): void => {
      if (index === tuning.strings.length) {
        const score = scoreVoicing(combo, tuning, rootPitch, bassPitch, essential, all);
        if (score !== null) {
          const pressed = combo.filter((f): f is number => f !== null && f > 0);
          found.push({
            frets: [...combo],
            baseFret: pressed.length > 0 ? Math.min(...pressed) : 0,
            score,
          });
        }
        return;
      }
      for (const option of perString[index]) {
        combo[index] = option;
        walk(index + 1);
      }
      combo[index] = null;
    };

    walk(0);
  }

  const seen = new Set<string>();
  return found
    .sort((a, b) => b.score - a.score)
    .filter((voicing) => {
      const key = voicing.frets.join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** Notas MIDI que suenan en una postura, de grave a agudo. */
export function voicingMidi(voicing: Voicing, tuning: Tuning): number[] {
  const notes: number[] = [];
  voicing.frets.forEach((fret, index) => {
    if (fret !== null) notes.push(midiAt(tuning.strings[index], fret));
  });
  return notes.sort((a, b) => a - b);
}

/**
 * Notas del acorde repartidas sobre un teclado, en posición cerrada.
 *
 * El piano no tiene digitaciones que buscar: se marca qué teclas se pulsan.
 * Se parte de la fundamental en la octava central y cada nota se coloca por
 * encima de la anterior, que es como se toca un acorde con la mano derecha.
 */
export function keyboardVoicing(chord: Chord, octave = 4): number[] {
  const rootPitch = pitchClass(chord.root);
  const bassPitch = chord.bass ? pitchClass(chord.bass) : null;
  const base = 12 * (octave + 1) + rootPitch;

  const notes = chordTones(chord).map((tone) => base + tone.semitones);

  if (bassPitch !== null && bassPitch !== rootPitch) {
    // El bajo del slash chord va debajo de todo, no dentro del acorde.
    let bass = 12 * octave + bassPitch;
    while (bass >= notes[0]) bass -= 12;
    notes.unshift(bass);
  }

  return notes;
}
