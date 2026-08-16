import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  COURSE_STATUS_LABELS,
  TUTORIAL_CATEGORY_LABELS,
  type Course,
  type Enrollment,
  type Member,
} from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository, type CourseProgress } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const KIND_ICONS: Record<string, string> = {
  video: '▶',
  audio: '♫',
  pdf: '▤',
  image: '▣',
  link: '↗',
  text: '¶',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    date,
  );
}

/**
 * Detalle de un curso.
 *
 * Dos vistas en una pantalla, según el permiso: quien enseña ve el roster de
 * progreso; quien estudia ve sus propias lecciones y, al terminarlas todas,
 * el certificado. Ninguna de las dos necesita una pantalla aparte.
 */
export function CoursePage() {
  const { courseId } = useParams();
  const { actor, memberId } = useSession();

  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [teachers, setTeachers] = useState<readonly Member[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<readonly CourseProgress[] | null>(null);
  const [me, setMe] = useState<Member | null>(null);

  const allowed = can(actor, 'course:read');
  const puedeEscribir = can(actor, 'course:write');

  useEffect(() => {
    if (!allowed || !courseId) return;
    let active = true;

    (async () => {
      const found = await repository.getCourse(actor, courseId);
      const enrollments = await repository.listEnrollments(actor);
      const equipo = can(actor, 'member:read') ? await repository.listMembers(actor) : [];
      if (!active) return;
      setCourse(found);
      setEnrollment(enrollments.find((e) => e.courseId === courseId) ?? null);
      setTeachers(found ? equipo.filter((m) => found.teacherIds.includes(m.id)) : []);
      setMe(memberId ? (equipo.find((m) => m.id === memberId) ?? null) : null);

      if (found && can(actor, 'course:write') && can(actor, 'member:read')) {
        setProgress(await repository.listCourseProgress(actor, courseId));
      }
    })();

    return () => {
      active = false;
    };
  }, [actor, courseId, allowed, memberId]);

  if (!allowed) return <NoAccess />;
  if (course === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (course === null || !courseId) return <EmptyState title="Curso no encontrado" />;

  const empezar = async () => {
    const next = await repository.enroll(actor, courseId);
    setEnrollment(next.find((e) => e.courseId === courseId) ?? null);
  };

  const marcar = async (lessonId: string) => {
    const next = await repository.toggleCourseLesson(actor, courseId, lessonId);
    setEnrollment(next.find((e) => e.courseId === courseId) ?? null);
  };

  const completadas = enrollment?.completedLessonIds.length ?? 0;
  const total = course.lessons.length;

  return (
    <div className="space-y-5 pb-4">
      <div>
        <Link to="/academia" className="text-sm text-aurora-muted">
          ← Academia
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-aurora-violet-soft">
              {TUTORIAL_CATEGORY_LABELS[course.category]}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{course.title || 'Sin título'}</h1>
          </div>
          {puedeEscribir && (
            <Link
              to={`/academia/${course.id}/editar`}
              className="flex h-11 shrink-0 items-center rounded-lg border border-aurora-border px-3 text-sm"
            >
              Editar
            </Link>
          )}
        </div>
        {puedeEscribir && course.status !== 'published' && (
          <p className="mt-1 text-xs text-aurora-muted">
            {COURSE_STATUS_LABELS[course.status]} — solo lo ve quien gestiona Academia.
          </p>
        )}
      </div>

      {course.description && <p className="text-sm text-aurora-text/90">{course.description}</p>}

      {teachers.length > 0 && (
        <p className="text-sm text-aurora-muted">
          Enseña {teachers.map((t) => t.displayName).join(', ')}
        </p>
      )}

      {total === 0 ? (
        <EmptyState title="Este curso todavía no tiene clases">
          {puedeEscribir && 'Añádelas desde Editar.'}
        </EmptyState>
      ) : !enrollment ? (
        <div className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
          <p className="text-sm text-aurora-muted">
            {total} {total === 1 ? 'clase' : 'clases'}. Empieza cuando quieras — tu avance se
            guarda en este teléfono.
          </p>
          <button
            type="button"
            onClick={empezar}
            className="mt-3 h-12 w-full rounded-xl bg-aurora-violet-solid text-sm font-medium text-white"
          >
            Empezar curso
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-aurora-muted">Tu progreso</span>
              <span className="font-medium">
                {completadas} de {total} clases
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-aurora-surface-2">
              <div
                className="h-full rounded-full bg-aurora-violet-solid transition-all"
                style={{ width: `${(completadas / total) * 100}%` }}
              />
            </div>
          </div>

          {enrollment.completedAt && (
            <div className="rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-4 print:border-none print:bg-transparent">
              <p className="text-xs font-semibold uppercase tracking-wide text-aurora-ember">
                Certificado
              </p>
              <p className="mt-2 text-sm">
                {me ? me.displayName : 'Este integrante'} completó <strong>{course.title}</strong>{' '}
                el {formatDateTime(enrollment.completedAt)}.
              </p>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-3 h-11 rounded-lg border border-aurora-border px-4 text-sm print:hidden"
              >
                Imprimir certificado
              </button>
            </div>
          )}
        </>
      )}

      {total > 0 && (
        <ol className="space-y-2">
          {course.lessons.map((lesson, index) => {
            const hecha = enrollment?.completedLessonIds.includes(lesson.id) ?? false;
            return (
              <li key={lesson.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
                <div className="flex items-start gap-3">
                  {enrollment && (
                    <button
                      type="button"
                      onClick={() => marcar(lesson.id)}
                      aria-pressed={hecha}
                      aria-label={hecha ? `Marcar "${lesson.title}" como no vista` : `Marcar "${lesson.title}" como vista`}
                      className={[
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm',
                        hecha
                          ? 'border-aurora-ember bg-aurora-ember/20 text-aurora-ember'
                          : 'border-aurora-border text-aurora-muted',
                      ].join(' ')}
                    >
                      {hecha ? '✓' : index + 1}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{lesson.title || 'Sin título'}</p>
                    {lesson.description && (
                      <p className="mt-1 text-sm text-aurora-muted">{lesson.description}</p>
                    )}
                    {lesson.resources.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {lesson.resources.map((resource) => (
                          <li key={resource.id}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-11 items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-sm"
                            >
                              <span aria-hidden className="text-aurora-violet-soft">
                                {KIND_ICONS[resource.kind] ?? '↗'}
                              </span>
                              <span className="min-w-0 truncate">
                                {resource.title || resource.url}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {puedeEscribir && progress !== null && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
            Progreso del equipo
          </h2>
          {progress.length === 0 ? (
            <p className="text-sm text-aurora-muted">Nadie se ha matriculado todavía.</p>
          ) : (
            <ul className="space-y-2">
              {progress.map(({ member, enrollment: e }) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-3 text-sm"
                >
                  <span className="min-w-0 truncate">{member.displayName}</span>
                  <span className="shrink-0 text-aurora-muted">
                    {e?.completedAt
                      ? `Completado el ${formatDateTime(e.completedAt)}`
                      : `${e?.completedLessonIds.length ?? 0} de ${total}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
