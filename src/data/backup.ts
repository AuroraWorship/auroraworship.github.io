/**
 * Copia y restauración de los datos del ministerio.
 *
 * Mientras no haya backend, los datos viven en el teléfono de cada persona y
 * no se sincronizan solos. Esto es el puente: el líder saca un archivo, lo
 * pasa por el medio que quiera, y el equipo lo importa.
 *
 * No es un sustituto de la sincronización — es lo que permite trabajar hasta
 * que llegue, y también la copia de seguridad de un repertorio que puede haber
 * costado meses de cargar.
 *
 * Los favoritos NO viajan: son personales de cada actor, y sobrescribir los de
 * otro no tendría sentido.
 */

import type { Course, Member, Rehearsal, Service, Setlist, Song, Tutorial } from '../domain/model';
import { type Actor, can } from '../domain/rbac/roles';
import { PermissionError } from './repository';
import type { KeyValueStore } from './store';

/** Versión del formato. Se sube si el contenido deja de ser compatible. */
export const BACKUP_VERSION = 1;

export interface Backup {
  formato: 'aurora-worship';
  version: number;
  exportadoEl: string;
  datos: {
    songs: Song[];
    setlists: Setlist[];
    services: Service[];
    rehearsals: Rehearsal[];
    tutorials: Tutorial[];
    courses: Course[];
    members: Member[];
  };
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const COLECCIONES = [
  'songs', 'setlists', 'services', 'rehearsals', 'tutorials', 'courses', 'members',
] as const;

export async function exportBackup(actor: Actor, store: KeyValueStore): Promise<Backup> {
  if (!can(actor, 'data:export')) throw new PermissionError('data:export');

  const datos = {} as Backup['datos'];
  for (const clave of COLECCIONES) {
    datos[clave] = ((await store.get(clave)) ?? []) as never;
  }

  return {
    formato: 'aurora-worship',
    version: BACKUP_VERSION,
    exportadoEl: new Date().toISOString(),
    datos,
  };
}

/**
 * Valida una copia antes de tocar nada.
 *
 * Importar sobrescribe el trabajo de todo el ministerio, así que un archivo
 * equivocado no puede llegar a la mitad del proceso: o entra entero o no entra.
 */
export function parseBackup(raw: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new BackupError('El archivo no es un JSON válido.');
  }

  if (typeof json !== 'object' || json === null) {
    throw new BackupError('El archivo no tiene el formato esperado.');
  }

  const candidato = json as Partial<Backup>;

  if (candidato.formato !== 'aurora-worship') {
    throw new BackupError('Este archivo no es una copia de Aurora Worship.');
  }

  if (typeof candidato.version !== 'number' || candidato.version > BACKUP_VERSION) {
    throw new BackupError(
      `La copia usa la versión ${String(candidato.version)} y esta aplicación entiende hasta la ${BACKUP_VERSION}. Actualiza la aplicación.`,
    );
  }

  if (typeof candidato.datos !== 'object' || candidato.datos === null) {
    throw new BackupError('La copia no contiene datos.');
  }

  for (const clave of COLECCIONES) {
    const valor = (candidato.datos as Record<string, unknown>)[clave];
    if (valor !== undefined && !Array.isArray(valor)) {
      throw new BackupError(`La colección "${clave}" está corrupta.`);
    }
  }

  return candidato as Backup;
}

export interface ImportSummary {
  songs: number;
  setlists: number;
  services: number;
  rehearsals: number;
  tutorials: number;
  courses: number;
  members: number;
}

export async function importBackup(
  actor: Actor,
  store: KeyValueStore,
  backup: Backup,
): Promise<ImportSummary> {
  if (!can(actor, 'data:import')) throw new PermissionError('data:import');

  const resumen = {} as ImportSummary;
  for (const clave of COLECCIONES) {
    const items = backup.datos[clave] ?? [];
    await store.set(clave, items);
    resumen[clave] = items.length;
  }
  return resumen;
}

/** Cuenta qué trae una copia, para poder avisar antes de sobrescribir. */
export function summarize(backup: Backup): ImportSummary {
  const resumen = {} as ImportSummary;
  for (const clave of COLECCIONES) {
    resumen[clave] = (backup.datos[clave] ?? []).length;
  }
  return resumen;
}

/** Nombre de archivo con la fecha, para que las copias no se pisen. */
export function backupFilename(date: Date = new Date()): string {
  return `aurora-worship-${date.toISOString().slice(0, 10)}.json`;
}
