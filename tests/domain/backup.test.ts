import { beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_VERSION,
  BackupError,
  backupFilename,
  exportBackup,
  importBackup,
  parseBackup,
  summarize,
} from '../../src/data/backup';
import { PermissionError, StoredRepository } from '../../src/data/repository';
import { MemoryStore } from '../../src/data/store';
import { ANONYMOUS, type Actor } from '../../src/domain/rbac/roles';

const admin: Actor = { id: 'a', roles: ['admin'] };
const leader: Actor = { id: 'l', roles: ['leader'] };
const musician: Actor = { id: 'm', roles: ['musician'] };

let store: MemoryStore;
let repo: StoredRepository;

beforeEach(async () => {
  store = new MemoryStore();
  repo = new StoredRepository(store);
  // Toca las colecciones para que se siembren.
  await repo.listSongs(admin);
  await repo.listSetlists(admin);
  await repo.listServices(admin);
});

describe('exportar', () => {
  it('el admin saca una copia con las canciones dentro', async () => {
    const copia = await exportBackup(admin, store);
    expect(copia.formato).toBe('aurora-worship');
    expect(copia.version).toBe(BACKUP_VERSION);
    expect(copia.datos.songs.length).toBeGreaterThan(0);
  });

  it('el líder también puede: reparte la copia al equipo', async () => {
    await expect(exportBackup(leader, store)).resolves.toBeDefined();
  });

  it('un músico no puede sacar copia de todo el ministerio', async () => {
    await expect(exportBackup(musician, store)).rejects.toThrow(PermissionError);
  });

  it('los favoritos no viajan: son personales', async () => {
    await repo.toggleFavorite(musician, 'song-sublime-gracia');
    const copia = await exportBackup(admin, store);
    expect(JSON.stringify(copia)).not.toContain('favorites');
  });

  it('incluye las seis colecciones aunque estén vacías', async () => {
    const copia = await exportBackup(admin, store);
    expect(Object.keys(copia.datos).sort()).toEqual(
      ['members', 'rehearsals', 'services', 'setlists', 'songs', 'tutorials'].sort(),
    );
  });
});

describe('validar antes de tocar nada', () => {
  it('rechaza lo que no es JSON', () => {
    expect(() => parseBackup('esto no es json')).toThrow(BackupError);
  });

  it('rechaza un JSON que no es una copia de Aurora', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow(/no es una copia de Aurora/);
  });

  it('rechaza una copia de una versión futura en vez de romperse a medias', () => {
    const futura = JSON.stringify({ formato: 'aurora-worship', version: 99, datos: {} });
    expect(() => parseBackup(futura)).toThrow(/Actualiza la aplicación/);
  });

  it('rechaza una colección corrupta', () => {
    const rota = JSON.stringify({
      formato: 'aurora-worship',
      version: 1,
      datos: { songs: 'no soy un array' },
    });
    expect(() => parseBackup(rota)).toThrow(/corrupta/);
  });

  it('acepta una copia legítima', async () => {
    const copia = await exportBackup(admin, store);
    expect(parseBackup(JSON.stringify(copia)).datos.songs.length).toBe(copia.datos.songs.length);
  });
});

describe('importar', () => {
  it('un músico no puede sobrescribir los datos del ministerio', async () => {
    const copia = await exportBackup(admin, store);
    await expect(importBackup(musician, store, copia)).rejects.toThrow(PermissionError);
  });

  it('un líder tampoco: importar es destructivo', async () => {
    const copia = await exportBackup(admin, store);
    await expect(importBackup(leader, store, copia)).rejects.toThrow(PermissionError);
  });

  it('el anónimo, menos todavía', async () => {
    const copia = await exportBackup(admin, store);
    await expect(importBackup(ANONYMOUS, store, copia)).rejects.toThrow(PermissionError);
  });

  it('ida y vuelta: exportar, borrar todo, importar y recuperar', async () => {
    const copia = await exportBackup(admin, store);
    const titulos = copia.datos.songs.map((s) => s.title).sort();

    await repo.deleteSong(admin, 'song-sublime-gracia');
    await repo.deleteSong(admin, 'song-santo-santo-santo');
    expect(await repo.listSongs(admin)).toEqual([]);

    await importBackup(admin, store, copia);
    expect((await repo.listSongs(admin)).map((s) => s.title).sort()).toEqual(titulos);
  });

  it('mueve los datos de un dispositivo a otro', async () => {
    await repo.saveMember(admin, {
      id: 'm1',
      displayName: 'Integrante',
      instruments: ['piano'],
      comfortableKeys: [],
    });
    const copia = await exportBackup(admin, store);

    const otroTelefono = new MemoryStore();
    const otroRepo = new StoredRepository(otroTelefono);
    await importBackup(admin, otroTelefono, copia);

    expect((await otroRepo.listMembers(admin)).map((m) => m.displayName)).toEqual(['Integrante']);
    expect((await otroRepo.listSongs(admin)).length).toBe(copia.datos.songs.length);
  });

  it('devuelve el recuento de lo importado', async () => {
    const copia = await exportBackup(admin, store);
    const resumen = await importBackup(admin, store, copia);
    expect(resumen.songs).toBe(copia.datos.songs.length);
    expect(resumen.members).toBe(0);
  });

  it('summarize cuenta lo mismo sin escribir nada', async () => {
    const copia = await exportBackup(admin, store);
    expect(summarize(copia).songs).toBe(copia.datos.songs.length);
  });
});

describe('nombre de archivo', () => {
  it('lleva la fecha para que las copias no se pisen', () => {
    expect(backupFilename(new Date('2026-08-15T10:00:00Z'))).toBe('aurora-worship-2026-08-15.json');
  });
});
