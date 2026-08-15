import type { Rehearsal, RehearsalBlock } from './model';
import { newId } from './song-factory';

/**
 * Estructura de ensayo por defecto.
 *
 * Refleja la del manual de Aurora — oración, preparación, ejercicios,
 * repertorio, revisión y cierre — pero se copia dentro de cada ensayo al
 * crearlo, de modo que cambiarla en uno no toca los demás. Es una plantilla,
 * no una regla del software.
 */
export const DEFAULT_BLOCKS: readonly RehearsalBlock[] = [
  { title: 'Oración y reflexión', minutes: 20, description: 'Abrir el ensayo buscando a Dios, no el sonido.' },
  { title: 'Preparación', minutes: 15, description: 'Montaje, afinación y prueba de sonido.' },
  { title: 'Ejercicios', minutes: 20, description: 'Técnica, vocalización y tiempo.' },
  { title: 'Repertorio', minutes: 45, description: 'Canciones del próximo servicio.' },
  { title: 'Revisión', minutes: 15, description: 'Qué salió, qué falta, quién repasa qué.' },
  { title: 'Cierre', minutes: 5, description: 'Acuerdos y oración final.' },
];

export function totalMinutes(blocks: readonly RehearsalBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.minutes, 0);
}

/** Formatea una duración en minutos como "2 h" o "1 h 45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Próximo miércoles, que es cuando Aurora ensaya según su manual.
 *
 * Es solo el valor inicial del formulario: la fecha se puede cambiar, y no se
 * guarda ningún ensayo que el ministerio no haya creado.
 */
export function nextWednesday(from: Date = new Date()): string {
  const date = new Date(from);
  const diff = (3 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

export function emptyRehearsal(): Rehearsal {
  return {
    id: newId('rehearsal'),
    date: nextWednesday(),
    startTime: '16:00',
    endTime: '18:00',
    blocks: structuredClone(DEFAULT_BLOCKS) as RehearsalBlock[],
    setlistId: null,
    assignments: [],
    scope: 'internal',
  };
}
