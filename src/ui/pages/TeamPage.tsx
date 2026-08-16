import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { INSTRUMENTS, type Instrument, type InstrumentId, type Member } from '../../domain/model';
import { COMMON_MAJOR_KEYS, COMMON_MINOR_KEYS } from '../../domain/music/key';
import { newId } from '../../domain/song-factory';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const ALL_KEYS = [...COMMON_MAJOR_KEYS, ...COMMON_MINOR_KEYS];

/**
 * Equipo.
 *
 * Solo nombre visible, instrumentos y tesitura cómoda. Ni teléfonos ni
 * correos: Aurora trabaja con jóvenes y la aplicación no necesita datos de
 * contacto para hacer su trabajo.
 */
export function TeamPage() {
  const { actor, memberId, setMemberId } = useSession();
  const [members, setMembers] = useState<readonly Member[] | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);

  const canRead = can(actor, 'member:read');
  const canWrite = can(actor, 'member:write');

  const reload = () => {
    repository.listMembers(actor).then(setMembers);
  };

  useEffect(() => {
    if (canRead) reload();
    // `actor` cambia al cambiar de rol; recargar es lo correcto.
  }, [actor, canRead]);

  if (!canRead) return <NoAccess />;

  const save = async (member: Member) => {
    await repository.saveMember(actor, member);
    setEditing(null);
    reload();
  };

  const remove = async (member: Member) => {
    if (!confirm(`¿Quitar a ${member.displayName} del equipo?`)) return;
    await repository.deleteMember(actor, member.id);
    if (memberId === member.id) setMemberId(null);
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-aurora-muted">
            {members === null ? 'Cargando…' : `${members.length} integrantes`}
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() =>
              setEditing({ id: newId('member'), displayName: '', instruments: [], comfortableKeys: [] })
            }
            className="h-11 shrink-0 rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Añadir
          </button>
        )}
      </div>

      {members?.length === 0 && !editing && (
        <EmptyState title="Todavía no hay integrantes">
          {canWrite
            ? 'Añade a los miembros del equipo con su instrumento y su tesitura cómoda.'
            : 'El liderazgo aún no ha cargado el equipo.'}
        </EmptyState>
      )}

      {editing && <MemberForm member={editing} onSave={save} onCancel={() => setEditing(null)} />}

      {can(actor, 'data:export') && (
        <Link
          to="/ajustes"
          className="flex h-12 items-center justify-center rounded-xl border border-aurora-border bg-aurora-surface text-sm"
        >
          Copia de datos
        </Link>
      )}

      <ul className="space-y-2">
        {members?.map((member) => (
          <li key={member.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {member.displayName}
                  {memberId === member.id && (
                    <span className="ml-2 rounded bg-aurora-violet/20 px-1.5 py-0.5 text-xs text-aurora-violet-soft">
                      soy yo
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-sm text-aurora-muted">
                  {member.instruments.length === 0
                    ? 'Sin instrumentos'
                    : member.instruments
                        .map((i) => INSTRUMENTS.find((x) => x.id === i)?.name ?? i)
                        .join(', ')}
                </p>
                {member.comfortableKeys.length > 0 && (
                  <p className="mt-0.5 text-sm text-aurora-muted">
                    Tesitura: {member.comfortableKeys.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setMemberId(memberId === member.id ? null : member.id)}
                  className="h-11 rounded-lg border border-aurora-border px-3 text-xs"
                >
                  {memberId === member.id ? 'No soy yo' : 'Soy yo'}
                </button>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setEditing(member)}
                    className="h-11 rounded-lg border border-aurora-border px-3 text-xs"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
            {canWrite && (
              <button
                type="button"
                onClick={() => remove(member)}
                className="mt-3 text-xs text-red-300 underline underline-offset-2"
              >
                Quitar del equipo
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemberForm({
  member,
  onSave,
  onCancel,
}: {
  member: Member;
  onSave: (member: Member) => void;
  onCancel: () => void;
}) {
  const { actor } = useSession();
  const [draft, setDraft] = useState<Member>(member);
  const [error, setError] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<readonly Instrument[]>(INSTRUMENTS);

  useEffect(() => {
    repository.listInstruments(actor).then((custom) => setCatalogo([...INSTRUMENTS, ...custom]));
  }, [actor]);

  const toggle = (id: InstrumentId) =>
    setDraft({
      ...draft,
      instruments: draft.instruments.includes(id)
        ? draft.instruments.filter((i) => i !== id)
        : [...draft.instruments, id],
    });

  const toggleKey = (key: string) =>
    setDraft({
      ...draft,
      comfortableKeys: draft.comfortableKeys.includes(key)
        ? draft.comfortableKeys.filter((k) => k !== key)
        : [...draft.comfortableKeys, key],
    });

  return (
    <div className="space-y-4 rounded-xl border border-aurora-violet/40 bg-aurora-surface p-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted">
          Nombre
        </span>
        <input
          value={draft.displayName}
          onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
          placeholder="Cómo aparece en el equipo"
          className="h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface-2 px-3 text-base"
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-aurora-muted">
          Instrumentos
        </p>
        <div className="flex flex-wrap gap-2">
          {catalogo.map((instrument) => {
            const active = draft.instruments.includes(instrument.id);
            return (
              <button
                key={instrument.id}
                type="button"
                onClick={() => toggle(instrument.id)}
                aria-pressed={active}
                className={[
                  'h-11 rounded-lg border px-3 text-sm',
                  active
                    ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
                    : 'border-aurora-border bg-aurora-surface-2 text-aurora-muted',
                ].join(' ')}
              >
                {instrument.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-aurora-muted">
          Tonalidades cómodas
        </p>
        <p className="mb-2 text-xs text-aurora-muted">
          Solo si canta. Sirve para proponer la tonalidad al armar el repertorio.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_KEYS.map((key) => {
            const active = draft.comfortableKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleKey(key)}
                aria-pressed={active}
                className={[
                  'h-11 w-12 rounded-lg border text-sm',
                  active
                    ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
                    : 'border-aurora-border bg-aurora-surface-2 text-aurora-muted',
                ].join(' ')}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (!draft.displayName.trim()) {
              setError('El integrante necesita un nombre.');
              return;
            }
            onSave({ ...draft, displayName: draft.displayName.trim() });
          }}
          className="h-12 flex-1 rounded-xl bg-aurora-violet-solid font-medium text-white"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-xl border border-aurora-border px-4"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
