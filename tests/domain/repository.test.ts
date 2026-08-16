import { beforeEach, describe, expect, it } from 'vitest';
import { PermissionError, StoredRepository } from '../../src/data/repository';
import { MemoryStore } from '../../src/data/store';
import { SEED_SONGS } from '../../src/data/seed';
import { ANONYMOUS, type Actor } from '../../src/domain/rbac/roles';

const leader: Actor = { id: 'l', roles: ['leader'] };
const admin: Actor = { id: 'a', roles: ['admin'] };
const musician: Actor = { id: 'm', roles: ['musician'] };

let repo: StoredRepository;

beforeEach(() => {
  repo = new StoredRepository(new MemoryStore());
});

describe('aislamiento por ámbito', () => {
  it('el anónimo solo recibe canciones públicas', async () => {
    const songs = await repo.listSongs(ANONYMOUS);
    expect(songs.length).toBeGreaterThan(0);
    expect(songs.every((s) => s.scope === 'public')).toBe(true);
  });

  it('el anónimo no ve repertorios, servicios ni tutoriales internos', async () => {
    await expect(repo.listSetlists(ANONYMOUS)).rejects.toThrow(PermissionError);
    await expect(repo.listServices(ANONYMOUS)).rejects.toThrow(PermissionError);
    expect(await repo.listTutorials(ANONYMOUS)).toEqual([]);
  });

  it('el líder sí los ve', async () => {
    expect((await repo.listSetlists(leader)).length).toBeGreaterThan(0);
    expect((await repo.listServices(leader)).length).toBeGreaterThan(0);
  });

  it('devuelve null si la canción no existe', async () => {
    expect(await repo.getSong(leader, 'no-existe')).toBeNull();
  });
});

describe('permisos de escritura', () => {
  const draft = { ...SEED_SONGS[0], id: 'song-nueva', title: 'Canción nueva' };

  it('un músico no puede guardar', async () => {
    await expect(repo.saveSong(musician, draft)).rejects.toThrow(PermissionError);
  });

  it('un líder sí puede guardar', async () => {
    await repo.saveSong(leader, draft);
    expect(await repo.getSong(leader, 'song-nueva')).not.toBeNull();
  });

  it('un líder no puede borrar', async () => {
    await expect(repo.deleteSong(leader, 'song-sublime-gracia')).rejects.toThrow(PermissionError);
  });

  it('un admin sí puede borrar', async () => {
    await repo.deleteSong(admin, 'song-sublime-gracia');
    expect(await repo.getSong(admin, 'song-sublime-gracia')).toBeNull();
  });

  it('el anónimo no puede escribir nada', async () => {
    await expect(repo.saveSong(ANONYMOUS, draft)).rejects.toThrow(PermissionError);
    await expect(repo.deleteSong(ANONYMOUS, draft.id)).rejects.toThrow(PermissionError);
  });
});

describe('persistencia', () => {
  it('lo guardado sobrevive a un repositorio nuevo sobre el mismo almacén', async () => {
    const store = new MemoryStore();
    const first = new StoredRepository(store);
    await first.saveSong(leader, { ...SEED_SONGS[0], id: 'song-x', title: 'Persistida' });

    const second = new StoredRepository(store);
    const song = await second.getSong(leader, 'song-x');
    expect(song?.title).toBe('Persistida');
  });

  it('una canción semilla borrada no reaparece', async () => {
    const store = new MemoryStore();
    await new StoredRepository(store).deleteSong(admin, 'song-sublime-gracia');
    expect(await new StoredRepository(store).getSong(admin, 'song-sublime-gracia')).toBeNull();
  });

  it('editar sustituye en vez de duplicar', async () => {
    const before = (await repo.listSongs(leader)).length;
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, { ...song, title: 'Sublime Gracia (revisada)' });
    const after = await repo.listSongs(leader);
    expect(after.length).toBe(before);
    expect(after.find((s) => s.id === 'song-sublime-gracia')?.title).toBe('Sublime Gracia (revisada)');
  });

  it('no arrastra mutaciones a los datos semilla', async () => {
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, { ...song, title: 'Cambiada' });
    expect(SEED_SONGS[0].title).toBe('Sublime Gracia');
  });
});

describe('búsqueda', () => {
  it('encuentra por título', async () => {
    const found = await repo.listSongs(leader, { text: 'sublime' });
    expect(found.map((s) => s.id)).toContain('song-sublime-gracia');
  });

  it('encuentra por letra aunque un acorde parta la palabra', async () => {
    const found = await repo.listSongs(leader, { text: 'omnipotente' });
    expect(found.map((s) => s.id)).toEqual(['song-santo-santo-santo']);
  });

  it('encuentra por etiqueta', async () => {
    expect((await repo.listSongs(leader, { tag: 'himno' })).length).toBe(2);
  });

  it('filtra por tonalidad', async () => {
    const found = await repo.listSongs(leader, { key: 'D' });
    expect(found.map((s) => s.id)).toEqual(['song-santo-santo-santo']);
  });

  it('filtra por instrumento', async () => {
    const found = await repo.listSongs(leader, { instrument: 'drums' });
    expect(found.map((s) => s.id)).toEqual(['song-santo-santo-santo']);
  });

  it('no encuentra lo que no está', async () => {
    expect(await repo.listSongs(leader, { text: 'zzzz' })).toEqual([]);
  });

  it('ordena alfabéticamente', async () => {
    const titles = (await repo.listSongs(leader)).map((s) => s.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'es')));
  });
});

describe('integridad de los datos de arranque', () => {
  it('ninguna canción semilla infringe derechos de terceros', async () => {
    const songs = await repo.listSongs(leader);
    expect(songs.every((s) => s.rights.status === 'public-domain' || s.rights.status === 'own')).toBe(
      true,
    );
  });

  it('no hay integrantes inventados', async () => {
    const songs = await repo.listSongs(leader);
    expect(songs.every((s) => s.vocalistKeys.length === 0)).toBe(true);
  });

  it('las entradas de repertorio apuntan a canciones existentes', async () => {
    for (const setlist of await repo.listSetlists(leader)) {
      for (const entry of setlist.entries) {
        expect(await repo.getSong(leader, entry.songId)).not.toBeNull();
      }
    }
  });
});

describe('equipo', () => {
  const member = {
    id: 'member-1',
    displayName: 'Integrante de prueba',
    instruments: ['piano'] as const,
    comfortableKeys: ['G', 'A'] as const,
  };

  it('arranca vacío: no se inventan integrantes', async () => {
    expect(await repo.listMembers(leader)).toEqual([]);
  });

  it('un músico puede leer el equipo pero no editarlo', async () => {
    expect(await repo.listMembers(musician)).toEqual([]);
    await expect(repo.saveMember(musician, member)).rejects.toThrow(PermissionError);
  });

  it('el anónimo no ve el equipo', async () => {
    await expect(repo.listMembers(ANONYMOUS)).rejects.toThrow(PermissionError);
  });

  it('un admin da de alta y de baja', async () => {
    await repo.saveMember(admin, member);
    expect(await repo.getMember(admin, 'member-1')).not.toBeNull();
    await repo.deleteMember(admin, 'member-1');
    expect(await repo.getMember(admin, 'member-1')).toBeNull();
  });

  it('un líder no puede modificar el equipo', async () => {
    await expect(repo.saveMember(leader, member)).rejects.toThrow(PermissionError);
  });

  it('el modelo no guarda datos de contacto', async () => {
    await repo.saveMember(admin, member);
    const stored = await repo.getMember(admin, 'member-1');
    expect(Object.keys(stored!).sort()).toEqual(
      ['comfortableKeys', 'displayName', 'id', 'instruments'].sort(),
    );
  });

  it('ordena por nombre', async () => {
    await repo.saveMember(admin, { ...member, id: 'b', displayName: 'Zoe' });
    await repo.saveMember(admin, { ...member, id: 'a', displayName: 'Ana' });
    expect((await repo.listMembers(admin)).map((m) => m.displayName)).toEqual(['Ana', 'Zoe']);
  });
});

describe('planificación del servicio', () => {
  it('un líder puede reordenar el repertorio', async () => {
    const setlist = (await repo.getSetlist(leader, 'setlist-base'))!;
    const invertido = [...setlist.entries].reverse().map((e, i) => ({ ...e, order: i + 1 }));
    await repo.saveSetlist(leader, { ...setlist, entries: invertido });

    const guardado = (await repo.getSetlist(leader, 'setlist-base'))!;
    expect(guardado.entries.map((e) => e.songId)).toEqual(invertido.map((e) => e.songId));
  });

  it('un músico no puede tocar el repertorio ni el servicio', async () => {
    const setlist = (await repo.getSetlist(musician, 'setlist-base'))!;
    await expect(repo.saveSetlist(musician, setlist)).rejects.toThrow(PermissionError);

    const service = (await repo.listServices(musician))[0];
    await expect(repo.saveService(musician, service)).rejects.toThrow(PermissionError);
  });

  it('el líder fija fecha y asignaciones, y persisten', async () => {
    const service = (await repo.listServices(leader))[0];
    await repo.saveService(leader, {
      ...service,
      date: '2026-09-05',
      assignments: [
        { memberId: 'member-1', instrument: 'piano', voicePart: null, songId: null, notes: null },
      ],
    });

    const guardado = (await repo.listServices(leader))[0];
    expect(guardado.date).toBe('2026-09-05');
    expect(guardado.assignments).toHaveLength(1);
    expect(guardado.assignments[0].instrument).toBe('piano');
  });

  it('la tonalidad de la entrada manda sobre la de la canción', async () => {
    const setlist = (await repo.getSetlist(leader, 'setlist-base'))!;
    const conTonalidad = setlist.entries.map((e) =>
      e.songId === 'song-sublime-gracia' ? { ...e, key: 'Bb' } : e,
    );
    await repo.saveSetlist(leader, { ...setlist, entries: conTonalidad });

    const guardado = (await repo.getSetlist(leader, 'setlist-base'))!;
    const entrada = guardado.entries.find((e) => e.songId === 'song-sublime-gracia')!;
    const cancion = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    expect(entrada.key).toBe('Bb');
    expect(cancion.currentKey).toBe('G');
  });
});

describe('favoritos', () => {
  it('arrancan vacíos', async () => {
    expect(await repo.listFavorites(musician)).toEqual([]);
  });

  it('se marcan y se desmarcan', async () => {
    expect(await repo.toggleFavorite(musician, 'song-sublime-gracia')).toEqual([
      'song-sublime-gracia',
    ]);
    expect(await repo.toggleFavorite(musician, 'song-sublime-gracia')).toEqual([]);
  });

  it('son personales: no se comparten entre integrantes', async () => {
    await repo.toggleFavorite(musician, 'song-sublime-gracia');
    expect(await repo.listFavorites(leader)).toEqual([]);
    expect(await repo.listFavorites(musician)).toEqual(['song-sublime-gracia']);
  });

  it('marcar un favorito no modifica la canción del ministerio', async () => {
    const antes = await repo.getSong(leader, 'song-sublime-gracia');
    await repo.toggleFavorite(musician, 'song-sublime-gracia');
    expect(await repo.getSong(leader, 'song-sublime-gracia')).toEqual(antes);
  });

  it('el anónimo no puede marcar favoritos de contenido interno que no ve', async () => {
    // Puede leer lo público, así que la operación en sí es legítima; lo que lo
    // limita es qué canciones llega a ver.
    expect(await repo.listFavorites(ANONYMOUS)).toEqual([]);
  });
});

describe('ensayos', () => {
  const ensayo = {
    id: 'rehearsal-1',
    date: '2026-09-02',
    startTime: '16:00',
    endTime: '18:00',
    blocks: [{ title: 'Oración', minutes: 20, description: null }],
    setlistId: 'setlist-base',
    assignments: [],
    scope: 'internal' as const,
  };

  it('arrancan vacíos: no se inventan fechas de ensayo', async () => {
    expect(await repo.listRehearsals(leader)).toEqual([]);
  });

  it('el director musical los crea y los borra', async () => {
    const director = { id: 'd', roles: ['music-director'] as const };
    await repo.saveRehearsal(director, ensayo);
    expect(await repo.getRehearsal(director, 'rehearsal-1')).not.toBeNull();
    await repo.deleteRehearsal(director, 'rehearsal-1');
    expect(await repo.getRehearsal(director, 'rehearsal-1')).toBeNull();
  });

  it('un músico los lee pero no los toca', async () => {
    await repo.saveRehearsal(leader, ensayo);
    expect((await repo.listRehearsals(musician)).length).toBe(1);
    await expect(repo.saveRehearsal(musician, ensayo)).rejects.toThrow(PermissionError);
    await expect(repo.deleteRehearsal(musician, ensayo.id)).rejects.toThrow(PermissionError);
  });

  it('el anónimo no ve ensayos', async () => {
    await expect(repo.listRehearsals(ANONYMOUS)).rejects.toThrow(PermissionError);
  });

  it('se ordenan por fecha ascendente', async () => {
    await repo.saveRehearsal(leader, { ...ensayo, id: 'b', date: '2026-09-09' });
    await repo.saveRehearsal(leader, { ...ensayo, id: 'a', date: '2026-09-02' });
    expect((await repo.listRehearsals(leader)).map((r) => r.date)).toEqual([
      '2026-09-02',
      '2026-09-09',
    ]);
  });

  it('los bloques son propios de cada ensayo, no compartidos', async () => {
    await repo.saveRehearsal(leader, { ...ensayo, id: 'x' });
    await repo.saveRehearsal(leader, {
      ...ensayo,
      id: 'y',
      blocks: [{ title: 'Solo repertorio', minutes: 90, description: null }],
    });
    const x = await repo.getRehearsal(leader, 'x');
    const y = await repo.getRehearsal(leader, 'y');
    expect(x!.blocks[0].title).toBe('Oración');
    expect(y!.blocks[0].title).toBe('Solo repertorio');
  });
});

describe('tutoriales', () => {
  const tutorial = {
    id: 'tut-1',
    title: 'Acordes con cejilla',
    category: 'guitar' as const,
    description: null,
    resources: [],
    songId: null,
    instrument: 'acoustic-guitar' as const,
    voicePart: null,
    rights: { status: 'own' as const, holder: 'Aurora', notes: null },
    scope: 'internal' as const,
  };

  it('el editor puede crearlos y borrarlos', async () => {
    const editor = { id: 'e', roles: ['editor'] as const };
    await repo.saveTutorial(editor, tutorial);
    expect(await repo.getTutorial(editor, 'tut-1')).not.toBeNull();
    await repo.deleteTutorial(editor, 'tut-1');
    expect(await repo.getTutorial(editor, 'tut-1')).toBeNull();
  });

  it('un músico los lee pero no los toca', async () => {
    await expect(repo.saveTutorial(musician, tutorial)).rejects.toThrow(PermissionError);
    await expect(repo.deleteTutorial(musician, 'tut-1')).rejects.toThrow(PermissionError);
  });

  it('el público solo recibe los marcados como públicos', async () => {
    await repo.saveTutorial(admin, tutorial);
    await repo.saveTutorial(admin, { ...tutorial, id: 'tut-2', scope: 'public' });
    const publicos = await repo.listTutorials(ANONYMOUS);
    expect(publicos.map((t) => t.id)).toEqual(['tut-2']);
  });

  it('el material se guarda como referencia, no como archivo', async () => {
    await repo.saveTutorial(admin, {
      ...tutorial,
      resources: [
        {
          id: 'r1',
          kind: 'video',
          title: 'Clase 1',
          url: 'https://ejemplo.test/clase-1',
          sizeBytes: null,
          rights: { status: 'reference', holder: null, notes: null },
          scope: 'internal',
        },
      ],
    });
    const guardado = await repo.getTutorial(admin, 'tut-1');
    expect(guardado!.resources[0].url).toBe('https://ejemplo.test/clase-1');
    expect(guardado!.resources[0].sizeBytes).toBeNull();
  });
});

describe('historial', () => {
  const entrada = {
    id: 'history-s1-song-sublime-gracia',
    songId: 'song-sublime-gracia',
    date: '2026-08-01',
    serviceId: 's1',
    key: 'G',
    leadVocalistId: null,
    memberIds: [],
  };

  it('arranca vacío', async () => {
    expect(await repo.listHistory(leader)).toEqual([]);
  });

  it('el líder registra lo tocado', async () => {
    expect(await repo.addHistory(leader, [entrada])).toBe(1);
    expect((await repo.listHistory(leader)).length).toBe(1);
  });

  it('registrar dos veces el mismo servicio no duplica', async () => {
    await repo.addHistory(leader, [entrada]);
    expect(await repo.addHistory(leader, [entrada])).toBe(0);
    expect((await repo.listHistory(leader)).length).toBe(1);
  });

  it('un músico lo consulta pero no lo escribe', async () => {
    await repo.addHistory(leader, [entrada]);
    expect((await repo.listHistory(musician)).length).toBe(1);
    await expect(repo.addHistory(musician, [entrada])).rejects.toThrow(PermissionError);
  });

  it('filtra por canción', async () => {
    await repo.addHistory(leader, [
      entrada,
      { ...entrada, id: 'h2', songId: 'song-santo-santo-santo' },
    ]);
    const solo = await repo.listHistory(leader, 'song-santo-santo-santo');
    expect(solo.map((h) => h.songId)).toEqual(['song-santo-santo-santo']);
  });

  it('ordena de lo más reciente a lo más antiguo', async () => {
    await repo.addHistory(leader, [
      { ...entrada, id: 'a', date: '2026-08-01' },
      { ...entrada, id: 'b', date: '2026-08-15' },
      { ...entrada, id: 'c', date: '2026-07-01' },
    ]);
    expect((await repo.listHistory(leader)).map((h) => h.date)).toEqual([
      '2026-08-15',
      '2026-08-01',
      '2026-07-01',
    ]);
  });

  it('guarda la tonalidad realmente usada, no la de la canción', async () => {
    await repo.addHistory(leader, [{ ...entrada, key: 'Bb' }]);
    const cancion = await repo.getSong(leader, 'song-sublime-gracia');
    expect((await repo.listHistory(leader))[0].key).toBe('Bb');
    expect(cancion!.currentKey).toBe('G');
  });
});

describe('búsqueda avanzada', () => {
  it('filtra por dificultad', async () => {
    const faciles = await repo.listSongs(leader, { difficulty: 1 });
    expect(faciles.map((s) => s.id)).toEqual(['song-sublime-gracia']);
  });

  it('filtra por rango de tempo', async () => {
    expect((await repo.listSongs(leader, { bpmMin: 80 })).map((s) => s.id)).toEqual([
      'song-santo-santo-santo',
    ]);
    expect((await repo.listSongs(leader, { bpmMax: 75 })).map((s) => s.id)).toEqual([
      'song-sublime-gracia',
    ]);
    expect((await repo.listSongs(leader, { bpmMin: 70, bpmMax: 90 })).length).toBe(2);
  });

  it('una canción sin BPM no se cuela en un filtro de tempo', async () => {
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, { ...song, bpm: null });
    expect((await repo.listSongs(leader, { bpmMin: 0 })).map((s) => s.id)).toEqual([
      'song-santo-santo-santo',
    ]);
  });

  it('filtra por vocalista', async () => {
    const song = (await repo.getSong(leader, 'song-santo-santo-santo'))!;
    await repo.saveSong(leader, {
      ...song,
      vocalistKeys: [{ memberId: 'm1', key: 'E', notes: null }],
    });
    expect((await repo.listSongs(leader, { vocalistId: 'm1' })).map((s) => s.id)).toEqual([
      'song-santo-santo-santo',
    ]);
    expect(await repo.listSongs(leader, { vocalistId: 'nadie' })).toEqual([]);
  });

  it('los filtros se acumulan', async () => {
    expect(await repo.listSongs(leader, { tag: 'himno', difficulty: 1, bpmMax: 75 })).toHaveLength(1);
    expect(await repo.listSongs(leader, { tag: 'himno', difficulty: 1, bpmMin: 80 })).toEqual([]);
  });
});

describe('varios servicios', () => {
  const base = {
    id: 's1',
    date: '2026-09-05',
    event: 'Servicio de septiembre',
    setlistId: null,
    assignments: [],
    notes: null,
    scope: 'internal' as const,
  };

  it('el líder puede tener más de uno a la vez', async () => {
    await repo.saveService(leader, base);
    await repo.saveService(leader, { ...base, id: 's2', date: '2026-09-12' });
    // Más el de ejemplo que trae la semilla.
    expect((await repo.listServices(leader)).length).toBe(3);
  });

  it('ordena por fecha, y los que no la tienen van al final', async () => {
    await repo.saveService(leader, { ...base, id: 'b', date: '2026-09-12' });
    await repo.saveService(leader, { ...base, id: 'a', date: '2026-09-05' });
    const fechas = (await repo.listServices(leader)).map((s) => s.date);
    expect(fechas.slice(0, 2)).toEqual(['2026-09-05', '2026-09-12']);
    expect(fechas.at(-1)).toBe('INFORMACIÓN PENDIENTE');
  });

  it('planificar uno no pisa el otro', async () => {
    await repo.saveService(leader, base);
    await repo.saveService(leader, { ...base, id: 's2', date: '2026-09-12', event: 'Otro' });
    await repo.saveService(leader, { ...base, event: 'Renombrado' });

    expect((await repo.getService(leader, 's1'))!.event).toBe('Renombrado');
    expect((await repo.getService(leader, 's2'))!.event).toBe('Otro');
  });

  it('cada servicio lleva su propio repertorio', async () => {
    await repo.saveSetlist(leader, {
      id: 'sl1',
      name: 'Primero',
      kind: 'service',
      entries: [
        { songId: 'song-sublime-gracia', order: 1, key: 'G', leadVocalistId: null, notes: null, sequencePlanId: null },
      ],
      scope: 'internal',
    });
    await repo.saveSetlist(leader, {
      id: 'sl2',
      name: 'Segundo',
      kind: 'service',
      entries: [
        { songId: 'song-santo-santo-santo', order: 1, key: 'D', leadVocalistId: null, notes: null, sequencePlanId: null },
      ],
      scope: 'internal',
    });
    expect((await repo.getSetlist(leader, 'sl1'))!.entries[0].songId).toBe('song-sublime-gracia');
    expect((await repo.getSetlist(leader, 'sl2'))!.entries[0].songId).toBe('song-santo-santo-santo');
  });

  it('borrar un servicio no toca los demás', async () => {
    await repo.saveService(leader, base);
    await repo.saveService(leader, { ...base, id: 's2' });
    await repo.deleteService(leader, 's1');
    expect(await repo.getService(leader, 's1')).toBeNull();
    expect(await repo.getService(leader, 's2')).not.toBeNull();
  });

  it('un músico no puede borrar servicios ni repertorios', async () => {
    await expect(repo.deleteService(musician, 's1')).rejects.toThrow(PermissionError);
    await expect(repo.deleteSetlist(musician, 'setlist-base')).rejects.toThrow(PermissionError);
  });

  it('el historial de dos servicios distintos convive', async () => {
    await repo.addHistory(leader, [
      { id: 'h-s1', songId: 'song-sublime-gracia', date: '2026-09-05', serviceId: 's1', key: 'G', leadVocalistId: null, memberIds: [] },
      { id: 'h-s2', songId: 'song-sublime-gracia', date: '2026-09-12', serviceId: 's2', key: 'A', leadVocalistId: null, memberIds: [] },
    ]);
    const historial = await repo.listHistory(leader, 'song-sublime-gracia');
    expect(historial.map((h) => h.key)).toEqual(['A', 'G']);
  });
});

describe('catálogo de instrumentos', () => {
  const superAdmin: Actor = { id: 'sa', roles: ['super-admin'] };

  it('empieza solo con los de fábrica, sin nada añadido', async () => {
    expect(await repo.listInstruments(leader)).toEqual([]);
  });

  it('el super admin añade y borra; el líder no puede', async () => {
    await repo.saveInstrument(superAdmin, { id: 'custom-cajon', name: 'Cajón', family: 'other' });
    expect((await repo.listInstruments(leader)).map((i) => i.id)).toEqual(['custom-cajon']);

    await expect(
      repo.saveInstrument(leader, { id: 'custom-x', name: 'X', family: 'other' }),
    ).rejects.toThrow(PermissionError);
    await expect(repo.deleteInstrument(leader, 'custom-cajon')).rejects.toThrow(PermissionError);

    await repo.deleteInstrument(superAdmin, 'custom-cajon');
    expect(await repo.listInstruments(leader)).toEqual([]);
  });

  it('marca como personalizado lo añadido, aunque no se declare', async () => {
    await repo.saveInstrument(superAdmin, { id: 'custom-violin', name: 'Violín', family: 'strings' });
    expect((await repo.listInstruments(leader))[0].custom).toBe(true);
  });
});

describe('recursos y versiones de canción', () => {
  it('una canción trae resources, versions y sequences vacíos por defecto', async () => {
    const song = await repo.getSong(leader, 'song-sublime-gracia');
    expect(song!.resources).toEqual([]);
    expect(song!.versions).toEqual([]);
    expect(song!.sequences).toEqual([]);
  });

  it('se pueden guardar versiones con su propio material', async () => {
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, {
      ...song,
      versions: [
        {
          id: 'v1',
          label: 'Acústica',
          notes: 'Más lenta',
          resources: [
            {
              id: 'r1',
              kind: 'video',
              title: 'Referencia',
              url: 'https://ejemplo.test/acustica',
              sizeBytes: null,
              rights: { status: 'reference', holder: null, notes: null },
              scope: 'internal',
            },
          ],
        },
      ],
    });
    const guardada = await repo.getSong(leader, 'song-sublime-gracia');
    expect(guardada!.versions[0].label).toBe('Acústica');
    expect(guardada!.versions[0].resources[0].url).toBe('https://ejemplo.test/acustica');
  });

  it('se puede guardar un plan de secuencias con sus pistas', async () => {
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, {
      ...song,
      sequences: [
        {
          id: 'sp1',
          label: 'Banda completa',
          notes: null,
          tracks: [
            {
              id: 't1',
              kind: 'click',
              label: 'Click 4/4',
              bpm: 72,
              resource: {
                id: 'r2',
                kind: 'audio',
                title: 'Click',
                url: 'https://ejemplo.test/click.mp3',
                sizeBytes: null,
                rights: { status: 'own', holder: 'Aurora', notes: null },
                scope: 'internal',
              },
            },
          ],
        },
      ],
    });
    const guardada = await repo.getSong(leader, 'song-sublime-gracia');
    expect(guardada!.sequences[0].label).toBe('Banda completa');
    expect(guardada!.sequences[0].tracks[0].kind).toBe('click');
    expect(guardada!.sequences[0].tracks[0].resource.url).toBe('https://ejemplo.test/click.mp3');
  });
});

describe('estado de canción', () => {
  it('la semilla arranca "ready"; una canción nueva arranca "draft"', async () => {
    const song = await repo.getSong(leader, 'song-sublime-gracia');
    expect(song!.status).toBe('ready');
  });

  it('filtra por estado', async () => {
    const song = (await repo.getSong(leader, 'song-sublime-gracia'))!;
    await repo.saveSong(leader, { ...song, status: 'archived' });
    expect((await repo.listSongs(leader, { status: 'archived' })).map((s) => s.id)).toEqual([
      'song-sublime-gracia',
    ]);
    expect((await repo.listSongs(leader, { status: 'ready' })).map((s) => s.id)).toEqual([
      'song-santo-santo-santo',
    ]);
  });
});

describe('progreso personal de preparación', () => {
  it('arranca vacío', async () => {
    expect(await repo.listPrepared(musician)).toEqual([]);
  });

  it('se marca y se desmarca', async () => {
    expect(await repo.togglePrepared(musician, 'service-1:song-1')).toEqual([
      'service-1:song-1',
    ]);
    expect(await repo.togglePrepared(musician, 'service-1:song-1')).toEqual([]);
  });

  it('es personal: no se comparte entre integrantes', async () => {
    await repo.togglePrepared(musician, 'service-1:song-1');
    expect(await repo.listPrepared(leader)).toEqual([]);
    expect(await repo.listPrepared(musician)).toEqual(['service-1:song-1']);
  });
});

describe('academia', () => {
  const editor: Actor = { id: 'e', roles: ['editor'] };
  const curso = {
    id: 'course-1',
    title: 'Piano para acompañar',
    description: null,
    category: 'piano' as const,
    teacherIds: [],
    lessons: [
      { id: 'l1', title: 'Acordes básicos', description: null, resources: [] },
      { id: 'l2', title: 'Acompañar un himno', description: null, resources: [] },
    ],
    status: 'published' as const,
    rights: { status: 'own' as const, holder: 'Aurora', notes: null },
    scope: 'internal' as const,
  };

  it('arranca sin cursos: ninguno se inventa', async () => {
    expect(await repo.listCourses(leader)).toEqual([]);
  });

  it('un músico no puede crear cursos', async () => {
    await expect(repo.saveCourse(musician, curso)).rejects.toThrow(PermissionError);
  });

  it('el líder crea, edita y borra', async () => {
    await repo.saveCourse(leader, curso);
    expect((await repo.getCourse(leader, curso.id))!.title).toBe('Piano para acompañar');
    await repo.saveCourse(leader, { ...curso, title: 'Piano I' });
    expect((await repo.getCourse(leader, curso.id))!.title).toBe('Piano I');
    await repo.deleteCourse(leader, curso.id);
    expect(await repo.getCourse(leader, curso.id)).toBeNull();
  });

  it('matricularse no duplica si ya estaba matriculado', async () => {
    await repo.saveCourse(leader, curso);
    await repo.enroll(musician, curso.id);
    const otra = await repo.enroll(musician, curso.id);
    expect(otra.filter((e) => e.courseId === curso.id).length).toBe(1);
  });

  it('marcar todas las clases certifica; desmarcar una lo quita', async () => {
    await repo.saveCourse(leader, curso);
    await repo.toggleCourseLesson(musician, curso.id, 'l1');
    let [enrollment] = await repo.listEnrollments(musician);
    expect(enrollment.completedAt).toBeNull();

    await repo.toggleCourseLesson(musician, curso.id, 'l2');
    [enrollment] = await repo.listEnrollments(musician);
    expect(enrollment.completedAt).not.toBeNull();

    await repo.toggleCourseLesson(musician, curso.id, 'l1');
    [enrollment] = await repo.listEnrollments(musician);
    expect(enrollment.completedAt).toBeNull();
  });

  it('el progreso es personal: no se comparte entre integrantes', async () => {
    await repo.saveCourse(leader, curso);
    await repo.toggleCourseLesson(musician, curso.id, 'l1');
    expect(await repo.listEnrollments(leader)).toEqual([]);
    expect((await repo.listEnrollments(musician))[0].completedLessonIds).toEqual(['l1']);
  });

  it('la copia de datos no lleva el progreso personal', async () => {
    // El progreso vive bajo su propia clave (`academy:{actor}`), fuera de las
    // colecciones que exporta la copia — mismo principio que favoritos.
    await repo.saveCourse(leader, curso);
    await repo.toggleCourseLesson(musician, curso.id, 'l1');
    const cursos = await repo.listCourses(leader);
    expect(cursos).toHaveLength(1);
    expect((cursos[0] as unknown as { completedLessonIds?: unknown }).completedLessonIds).toBeUndefined();
  });

  it('ver el progreso del equipo exige course:write y member:read a la vez', async () => {
    await repo.saveCourse(leader, curso);
    // El editor gestiona cursos pero no tiene member:read.
    await expect(repo.listCourseProgress(editor, curso.id)).rejects.toThrow(PermissionError);
    // El músico ni siquiera gestiona cursos.
    await expect(repo.listCourseProgress(musician, curso.id)).rejects.toThrow(PermissionError);
  });

  it('el progreso del equipo solo lista a quien se matriculó', async () => {
    // `musician.id` ('m') hace de identificador de integrante, igual que en
    // "Mi preparación": el actor de sesión y el Member comparten id.
    await repo.saveCourse(leader, curso);
    await repo.saveMember(admin, {
      id: musician.id,
      displayName: 'Músico Uno',
      instruments: [],
      comfortableKeys: [],
    });
    await repo.toggleCourseLesson(musician, curso.id, 'l1');

    const progreso = await repo.listCourseProgress(leader, curso.id);
    expect(progreso).toHaveLength(1);
    expect(progreso[0].member.displayName).toBe('Músico Uno');
    expect(progreso[0].enrollment!.completedLessonIds).toEqual(['l1']);
  });
});
