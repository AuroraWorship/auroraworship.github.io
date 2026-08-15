/**
 * Capa de acceso a datos.
 *
 * La UI habla siempre con esta interfaz, nunca con un backend concreto. Hoy
 * la respalda un almacén clave-valor local (IndexedDB); mañana uno contra
 * base de datos cloud, sin tocar las pantallas (ADR-004).
 *
 * Dos responsabilidades viven aquí y no en las pantallas:
 *  - Filtrar por ámbito de visibilidad (ADR-005).
 *  - Exigir permiso antes de escribir. Una pantalla que olvide comprobarlo no
 *    puede saltarse la regla, porque el repositorio la aplica igualmente.
 */

import type { Id, Member, Service, Setlist, Song, Tutorial } from '../domain/model';
import { lyricsOf, parseSongBody } from '../domain/music/song-body';
import { type Actor, type Permission, can, canView } from '../domain/rbac/roles';
import { SEED_SERVICES, SEED_SETLISTS, SEED_SONGS, SEED_TUTORIALS } from './seed';
import { type KeyValueStore, MemoryStore, createDefaultStore } from './store';

export interface SongQuery {
  /** Busca en título, artista, etiquetas y letra. */
  text?: string;
  key?: string;
  instrument?: string;
  tag?: string;
}

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Acción no permitida: falta el permiso "${permission}".`);
    this.name = 'PermissionError';
  }
}

export interface AuroraRepository {
  listSongs(actor: Actor, query?: SongQuery): Promise<readonly Song[]>;
  getSong(actor: Actor, id: Id): Promise<Song | null>;
  saveSong(actor: Actor, song: Song): Promise<Song>;
  deleteSong(actor: Actor, id: Id): Promise<void>;
  listSetlists(actor: Actor): Promise<readonly Setlist[]>;
  getSetlist(actor: Actor, id: Id): Promise<Setlist | null>;
  listServices(actor: Actor): Promise<readonly Service[]>;
  saveService(actor: Actor, service: Service): Promise<Service>;
  listTutorials(actor: Actor): Promise<readonly Tutorial[]>;
  listMembers(actor: Actor): Promise<readonly Member[]>;
  getMember(actor: Actor, id: Id): Promise<Member | null>;
  saveMember(actor: Actor, member: Member): Promise<Member>;
  deleteMember(actor: Actor, id: Id): Promise<void>;
}

/** Filtro de visibilidad aplicado en el repositorio, no en la vista. */
function visible<T extends { scope: Parameters<typeof canView>[1] }>(
  actor: Actor,
  items: readonly T[],
): readonly T[] {
  return items.filter((item) => canView(actor, item.scope));
}

function require(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new PermissionError(permission);
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

const KEYS = {
  songs: 'songs',
  setlists: 'setlists',
  services: 'services',
  tutorials: 'tutorials',
  members: 'members',
} as const;

/**
 * El ministerio arranca sin integrantes a propósito.
 *
 * No se inventa gente: la lista la carga Aurora con sus nombres reales.
 */
const SEED_MEMBERS: readonly Member[] = [];

/**
 * Repositorio sobre almacenamiento clave-valor.
 *
 * La primera vez que se pide una colección que no existe, se siembra con los
 * datos de arranque y se guarda. A partir de ahí manda lo guardado: si el
 * usuario borra una canción semilla, no reaparece.
 */
export class StoredRepository implements AuroraRepository {
  constructor(private readonly store: KeyValueStore) {}

  private async collection<T>(key: string, seed: readonly T[]): Promise<T[]> {
    const stored = await this.store.get<T[]>(key);
    if (stored !== null) return stored;
    const initial = structuredClone(seed) as T[];
    await this.store.set(key, initial);
    return initial;
  }

  async listSongs(actor: Actor, query: SongQuery = {}): Promise<readonly Song[]> {
    require(actor, 'song:read');
    const songs = await this.collection<Song>(KEYS.songs, SEED_SONGS);
    return visible(actor, songs)
      .filter((song) => matches(song, query))
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }

  async getSong(actor: Actor, id: Id): Promise<Song | null> {
    require(actor, 'song:read');
    const songs = await this.collection<Song>(KEYS.songs, SEED_SONGS);
    return visible(actor, songs).find((s) => s.id === id) ?? null;
  }

  async saveSong(actor: Actor, song: Song): Promise<Song> {
    require(actor, 'song:write');
    const songs = await this.collection<Song>(KEYS.songs, SEED_SONGS);
    const index = songs.findIndex((s) => s.id === song.id);
    if (index >= 0) songs[index] = song;
    else songs.push(song);
    await this.store.set(KEYS.songs, songs);
    return song;
  }

  async deleteSong(actor: Actor, id: Id): Promise<void> {
    require(actor, 'song:delete');
    const songs = await this.collection<Song>(KEYS.songs, SEED_SONGS);
    await this.store.set(
      KEYS.songs,
      songs.filter((s) => s.id !== id),
    );
  }

  async listSetlists(actor: Actor): Promise<readonly Setlist[]> {
    require(actor, 'setlist:read');
    return visible(actor, await this.collection<Setlist>(KEYS.setlists, SEED_SETLISTS));
  }

  async getSetlist(actor: Actor, id: Id): Promise<Setlist | null> {
    require(actor, 'setlist:read');
    const setlists = await this.collection<Setlist>(KEYS.setlists, SEED_SETLISTS);
    return visible(actor, setlists).find((s) => s.id === id) ?? null;
  }

  async listServices(actor: Actor): Promise<readonly Service[]> {
    require(actor, 'service:read');
    return visible(actor, await this.collection<Service>(KEYS.services, SEED_SERVICES));
  }

  async saveService(actor: Actor, service: Service): Promise<Service> {
    require(actor, 'service:write');
    const services = await this.collection<Service>(KEYS.services, SEED_SERVICES);
    const index = services.findIndex((s) => s.id === service.id);
    if (index >= 0) services[index] = service;
    else services.push(service);
    await this.store.set(KEYS.services, services);
    return service;
  }

  async listTutorials(actor: Actor): Promise<readonly Tutorial[]> {
    require(actor, 'tutorial:read');
    return visible(actor, await this.collection<Tutorial>(KEYS.tutorials, SEED_TUTORIALS));
  }

  async listMembers(actor: Actor): Promise<readonly Member[]> {
    require(actor, 'member:read');
    const members = await this.collection<Member>(KEYS.members, SEED_MEMBERS);
    return members.slice().sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
  }

  async getMember(actor: Actor, id: Id): Promise<Member | null> {
    require(actor, 'member:read');
    const members = await this.collection<Member>(KEYS.members, SEED_MEMBERS);
    return members.find((m) => m.id === id) ?? null;
  }

  async saveMember(actor: Actor, member: Member): Promise<Member> {
    require(actor, 'member:write');
    const members = await this.collection<Member>(KEYS.members, SEED_MEMBERS);
    const index = members.findIndex((m) => m.id === member.id);
    if (index >= 0) members[index] = member;
    else members.push(member);
    await this.store.set(KEYS.members, members);
    return member;
  }

  async deleteMember(actor: Actor, id: Id): Promise<void> {
    require(actor, 'member:write');
    const members = await this.collection<Member>(KEYS.members, SEED_MEMBERS);
    await this.store.set(
      KEYS.members,
      members.filter((m) => m.id !== id),
    );
  }
}

/** Repositorio en memoria, para pruebas. */
export class InMemoryRepository extends StoredRepository {
  constructor() {
    super(new MemoryStore());
  }
}

export const repository: AuroraRepository = new StoredRepository(createDefaultStore());
