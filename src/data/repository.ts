/**
 * Capa de acceso a datos.
 *
 * La UI habla siempre con esta interfaz, nunca con un backend concreto. Hoy
 * hay una implementación en memoria alimentada por `seed.ts`; mañana entra
 * una contra base de datos cloud sin tocar las pantallas. Es la decisión que
 * mantiene reversible el resto de la arquitectura (ver DECISIONS.md ADR-004).
 */

import type { Id, Service, Setlist, Song, Tutorial } from '../domain/model';
import { lyricsOf, parseSongBody } from '../domain/music/song-body';
import type { Actor } from '../domain/rbac/roles';
import { canView } from '../domain/rbac/roles';
import { SEED_SERVICES, SEED_SETLISTS, SEED_SONGS, SEED_TUTORIALS } from './seed';

export interface SongQuery {
  /** Busca en título, artista, etiquetas y letra. */
  text?: string;
  key?: string;
  instrument?: string;
  tag?: string;
}

export interface AuroraRepository {
  listSongs(actor: Actor, query?: SongQuery): Promise<readonly Song[]>;
  getSong(actor: Actor, id: Id): Promise<Song | null>;
  listSetlists(actor: Actor): Promise<readonly Setlist[]>;
  getSetlist(actor: Actor, id: Id): Promise<Setlist | null>;
  listServices(actor: Actor): Promise<readonly Service[]>;
  listTutorials(actor: Actor): Promise<readonly Tutorial[]>;
}

/** Filtro de visibilidad aplicado en el repositorio, no en la vista. */
function visible<T extends { scope: Parameters<typeof canView>[1] }>(
  actor: Actor,
  items: readonly T[],
): readonly T[] {
  return items.filter((item) => canView(actor, item.scope));
}

function matches(song: Song, query: SongQuery): boolean {
  if (query.key && song.currentKey !== query.key && song.originalKey !== query.key) return false;
  if (query.instrument && !song.instruments.includes(query.instrument as never)) return false;
  if (query.tag && !song.tags.includes(query.tag)) return false;

  if (query.text) {
    const needle = query.text.toLowerCase().trim();
    if (!needle) return true;
    // Se busca sobre la letra limpia, no sobre el cuerpo crudo: ahí un
    // acorde parte las palabras ("omnipo[A]tente") y "omnipotente" no
    // aparecería nunca.
    const haystack = [
      song.title,
      song.artist ?? '',
      song.composer ?? '',
      song.tags.join(' '),
      lyricsOf(parseSongBody(song.body)),
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export class InMemoryRepository implements AuroraRepository {
  constructor(
    private readonly songs: readonly Song[] = SEED_SONGS,
    private readonly setlists: readonly Setlist[] = SEED_SETLISTS,
    private readonly services: readonly Service[] = SEED_SERVICES,
    private readonly tutorials: readonly Tutorial[] = SEED_TUTORIALS,
  ) {}

  async listSongs(actor: Actor, query: SongQuery = {}): Promise<readonly Song[]> {
    return visible(actor, this.songs)
      .filter((song) => matches(song, query))
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  async getSong(actor: Actor, id: Id): Promise<Song | null> {
    return visible(actor, this.songs).find((s) => s.id === id) ?? null;
  }

  async listSetlists(actor: Actor): Promise<readonly Setlist[]> {
    return visible(actor, this.setlists);
  }

  async getSetlist(actor: Actor, id: Id): Promise<Setlist | null> {
    return visible(actor, this.setlists).find((s) => s.id === id) ?? null;
  }

  async listServices(actor: Actor): Promise<readonly Service[]> {
    return visible(actor, this.services);
  }

  async listTutorials(actor: Actor): Promise<readonly Tutorial[]> {
    return visible(actor, this.tutorials);
  }
}

export const repository: AuroraRepository = new InMemoryRepository();
