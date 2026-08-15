import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BLOCKS,
  emptyRehearsal,
  formatDuration,
  nextWednesday,
  totalMinutes,
} from '../../src/domain/rehearsal-factory';

describe('estructura por defecto', () => {
  it('refleja los seis bloques del manual', () => {
    expect(DEFAULT_BLOCKS.map((b) => b.title)).toEqual([
      'Oración y reflexión',
      'Preparación',
      'Ejercicios',
      'Repertorio',
      'Revisión',
      'Cierre',
    ]);
  });

  it('suma las dos horas del manual', () => {
    expect(totalMinutes(DEFAULT_BLOCKS)).toBe(120);
  });

  it('se copia en cada ensayo: cambiar uno no toca la plantilla', () => {
    const uno = emptyRehearsal();
    uno.blocks = [...uno.blocks.slice(1)];
    expect(DEFAULT_BLOCKS).toHaveLength(6);
    expect(emptyRehearsal().blocks).toHaveLength(6);
  });
});

describe('formatDuration', () => {
  it.each([
    [120, '2 h'],
    [105, '1 h 45 min'],
    [45, '45 min'],
    [60, '1 h'],
    [0, '0 min'],
  ])('%i min → "%s"', (minutos, esperado) => {
    expect(formatDuration(minutos)).toBe(esperado);
  });
});

describe('nextWednesday', () => {
  it('desde un lunes da el miércoles de esa semana', () => {
    // 2026-08-17 es lunes.
    expect(nextWednesday(new Date('2026-08-17T12:00:00'))).toBe('2026-08-19');
  });

  it('desde un miércoles da el siguiente, no hoy', () => {
    expect(nextWednesday(new Date('2026-08-19T12:00:00'))).toBe('2026-08-26');
  });

  it('desde un jueves salta a la semana siguiente', () => {
    expect(nextWednesday(new Date('2026-08-20T12:00:00'))).toBe('2026-08-26');
  });

  it('siempre cae en miércoles', () => {
    for (let i = 0; i < 14; i++) {
      const desde = new Date('2026-08-01T12:00:00');
      desde.setDate(desde.getDate() + i);
      const resultado = new Date(`${nextWednesday(desde)}T12:00:00`);
      expect(resultado.getDay()).toBe(3);
    }
  });
});
