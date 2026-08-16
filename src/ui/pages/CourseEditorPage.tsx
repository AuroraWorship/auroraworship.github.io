import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  COURSE_STATUS_LABELS,
  TUTORIAL_CATEGORY_LABELS,
  isRedistributable,
  type Course,
  type CourseStatus,
  type Lesson,
  type Member,
  type RightsStatus,
  type TutorialCategory,
} from '../../domain/model';
import { emptyCourse, emptyLesson } from '../../domain/course-factory';
import { ResourceListEditor, hasIncompleteResource } from '../components/ResourceListEditor';
import { can, type Scope } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const SCOPE_LABELS: Record<Scope, string> = {
  internal: 'Interno — solo el equipo',
  members: 'Miembros',
  public: 'Público',
};

/**
 * Editor de curso.
 *
 * Las lecciones son la unidad real: un curso sin clases es una ficha vacía,
 * así que la lista de lecciones vive aquí mismo y no en una pantalla aparte,
 * igual que los bloques de un ensayo (LOOP 006).
 */
export function CourseEditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();

  const isNew = !courseId;
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allowed = can(actor, 'course:write');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const found = isNew ? emptyCourse() : await repository.getCourse(actor, courseId);
      const equipo = can(actor, 'member:read') ? await repository.listMembers(actor) : [];
      if (!active) return;
      setCourse(found);
      setMembers(equipo);
    })();
    return () => {
      active = false;
    };
  }, [actor, courseId, isNew, allowed]);

  if (!allowed) return <NoAccess />;
  if (course === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (course === null) return <EmptyState title="Curso no encontrado" />;

  const patch = (changes: Partial<Course>) => setCourse({ ...course, ...changes });

  const patchLesson = (index: number, changes: Partial<Lesson>) =>
    patch({ lessons: course.lessons.map((l, i) => (i === index ? { ...l, ...changes } : l)) });

  const save = async () => {
    if (!course.title.trim()) {
      setError('El curso necesita un título.');
      return;
    }
    if (course.lessons.some((l) => !l.title.trim())) {
      setError('Hay una clase sin título. Complétala o quítala.');
      return;
    }
    if (course.lessons.some((l) => hasIncompleteResource(l.resources))) {
      setError('Hay material sin enlace en alguna clase. Complétalo o quítalo.');
      return;
    }
    setError(null);
    await repository.saveCourse(actor, { ...course, title: course.title.trim() });
    navigate('/academia');
  };

  const remove = async () => {
    if (!confirm(`¿Borrar "${course.title}"?`)) return;
    await repository.deleteCourse(actor, course.id);
    navigate('/academia');
  };

  return (
    <div className="space-y-5 pb-4">
      <div>
        <button
          type="button"
          onClick={() => navigate('/academia')}
          className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted"
        >
          ← Academia
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {isNew ? 'Nuevo curso' : 'Editar curso'}
        </h1>
      </div>

      <label className="block">
        <span className={labelClass}>Título</span>
        <input
          value={course.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Qué se aprende en este curso"
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Categoría</span>
          <select
            value={course.category}
            onChange={(e) => patch({ category: e.target.value as TutorialCategory })}
            className={inputClass}
          >
            {(Object.keys(TUTORIAL_CATEGORY_LABELS) as TutorialCategory[]).map((c) => (
              <option key={c} value={c}>
                {TUTORIAL_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Estado</span>
          <select
            value={course.status}
            onChange={(e) => patch({ status: e.target.value as CourseStatus })}
            className={inputClass}
          >
            {(Object.keys(COURSE_STATUS_LABELS) as CourseStatus[]).map((s) => (
              <option key={s} value={s}>
                {COURSE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Descripción</span>
        <textarea
          value={course.description ?? ''}
          onChange={(e) => patch({ description: e.target.value || null })}
          rows={3}
          className="w-full rounded-xl border border-aurora-border bg-aurora-surface p-3 text-base text-aurora-text"
        />
      </label>

      <section>
        <h2 className={labelClass}>Quién enseña</h2>
        {members.length === 0 ? (
          <p className="text-sm text-aurora-muted">
            No hay integrantes cargados. Añádelos en Equipo para asignarlos como profesores.
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const marcado = course.teacherIds.includes(member.id);
              return (
                <li key={member.id}>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-aurora-border bg-aurora-surface px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() =>
                        patch({
                          teacherIds: marcado
                            ? course.teacherIds.filter((id) => id !== member.id)
                            : [...course.teacherIds, member.id],
                        })
                      }
                      className="h-5 w-5 shrink-0 accent-aurora-violet-solid"
                    />
                    {member.displayName}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className={labelClass}>Clases</h2>
        <ol className="space-y-3">
          {course.lessons.map((lesson, index) => (
            <li key={lesson.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
              <div className="flex gap-2">
                <input
                  aria-label={`Título de la clase ${index + 1}`}
                  value={lesson.title}
                  onChange={(e) => patchLesson(index, { title: e.target.value })}
                  placeholder={`Clase ${index + 1}`}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
                />
                <button
                  type="button"
                  aria-label={`Quitar clase ${index + 1}`}
                  onClick={() => patch({ lessons: course.lessons.filter((_, i) => i !== index) })}
                  className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
                >
                  ×
                </button>
              </div>
              <textarea
                aria-label={`Descripción de la clase ${index + 1}`}
                value={lesson.description ?? ''}
                onChange={(e) => patchLesson(index, { description: e.target.value || null })}
                placeholder="Qué se ve en esta clase"
                rows={2}
                className="mt-2 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 p-2 text-sm"
              />
              <div className="mt-2">
                <ResourceListEditor
                  resources={lesson.resources}
                  defaultScope={course.scope}
                  label="material de la clase"
                  onChange={(resources) => patchLesson(index, { resources })}
                />
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => patch({ lessons: [...course.lessons, emptyLesson()] })}
          className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
        >
          Añadir clase
        </button>
      </section>

      <label className="block">
        <span className={labelClass}>Derechos del contenido</span>
        <select
          value={course.rights.status}
          onChange={(e) =>
            patch({ rights: { ...course.rights, status: e.target.value as RightsStatus } })
          }
          className={inputClass}
        >
          <option value="own">Propio de Aurora</option>
          <option value="licensed">Autorizado por el titular</option>
          <option value="public-domain">Dominio público</option>
          <option value="reference">Referencia externa (solo uso interno)</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Visibilidad</span>
        <select
          value={course.scope}
          onChange={(e) => patch({ scope: e.target.value as Scope })}
          className={inputClass}
        >
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {course.scope === 'public' && !isRedistributable(course.rights) && (
        <p className="rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-3 text-sm">
          Este curso enlaza material de terceros sin licencia registrada. Publicarlo puede no ser
          legítimo: revisa los derechos o déjalo en interno.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          className="h-12 flex-1 rounded-xl bg-aurora-violet-solid font-medium text-white"
        >
          Guardar
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={remove}
            className="h-12 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300"
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted';
const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-3 text-base text-aurora-text';
