import { newId } from './song-factory';
import type { Course, Enrollment, Lesson } from './model';

/**
 * Curso vacío.
 *
 * Igual que `emptySong`: ámbito `internal` y derechos `reference` por
 * defecto, para que publicar o redistribuir sea una decisión consciente de
 * quien edita, no lo que ocurre por no tocar el campo.
 */
export function emptyCourse(): Course {
  return {
    id: newId('course'),
    title: '',
    description: null,
    category: 'worship',
    teacherIds: [],
    lessons: [],
    status: 'draft',
    rights: { status: 'reference', holder: null, notes: null },
    scope: 'internal',
  };
}

export function emptyLesson(): Lesson {
  return { id: newId('lesson'), title: '', description: null, resources: [] };
}

export function newEnrollment(courseId: string, at: string = new Date().toISOString()): Enrollment {
  return { courseId, enrolledAt: at, completedLessonIds: [], completedAt: null };
}

/**
 * Marca o desmarca una lección como vista, y recalcula `completedAt`.
 *
 * `lessons` manda sobre `completedLessonIds`: si una lección se borra del
 * curso después de que alguien la completara, deja de contar para el total,
 * así que un curso al que le quitan una clase no queda completo a medias por
 * un id que ya no existe.
 */
export function toggleLesson(
  enrollment: Enrollment,
  lessons: readonly Lesson[],
  lessonId: string,
  now: string = new Date().toISOString(),
): Enrollment {
  const validIds = new Set(lessons.map((l) => l.id));
  const toggled = enrollment.completedLessonIds.includes(lessonId)
    ? enrollment.completedLessonIds.filter((id) => id !== lessonId)
    : [...enrollment.completedLessonIds, lessonId];
  const completedLessonIds = toggled.filter((id) => validIds.has(id));

  const allDone = lessons.length > 0 && lessons.every((l) => completedLessonIds.includes(l.id));

  return { ...enrollment, completedLessonIds, completedAt: allDone ? now : null };
}
