/**
 * Modelo de datos de Aurora Worship.
 *
 * Todo lo que la aplicación muestra se describe aquí. Las entidades se
 * definen completas desde el principio aunque la UI todavía no use todos los
 * campos: es más barato dejar el hueco previsto que migrar datos después.
 *
 * Dos reglas atraviesan el modelo:
 *  - `scope` decide quién ve cada cosa (ver dominio RBAC).
 *  - `rights` decide qué se puede redistribuir (ver ARCHITECTURE.md §Copyright).
 */

import type { Scope } from './rbac/roles';

export type Id = string;

/** Marca de datos que aún no han sido confirmados por el ministerio. */
export const PENDING = 'INFORMACIÓN PENDIENTE' as const;
export type Pending = typeof PENDING;

/** Un valor que puede estar todavía sin confirmar. */
export type Confirmable<T> = T | Pending;

export function isPending<T>(value: Confirmable<T>): value is Pending {
  return value === PENDING;
}

// ---------------------------------------------------------------- Derechos

/**
 * Origen legal del contenido. Determina si puede publicarse o solo
 * consultarse internamente.
 */
export type RightsStatus =
  /** Compuesto por Aurora. Se puede publicar. */
  | 'own'
  /** De terceros con permiso expreso registrado. */
  | 'licensed'
  /** Dominio público comprobado. */
  | 'public-domain'
  /** De terceros sin licencia: solo referencia y uso interno. */
  | 'reference';

export interface Rights {
  status: RightsStatus;
  /** Titular de los derechos, cuando se conoce. */
  holder: Confirmable<string> | null;
  notes: string | null;
}

/** Solo estos dos estados permiten exponer el contenido públicamente. */
export function isRedistributable(rights: Rights): boolean {
  return rights.status === 'own' || rights.status === 'public-domain';
}

// ---------------------------------------------------------------- Personas

/**
 * Cadena libre, no una unión cerrada: el catálogo lo puede ampliar el
 * ministerio (§19), así que el tipo no puede fijar de antemano qué
 * instrumentos existen.
 */
export type InstrumentId = string;

export interface Instrument {
  id: InstrumentId;
  name: string;
  /** Familia, para agrupar en la UI y ampliar el catálogo sin migraciones. */
  family: 'keys' | 'strings' | 'rhythm' | 'vocal' | 'other';
  /** Falso en los seis de fábrica; verdadero en los que añade el ministerio. */
  custom?: boolean;
}

/** Catálogo de fábrica. Nunca se edita ni se borra: es la base común. */
export const INSTRUMENTS: readonly Instrument[] = [
  { id: 'piano', name: 'Piano', family: 'keys' },
  { id: 'acoustic-guitar', name: 'Guitarra acústica', family: 'strings' },
  { id: 'electric-guitar', name: 'Guitarra eléctrica', family: 'strings' },
  { id: 'bass', name: 'Bajo', family: 'strings' },
  { id: 'drums', name: 'Batería', family: 'rhythm' },
  { id: 'voice', name: 'Voz', family: 'vocal' },
];

/**
 * Instrumentos añadidos por el ministerio, en memoria.
 *
 * `instrumentById` se llama en decenas de sitios de forma síncrona (mostrar
 * el nombre de un instrumento en una lista), y enhebrar el catálogo completo
 * como prop hasta cada uno de ellos sería una cascada de cambios por un dato
 * que rara vez cambia. `repository.listInstruments` rellena esta caché la
 * primera vez que se pide el catálogo; a partir de ahí toda la aplicación ve
 * los instrumentos añadidos sin pedirlos de nuevo.
 */
const customInstrumentCache = new Map<string, Instrument>();

export function registerCustomInstruments(instruments: readonly Instrument[]): void {
  customInstrumentCache.clear();
  for (const instrument of instruments) customInstrumentCache.set(instrument.id, instrument);
}

export function instrumentById(id: InstrumentId): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.id === id) ?? customInstrumentCache.get(id);
}

/**
 * Integrante del ministerio.
 *
 * Los datos de contacto NO viven aquí: Aurora trabaja con jóvenes y la
 * aplicación no tiene por qué mostrar teléfonos ni correos para funcionar.
 */
export interface Member {
  id: Id;
  displayName: string;
  instruments: readonly InstrumentId[];
  /** Tesitura cómoda del vocalista, si aplica. */
  comfortableKeys: readonly string[];
}

// ---------------------------------------------------------------- Canciones

export type VoicePart =
  | 'lead' | 'first' | 'second' | 'third' | 'harmony';

export const VOICE_PART_LABELS: Record<VoicePart, string> = {
  lead: 'Melodía principal',
  first: 'Primera voz',
  second: 'Segunda voz',
  third: 'Tercera voz',
  harmony: 'Armonía',
};

export interface VoiceLine {
  part: VoicePart;
  /** Indicaciones de intervalo respecto de la melodía ("3ª arriba"). */
  interval: string | null;
  notes: string | null;
  /** Referencias a material en storage; nunca binarios en el modelo. */
  resources: readonly ResourceRef[];
}

/** Qué toca un instrumento en cada parte de la canción. */
export interface InstrumentPart {
  instrument: InstrumentId;
  /** Etiqueta de la sección: "Intro", "Coro"… casa con el cuerpo. */
  section: string;
  instructions: string;
}

/** Tonalidad concreta que usa un vocalista para una canción. */
export interface VocalistKey {
  memberId: Id;
  key: string;
  notes: string | null;
}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Estado de preparación de la canción (§30), no de publicación: `scope` ya
 * decide quién la ve. Este campo responde «¿la damos por lista para tocar?».
 */
export type SongStatus = 'draft' | 'ready' | 'archived';

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  draft: 'Borrador',
  ready: 'Lista',
  archived: 'Archivada',
};

/**
 * Variante de arreglo de la misma canción: acústica, en vivo, original del
 * artista. NO duplica letra ni acordes — eso viviría en el `body` principal
 * si el equipo decide adoptar el arreglo — sino que anota que existe y enlaza
 * su referencia, para no perder de vista que "hay otra forma de tocarla".
 */
export interface SongVersion {
  id: Id;
  label: string;
  notes: string | null;
  resources: readonly ResourceRef[];
}

export interface Song {
  id: Id;
  title: string;
  artist: Confirmable<string> | null;
  composer: Confirmable<string> | null;
  language: string;
  bpm: number | null;
  /** Compás en texto libre: "4/4", "6/8". */
  meter: string | null;
  /** Tonalidad en que se compuso. No cambia. */
  originalKey: string;
  /** Tonalidad que el equipo usa por defecto. */
  currentKey: string;
  /** Letra y acordes en el formato de `song-body`. */
  body: string;
  notes: string | null;
  difficulty: Difficulty | null;
  tags: readonly string[];
  instruments: readonly InstrumentId[];
  instrumentParts: readonly InstrumentPart[];
  voices: readonly VoiceLine[];
  vocalistKeys: readonly VocalistKey[];
  resources: readonly ResourceRef[];
  versions: readonly SongVersion[];
  status: SongStatus;
  rights: Rights;
  scope: Scope;
}

// ---------------------------------------------------------------- Recursos

export type ResourceKind = 'video' | 'audio' | 'pdf' | 'image' | 'link' | 'text';

/**
 * Referencia a un archivo. La metadata vive en la base de datos y el binario
 * en storage: aquí solo viaja el puntero.
 */
export interface ResourceRef {
  id: Id;
  kind: ResourceKind;
  title: string;
  /** URL externa o clave de objeto en storage. */
  url: string;
  sizeBytes: number | null;
  rights: Rights;
  scope: Scope;
}

// ------------------------------------------------- Repertorios y servicios

export type SetlistKind = 'base' | 'rehearsal' | 'service' | 'event' | 'archive';

export interface SetlistEntry {
  songId: Id;
  order: number;
  /** Tonalidad para esta ocasión; si falta, se usa la de la canción. */
  key: string | null;
  leadVocalistId: Id | null;
  notes: string | null;
}

export interface Setlist {
  id: Id;
  name: string;
  kind: SetlistKind;
  entries: readonly SetlistEntry[];
  scope: Scope;
}

/** Quién toca qué en una fecha concreta. */
export interface Assignment {
  memberId: Id;
  instrument: InstrumentId | null;
  voicePart: VoicePart | null;
  songId: Id | null;
  notes: string | null;
}

export interface Service {
  id: Id;
  /** ISO 8601, solo fecha. */
  date: string;
  event: string;
  setlistId: Id | null;
  assignments: readonly Assignment[];
  notes: string | null;
  scope: Scope;
}

/**
 * Bloque de un ensayo. El manual describe oración, preparación, ejercicios,
 * repertorio, revisión y cierre; se modela como estructura configurable, no
 * como regla fija del software.
 */
export interface RehearsalBlock {
  title: string;
  minutes: number;
  description: string | null;
}

export interface Rehearsal {
  id: Id;
  date: string;
  startTime: string;
  endTime: string;
  blocks: readonly RehearsalBlock[];
  setlistId: Id | null;
  assignments: readonly Assignment[];
  scope: Scope;
}

/** Una canción tal como se tocó una fecha concreta. */
export interface HistoryEntry {
  id: Id;
  songId: Id;
  date: string;
  serviceId: Id | null;
  key: string;
  leadVocalistId: Id | null;
  memberIds: readonly Id[];
}

// --------------------------------------------------------------- Tutoriales

export type TutorialCategory =
  | 'piano' | 'guitar' | 'bass' | 'drums' | 'voice'
  | 'harmony' | 'theory' | 'sound' | 'sequences' | 'worship';

export const TUTORIAL_CATEGORY_LABELS: Record<TutorialCategory, string> = {
  piano: 'Piano',
  guitar: 'Guitarra',
  bass: 'Bajo',
  drums: 'Batería',
  voice: 'Voz',
  harmony: 'Armonía',
  theory: 'Teoría',
  sound: 'Sonido',
  sequences: 'Secuencias',
  worship: 'Adoración',
};

export interface Tutorial {
  id: Id;
  title: string;
  category: TutorialCategory;
  description: string | null;
  resources: readonly ResourceRef[];
  /** Vínculos opcionales: un tutorial puede colgar de una canción o de nada. */
  songId: Id | null;
  instrument: InstrumentId | null;
  voicePart: VoicePart | null;
  rights: Rights;
  scope: Scope;
}
