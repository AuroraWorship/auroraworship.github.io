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

import { PENDING } from '../domain/model';
import type {
  HistoryEntry,
  Id,
  Member,
  Rehearsal,
  Service,
  Setlist,
  Song,
  Tutorial,
} from '../domain/model';
import { lyricsOf, parseSongBody } from '../domain/music/song-body';
import { type Actor, type Permission, can, canView } from '../domain/rbac/roles';
import { SEED_SERVICES, SEED_SETLISTS, SEED_SONGS, SEED_TUTORIALS } from './seed';
import { type KeyValueStore, createDefaultStore } from './store';

export interface SongQuery {
  /** Busca en título, artista, etiquetas y letra. */
  text?: string;
  key?: string;
  instrument?: string;
  tag?: string;
  difficulty?: number;
  /** Filtra por quién canta la canción, según sus tonalidades registradas. */
  vocalistId?: string;
  /** Rango de tempo, para armar un bloque que no rompa la dinámica. */
  bpmMin?: number;
  bpmMax?: number;
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
  saveSetlist(actor: Actor, setlist: Setlist): Promise<Setlist>;
  listServices(actor: Actor): Promise<readonly Service[]>;
  getService(actor: Actor, id: Id): Promise<Service | null>;
  saveService(actor: Actor, service: Service): Promise<Service>;
  deleteService(actor: Actor, id: Id): Promise<void>;
  deleteSetlist(actor: Actor, id: Id): Promise<void>;
  listRehearsals(actor: Actor): Promise<readonly Rehearsal[]>;
  getRehearsal(actor: Actor, id: Id): Promise<Rehearsal | null>;
  saveRehearsal(actor: Actor, rehearsal: Rehearsal): Promise<Rehearsal>;
  deleteRehearsal(actor: Actor, id: Id): Promise<void>;
  listTutorials(actor: Actor): Promise<readonly Tutorial[]>;
  getTutorial(actor: Actor, id: Id): Promise<Tutorial | null>;
  saveTutorial(actor: Actor, tutorial: Tutorial): Promise<Tutorial>;
  deleteTutorial(actor: Actor, id: Id): Promise<void>;
  listHistory(actor: Actor, songId?: Id): Promise<readonly HistoryEntry[]>;
  addHistory(actor: Actor, entries: readonly HistoryEntry[]): Promise<number>;
  listFavorites(actor: Actor): Promise<readonly Id[]>;
  toggleFavorite(actor: Actor, songId: Id): Promise<readonly Id[]>;
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
  if (query.difficulty && song.difficulty !== query.difficulty) return false;
  if (query.vocalistId && !song.vocalistKeys.some((vk) => vk.memberId === query.vocalistId)) {
    return false;
  }
  // Una canción sin BPM no se cuela en un filtro de tempo: no sabemos si cabe.
  if (query.bpmMin !== undefined && (song.bpm === null || song.bpm < query.bpmMin)) return false;
  if (query.bpmMax !== undefined && (song.bpm === null || song.bpm > query.bpmMax)) return false;

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
  rehearsals: 'rehearsals',
  history: 'history',
} as const;

/**
 * El ministerio arranca sin integrantes a propósito.
 *
 * No se inventa gente: la lista la carga Aurora con sus nombres reales.
 */
const SEED_MEMBERS: readonly Member[] = [];

/**
 * Tampoco se inventan ensayos.
 *
 * El manual describe un ensayo semanal los miércoles de 4 a 6, pero eso es
 * la costumbre del ministerio, no un dato del calendario. Las fechas las pone
 * Aurora; el software solo ofrece la estructura como punto de partida.
 */
const SEED_REHEARSALS: readonly Rehearsal[] = [];

/** El historial lo escribe el uso, no la semilla. */
const SEED_HISTORY: readonly HistoryEntry[] = [];

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

  /**
   * Servicios ordenados por fecha ascendente.
   *
   * Las fechas sin confirmar van al final: un servicio sin fecha es una
   * plantilla a medio hacer, no lo próximo que ocurre.
   */
  async listServices(actor: Actor): Promise<readonly Service[]> {
    require(actor, 'service:read');
    const services = await this.collection<Service>(KEYS.services, SEED_SERVICES);
    return visible(actor, services)
      .slice()
      .sort((a, b) => {
        const aPend = a.date === PENDING;
        const bPend = b.date === PENDING;
        if (aPend !== bPend) return aPend ? 1 : -1;
        return a.date.localeCompare(b.date);
      });
  }

  async getService(actor: Actor, id: Id): Promise<Service | null> {
    require(actor, 'service:read');
    const services = await this.collection<Service>(KEYS.services, SEED_SERVICES);
    return visible(actor, services).find((s) => s.id === id) ?? null;
  }

  async deleteService(actor: Actor, id: Id): Promise<void> {
    require(actor, 'service:write');
    const services = await this.collection<Service>(KEYS.services, SEED_SERVICES);
    await this.store.set(
      KEYS.services,
      services.filter((s) => s.id !== id),
    );
  }

  async deleteSetlist(actor: Actor, id: Id): Promise<void> {
    require(actor, 'setlist:write');
    const setlists = await this.collection<Setlist>(KEYS.setlists, SEED_SETLISTS);
    await this.store.set(
      KEYS.setlists,
      setlists.filter((s) => s.id !== id),
    );
  }

  async saveSetlist(actor: Actor, setlist: Setlist): Promise<Setlist> {
    require(actor, 'setlist:write');
    const setlists = await this.collection<Setlist>(KEYS.setlists, SEED_SETLISTS);
    const index = setlists.findIndex((s) => s.id === setlist.id);
    if (index >= 0) setlists[index] = setlist;
    else setlists.push(setlist);
    await this.store.set(KEYS.setlists, setlists);
    return setlist;
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

  async listRehearsals(actor: Actor): Promise<readonly Rehearsal[]> {
    require(actor, 'rehearsal:read');
    const rehearsals = await this.collection<Rehearsal>(KEYS.rehearsals, SEED_REHEARSALS);
    // Por fecha ascendente: el ensayo que viene es el que importa.
    return visible(actor, rehearsals)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRehearsal(actor: Actor, id: Id): Promise<Rehearsal | null> {
    require(actor, 'rehearsal:read');
    const rehearsals = await this.collection<Rehearsal>(KEYS.rehearsals, SEED_REHEARSALS);
    return visible(actor, rehearsals).find((r) => r.id === id) ?? null;
  }

  async saveRehearsal(actor: Actor, rehearsal: Rehearsal): Promise<Rehearsal> {
    require(actor, 'rehearsal:write');
    const rehearsals = await this.collection<Rehearsal>(KEYS.rehearsals, SEED_REHEARSALS);
    const index = rehearsals.findIndex((r) => r.id === rehearsal.id);
    if (index >= 0) rehearsals[index] = rehearsal;
    else rehearsals.push(rehearsal);
    await this.store.set(KEYS.rehearsals, rehearsals);
    return rehearsal;
  }

  async deleteRehearsal(actor: Actor, id: Id): Promise<void> {
    require(actor, 'rehearsal:write');
    const rehearsals = await this.collection<Rehearsal>(KEYS.rehearsals, SEED_REHEARSALS);
    await this.store.set(
      KEYS.rehearsals,
      rehearsals.filter((r) => r.id !== id),
    );
  }

  async listTutorials(actor: Actor): Promise<readonly Tutorial[]> {
    require(actor, 'tutorial:read');
    return visible(actor, await this.collection<Tutorial>(KEYS.tutorials, SEED_TUTORIALS));
  }

  async getTutorial(actor: Actor, id: Id): Promise<Tutorial | null> {
    require(actor, 'tutorial:read');
    const tutorials = await this.collection<Tutorial>(KEYS.tutorials, SEED_TUTORIALS);
    return visible(actor, tutorials).find((t) => t.id === id) ?? null;
  }

  async saveTutorial(actor: Actor, tutorial: Tutorial): Promise<Tutorial> {
    require(actor, 'tutorial:write');
    const tutorials = await this.collection<Tutorial>(KEYS.tutorials, SEED_TUTORIALS);
    const index = tutorials.findIndex((t) => t.id === tutorial.id);
    if (index >= 0) tutorials[index] = tutorial;
    else tutorials.push(tutorial);
    await this.store.set(KEYS.tutorials, tutorials);
    return tutorial;
  }

  async deleteTutorial(actor: Actor, id: Id): Promise<void> {
    require(actor, 'tutorial:write');
    const tutorials = await this.collection<Tutorial>(KEYS.tutorials, SEED_TUTORIALS);
    await this.store.set(
      KEYS.tutorials,
      tutorials.filter((t) => t.id !== id),
    );
  }

  /**
   * Historial de uso.
   *
   * Responde a "¿cuándo tocamos esto por última vez?" y "¿en qué tonalidad la
   * cantó ella?". Se ordena de lo más reciente a lo más antiguo, que es como
   * se consulta.
   */
  async listHistory(actor: Actor, songId?: Id): Promise<readonly HistoryEntry[]> {
    require(actor, 'service:read');
    const history = await this.collection<HistoryEntry>(KEYS.history, SEED_HISTORY);
    return history
      .filter((h) => (songId ? h.songId === songId : true))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Registra lo tocado. Ignora lo ya registrado, para que pulsar dos veces no
   * duplique el historial de un mismo servicio.
   */
  async addHistory(actor: Actor, entries: readonly HistoryEntry[]): Promise<number> {
    require(actor, 'service:write');
    const history = await this.collection<HistoryEntry>(KEYS.history, SEED_HISTORY);
    const nuevas = entries.filter((e) => !history.some((h) => h.id === e.id));
    if (nuevas.length > 0) {
      await this.store.set(KEYS.history, [...history, ...nuevas]);
    }
    return nuevas.length;
  }

  /**
   * Favoritos.
   *
   * Son personales, así que se guardan por actor y no en la canción: dos
   * músicos no comparten los suyos, y marcar uno no modifica el repertorio
   * del ministerio.
   */
  private favoritesKey(actor: Actor): string {
    return `favorites:${actor.id}`;
  }

  async listFavorites(actor: Actor): Promise<readonly Id[]> {
    require(actor, 'song:read');
    return (await this.store.get<Id[]>(this.favoritesKey(actor))) ?? [];
  }

  async toggleFavorite(actor: Actor, songId: Id): Promise<readonly Id[]> {
    require(actor, 'song:read');
    const current = await this.listFavorites(actor);
    const next = current.includes(songId)
      ? current.filter((id) => id !== songId)
      : [...current, songId];
    await this.store.set(this.favoritesKey(actor), next);
    return next;
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

/**
 * Almacén de la aplicación.
 *
 * Se expone porque copia y restauración trabajan sobre las colecciones
 * enteras, por debajo del repositorio: restaurar sustituye los datos, no los
 * edita uno a uno.
 */
export const appStore = createDefaultStore();

export const repository: AuroraRepository = new StoredRepository(appStore);
