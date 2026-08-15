import { describe, expect, it } from 'vitest';
import { InMemoryRepository } from '../../src/data/repository';
import { ANONYMOUS, type Actor } from '../../src/domain/rbac/roles';

const leader: Actor = { id: 'l', roles: ['leader'] };
const repo = new InMemoryRepository();

describe('aislamiento por ámbito', () => {
  it('el anónimo solo recibe canciones públicas', async () => {
    const songs = await repo.listSongs(ANONYMOUS);
    expect(songs.every((s) => s.scope === 'public')).toBe(true);
  });

  it('el anónimo no ve repertorios internos', async () => {
    expect(await repo.listSetlists(ANONYMOUS)).toEqual([]);
    expect(await repo.listServices(ANONYMOUS)).toEqual([]);
    expect(await repo.listTutorials(ANONYMOUS)).toEqual([]);
  });

  it('el líder sí los ve', async () => {
    expect((await repo.listSetlists(leader)).length).toBeGreaterThan(0);
    expect((await repo.listServices(leader)).length).toBeGreaterThan(0);
  });

  it('getSong respeta el ámbito', async () => {
    const song = await repo.getSong(ANONYMOUS, 'song-sublime-gracia');
    expect(song?.scope).toBe('public');
  });

  it('devuelve null si la canción no existe', async () => {
    expect(await repo.getSong(leader, 'no-existe')).toBeNull();
  });
});

describe('búsqueda', () => {
  it('encuentra por título', async () => {
    const found = await repo.listSongs(leader, { text: 'sublime' });
    expect(found.map((s) => s.id)).toContain('song-sublime-gracia');
  });

  it('encuentra por letra', async () => {
    const found = await repo.listSongs(leader, { text: 'omnipotente' });
    expect(found.map((s) => s.id)).toEqual(['song-santo-santo-santo']);
  });

  it('encuentra por etiqueta', async () => {
    const found = await repo.listSongs(leader, { tag: 'himno' });
    expect(found.length).toBe(2);
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
    expect(songs.every((s) => s.rights.status === 'public-domain' || s.rights.status === 'own')).toBe(true);
  });

  it('no hay integrantes inventados', async () => {
    const songs = await repo.listSongs(leader);
    expect(songs.every((s) => s.vocalistKeys.length === 0)).toBe(true);
  });

  it('las entradas de repertorio apuntan a canciones existentes', async () => {
    const setlists = await repo.listSetlists(leader);
    for (const setlist of setlists) {
      for (const entry of setlist.entries) {
        expect(await repo.getSong(leader, entry.songId)).not.toBeNull();
      }
    }
  });
});
