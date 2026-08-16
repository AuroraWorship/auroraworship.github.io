import { describe, expect, it } from 'vitest';
import { emptyCourse, emptyLesson, newEnrollment, toggleLesson } from '../../src/domain/course-factory';
import type { Lesson } from '../../src/domain/model';

const lesson = (id: string): Lesson => ({ id, title: id, description: null, resources: [] });

describe('emptyCourse / emptyLesson', () => {
  it('arranca en borrador, ámbito interno y derechos de referencia', () => {
    const course = emptyCourse();
    expect(course.status).toBe('draft');
    expect(course.scope).toBe('internal');
    expect(course.rights.status).toBe('reference');
    expect(course.lessons).toEqual([]);
    expect(course.teacherIds).toEqual([]);
  });

  it('una lección vacía no trae material ni descripción', () => {
    const l = emptyLesson();
    expect(l.title).toBe('');
    expect(l.description).toBeNull();
    expect(l.resources).toEqual([]);
  });
});

describe('toggleLesson', () => {
  const lecciones = [lesson('l1'), lesson('l2')];

  it('marca una lección como vista', () => {
    const enrollment = newEnrollment('c1', '2026-01-01T00:00:00.000Z');
    const next = toggleLesson(enrollment, lecciones, 'l1', '2026-01-02T00:00:00.000Z');
    expect(next.completedLessonIds).toEqual(['l1']);
    expect(next.completedAt).toBeNull();
  });

  it('la desmarca si ya estaba', () => {
    const enrollment = { ...newEnrollment('c1'), completedLessonIds: ['l1'] };
    const next = toggleLesson(enrollment, lecciones, 'l1');
    expect(next.completedLessonIds).toEqual([]);
  });

  it('marca completado solo cuando están todas', () => {
    const enrollment = { ...newEnrollment('c1'), completedLessonIds: ['l1'] };
    const next = toggleLesson(enrollment, lecciones, 'l2', '2026-03-01T00:00:00.000Z');
    expect([...next.completedLessonIds].sort()).toEqual(['l1', 'l2']);
    expect(next.completedAt).toBe('2026-03-01T00:00:00.000Z');
  });

  it('desmarcar una lección de un curso completo quita el certificado', () => {
    const enrollment = {
      ...newEnrollment('c1'),
      completedLessonIds: ['l1', 'l2'],
      completedAt: '2026-03-01T00:00:00.000Z',
    };
    const next = toggleLesson(enrollment, lecciones, 'l2');
    expect(next.completedAt).toBeNull();
  });

  it('una lección borrada del curso no cuenta para completar', () => {
    // Alguien completó l1 y l2, pero l2 se borró del curso después.
    const enrollment = { ...newEnrollment('c1'), completedLessonIds: ['l1', 'l2'] };
    const next = toggleLesson(enrollment, [lesson('l1')], 'l1');
    // Desmarcar l1 no debería dejar "l2" colgando en la lista.
    expect(next.completedLessonIds).toEqual([]);
  });

  it('un curso sin lecciones nunca se da por completo', () => {
    const enrollment = newEnrollment('c1');
    const next = toggleLesson(enrollment, [], 'inexistente');
    expect(next.completedAt).toBeNull();
  });
});
