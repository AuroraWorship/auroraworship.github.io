/**
 * Transposición de alto nivel: de tonalidad a tonalidad.
 *
 * Es la puerta que usa la UI. Recibe tonalidades ("G" → "A") en vez de
 * intervalos, y elige sola la grafía (sostenidos o bemoles) según la
 * tonalidad de destino.
 */

import { type Interval } from './note';
import { type Chord, transposeChord } from './chord';
import { type Key, accidentalPreferenceFor, intervalBetweenKeys, parseKey } from './key';
import { type SongBody, transposeSongBody } from './song-body';

export interface TransposeRequest {
  from: Key;
  to: Key;
}

function planOf(request: TransposeRequest): { interval: Interval; preference: ReturnType<typeof accidentalPreferenceFor> } {
  return {
    interval: intervalBetweenKeys(request.from, request.to),
    preference: accidentalPreferenceFor(request.to),
  };
}

export function transposeBodyToKey(body: SongBody, request: TransposeRequest): SongBody {
  const { interval, preference } = planOf(request);
  return transposeSongBody(body, interval, preference);
}

export function transposeChordToKey(chord: Chord, request: TransposeRequest): Chord {
  const { interval, preference } = planOf(request);
  return transposeChord(chord, interval, preference);
}

/** Versión con tonalidades en texto, cómoda para la UI y para pruebas. */
export function transposeBody(body: SongBody, from: string, to: string): SongBody {
  return transposeBodyToKey(body, { from: parseKey(from), to: parseKey(to) });
}
