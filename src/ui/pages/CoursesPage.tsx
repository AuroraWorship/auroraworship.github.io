import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COURSE_STATUS_LABELS, TUTORIAL_CATEGORY_LABELS, type Course } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

/**
 * Academia.
 *
 * Fase 4 del brief: cursos con lecciones propias, no enlaces sueltos como en
 * Tutoriales. Quien no gestiona contenido solo ve lo publicado — un curso en
 * borrador no es material listo para nadie más que quien lo escribe.
 */
export function CoursesPage() {
  const { actor } = useSession();
  const [courses, setCourses] = useState<readonly Course[] | null>(null);

  const allowed = can(actor, 'course:read');
  const puedeEscribir = can(actor, 'course:write');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    repository.listCourses(actor).then((result) => {
      if (active) setCourses(result);
    });
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;

  const mostrados = puedeEscribir ? courses : (courses ?? []).filter((c) => c.status === 'published');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Academia</h1>
          <p className="text-sm text-aurora-muted">
            {courses === null ? 'Cargando…' : `${mostrados?.length ?? 0} cursos`}
          </p>
        </div>
        {puedeEscribir && (
          <Link
            to="/academia/nuevo"
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Nuevo
          </Link>
        )}
      </div>

      {mostrados?.length === 0 && (
        <EmptyState title="Todavía no hay cursos aquí">
          {puedeEscribir
            ? 'Crea el primero con sus clases y su material.'
            : 'El equipo de enseñanza aún no ha publicado ninguno.'}
        </EmptyState>
      )}

      <ul className="space-y-2">
        {mostrados?.map((course) => (
          <li key={course.id}>
            <Link
              to={`/academia/${course.id}`}
              className="block rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-aurora-violet-soft">
                    {TUTORIAL_CATEGORY_LABELS[course.category]}
                  </p>
                  <p className="mt-1 font-medium">{course.title || 'Sin título'}</p>
                  <p className="text-sm text-aurora-muted">
                    {course.lessons.length} {course.lessons.length === 1 ? 'clase' : 'clases'}
                  </p>
                </div>
                {course.status !== 'published' && (
                  <span className="shrink-0 rounded-lg bg-aurora-bg px-2 py-1 text-xs font-semibold text-aurora-muted">
                    {COURSE_STATUS_LABELS[course.status]}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
