import type { Song } from './model';

/** Identificador estable, con respaldo para entornos sin `crypto.randomUUID`. */
export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${random}`;
}

/**
 * Canción vacía.
 *
 * El ámbito por defecto es `internal` a propósito: publicar es una decisión
 * consciente, no lo que ocurre por olvido. Y los derechos arrancan como
 * `reference`, el estado más restrictivo, para que nadie redistribuya por no
 * haber tocado el campo.
 */
export function emptySong(): Song {
  return {
    id: newId('song'),
    title: '',
    artist: null,
    composer: null,
    language: 'es',
    bpm: null,
    meter: '4/4',
    originalKey: 'C',
    currentKey: 'C',
    body: '# Verso 1\n',
    notes: null,
    difficulty: null,
    tags: [],
    instruments: [],
    instrumentParts: [],
    voices: [],
    vocalistKeys: [],
    resources: [],
    versions: [],
    rights: { status: 'reference', holder: null, notes: null },
    scope: 'internal',
  };
}
