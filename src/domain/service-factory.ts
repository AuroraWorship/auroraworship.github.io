import { PENDING, type Service, type Setlist, type SetlistEntry } from './model';
import { newId } from './song-factory';

/**
 * Un servicio nuevo trae su propio repertorio.
 *
 * Cada servicio necesita su lista: el orden, las tonalidades y quién canta
 * cambian de una fecha a otra. Compartir una sola lista entre todos haría que
 * planificar el sábado siguiente pisara el anterior — y con él, el historial
 * de lo que realmente se tocó.
 */
export function emptyService(event = ''): { service: Service; setlist: Setlist } {
  const setlist: Setlist = {
    id: newId('setlist'),
    name: event || 'Repertorio del servicio',
    kind: 'service',
    entries: [],
    scope: 'internal',
  };

  return {
    setlist,
    service: {
      id: newId('service'),
      date: PENDING,
      event,
      setlistId: setlist.id,
      assignments: [],
      notes: null,
      scope: 'internal',
    },
  };
}

/**
 * Copia las canciones de un repertorio a otro.
 *
 * Repetir el repertorio del servicio anterior es lo que hace un ministerio la
 * mayoría de las semanas. Se copian canciones y tonalidades, pero NO quién
 * cantó: eso se decide cada vez.
 */
export function copyEntries(from: Setlist): readonly SetlistEntry[] {
  return [...from.entries]
    .sort((a, b) => a.order - b.order)
    .map((entry, i) => ({ ...entry, order: i + 1, leadVocalistId: null }));
}

/** Fecha del próximo sábado, el día habitual de servicio. */
export function nextSaturday(from: Date = new Date()): string {
  const date = new Date(from);
  const diff = (6 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}
