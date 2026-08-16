/**
 * Datos de arranque.
 *
 * Dos restricciones gobiernan este archivo:
 *
 *  1. No se inventa información del ministerio. No hay integrantes, líderes,
 *     repertorios reales ni fechas reales. Lo que Aurora deba confirmar
 *     aparece como INFORMACIÓN PENDIENTE.
 *  2. Solo entra material de dominio público comprobado. Las dos canciones
 *     son himnos del siglo XIX; ninguna obra de terceros con derechos
 *     vigentes se copia aquí.
 *
 * Sirven para que la aplicación arranque con algo real que enseñar y para
 * ejercitar el motor de transposición de punta a punta.
 */

import { PENDING, type Rights, type Service, type Setlist, type Song, type Tutorial } from '../domain/model';

const PUBLIC_DOMAIN = (holder: string, year: string): Rights => ({
  status: 'public-domain',
  holder,
  notes: `Dominio público (${year}).`,
});

export const SEED_SONGS: readonly Song[] = [
  {
    id: 'song-sublime-gracia',
    title: 'Sublime Gracia',
    artist: 'Tradicional',
    composer: 'John Newton',
    language: 'es',
    bpm: 72,
    meter: '3/4',
    originalKey: 'G',
    currentKey: 'G',
    body: [
      '# Intro',
      '[G] [G/B] [C] [G]',
      '',
      '# Verso 1',
      '[G]Sublime gracia del [G7]Se[C]ñor',
      'que a un [G]pecador sal[Em]vó;',
      '[G]fui ciego mas [G7]hoy [C]veo yo,',
      'per[G]dido y Él me [D]ha[G]lló.',
      '',
      '# Verso 2',
      '[G]Su gracia me en[G7]se[C]ñó',
      'a [G]tener temor de [Em]Dios;',
      '[G]mis dudas quitó [G7]mi [C]fe,',
      '¡qué [G]grande es mi [D]Se[G]ñor!',
    ].join('\n'),
    notes: null,
    difficulty: 1,
    tags: ['himno', 'adoración', 'clásico'],
    instruments: ['piano', 'acoustic-guitar', 'bass', 'voice'],
    instrumentParts: [
      {
        instrument: 'piano',
        section: 'Intro',
        instructions: 'Arpegios suaves, sin percusión. Entrar solo en el segundo compás.',
      },
      {
        instrument: 'acoustic-guitar',
        section: 'Verso 1',
        instructions: 'Rasgueo en 3/4, dinámica baja.',
      },
    ],
    voices: [
      { part: 'lead', interval: null, notes: 'Melodía del himno.', resources: [] },
      { part: 'first', interval: '3ª arriba', notes: null, resources: [] },
    ],
    vocalistKeys: [],
    resources: [],
    versions: [],
    rights: PUBLIC_DOMAIN('John Newton / Letra tradicional', '1779'),
    scope: 'public',
  },
  {
    id: 'song-santo-santo-santo',
    title: 'Santo, Santo, Santo',
    artist: 'Tradicional',
    composer: 'Reginald Heber / John B. Dykes',
    language: 'es',
    bpm: 84,
    meter: '4/4',
    originalKey: 'D',
    currentKey: 'D',
    body: [
      '# Verso 1',
      '[D]Santo, San[A]to, San[D]to,',
      'Señor omnipo[A]tente,',
      '[D]siempre el labio [G]mío',
      'loo[D]res te da[A]rá;[D]',
      '',
      '# Coro',
      '[G]Santo, Santo, [D]Santo,',
      '[A]te adoramos [D]hoy,',
      '[G]Dios en tres Per[D]sonas,',
      'ben[A]dita Trini[D]dad.',
    ].join('\n'),
    notes: null,
    difficulty: 2,
    tags: ['himno', 'adoración'],
    instruments: ['piano', 'acoustic-guitar', 'bass', 'drums', 'voice'],
    instrumentParts: [
      {
        instrument: 'drums',
        section: 'Coro',
        instructions: 'Entrar en el coro, no antes. Mantener dinámica contenida.',
      },
    ],
    voices: [
      { part: 'lead', interval: null, notes: null, resources: [] },
      { part: 'first', interval: '3ª arriba', notes: null, resources: [] },
      { part: 'second', interval: '6ª abajo', notes: null, resources: [] },
    ],
    vocalistKeys: [],
    resources: [],
    versions: [],
    rights: PUBLIC_DOMAIN('Reginald Heber / John B. Dykes', '1826 / 1861'),
    scope: 'public',
  },
];

export const SEED_SETLISTS: readonly Setlist[] = [
  {
    id: 'setlist-base',
    name: 'Repertorio base',
    kind: 'base',
    entries: [
      { songId: 'song-sublime-gracia', order: 1, key: null, leadVocalistId: null, notes: null },
      { songId: 'song-santo-santo-santo', order: 2, key: null, leadVocalistId: null, notes: null },
    ],
    scope: 'internal',
  },
];

/**
 * Servicio de ejemplo, sin fecha ni integrantes reales.
 *
 * Existe para poder recorrer la pantalla que responde a "¿qué toco este
 * sábado?" antes de que Aurora cargue sus datos.
 */
export const SEED_SERVICES: readonly Service[] = [
  {
    id: 'service-ejemplo',
    date: PENDING,
    event: 'Servicio de ejemplo',
    setlistId: 'setlist-base',
    assignments: [],
    notes: `Fecha, participantes y tonalidades: ${PENDING}. Este servicio es una plantilla de demostración.`,
    scope: 'internal',
  },
];

export const SEED_TUTORIALS: readonly Tutorial[] = [
  {
    id: 'tutorial-transposicion',
    title: 'Cómo leer una canción transpuesta',
    category: 'theory',
    description:
      'Qué significa tonalidad original frente a tonalidad actual, y por qué un mismo acorde ' +
      'se escribe distinto según la tonalidad.',
    resources: [],
    songId: null,
    instrument: null,
    voicePart: null,
    rights: { status: 'own', holder: 'Ministerio Aurora', notes: null },
    scope: 'internal',
  },
];
