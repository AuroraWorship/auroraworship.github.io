import { describe, expect, it } from 'vitest';
import { copyEntries, emptyService, nextSaturday } from '../../src/domain/service-factory';
import { PENDING } from '../../src/domain/model';

describe('emptyService', () => {
  it('crea el servicio con su propio repertorio enlazado', () => {
    const { service, setlist } = emptyService('Vigilia');
    expect(service.setlistId).toBe(setlist.id);
    expect(setlist.kind).toBe('service');
    expect(setlist.name).toBe('Vigilia');
  });

  it('dos servicios nuevos no comparten repertorio', () => {
    expect(emptyService().setlist.id).not.toBe(emptyService().setlist.id);
  });

  it('arranca sin fecha: no se inventa cuándo es', () => {
    expect(emptyService().service.date).toBe(PENDING);
  });

  it('arranca en ámbito interno', () => {
    expect(emptyService().service.scope).toBe('internal');
  });
});

describe('copyEntries', () => {
  const anterior = {
    id: 'sl',
    name: 'Anterior',
    kind: 'service' as const,
    entries: [
      { songId: 'b', order: 2, key: 'D', leadVocalistId: 'm1', notes: null, sequencePlanId: null },
      { songId: 'a', order: 1, key: 'G', leadVocalistId: 'm2', notes: null, sequencePlanId: null },
    ],
    scope: 'internal' as const,
  };

  it('conserva el orden y las tonalidades', () => {
    const copia = copyEntries(anterior);
    expect(copia.map((e) => e.songId)).toEqual(['a', 'b']);
    expect(copia.map((e) => e.key)).toEqual(['G', 'D']);
  });

  it('NO copia quién cantó: eso se decide cada vez', () => {
    expect(copyEntries(anterior).every((e) => e.leadVocalistId === null)).toBe(true);
  });

  it('renumera desde uno', () => {
    expect(copyEntries(anterior).map((e) => e.order)).toEqual([1, 2]);
  });
});

describe('nextSaturday', () => {
  it('desde un lunes da el sábado de esa semana', () => {
    expect(nextSaturday(new Date('2026-08-17T12:00:00'))).toBe('2026-08-22');
  });

  it('desde un sábado da el siguiente, no hoy', () => {
    expect(nextSaturday(new Date('2026-08-22T12:00:00'))).toBe('2026-08-29');
  });

  it('siempre cae en sábado', () => {
    for (let i = 0; i < 14; i++) {
      const desde = new Date('2026-08-01T12:00:00');
      desde.setDate(desde.getDate() + i);
      expect(new Date(`${nextSaturday(desde)}T12:00:00`).getDay()).toBe(6);
    }
  });
});

describe('emptySong (status por defecto)', () => {
  it('una canción nueva arranca como borrador', async () => {
    const { emptySong } = await import('../../src/domain/song-factory');
    expect(emptySong().status).toBe('draft');
  });
});
