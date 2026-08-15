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
