import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  VOICE_PART_LABELS,
  instrumentById,
  type Assignment,
  type InstrumentId,
  type Member,
  type Rehearsal,
  type RehearsalBlock,
  type Setlist,
  type VoicePart,
} from '../../domain/model';
import { emptyRehearsal, formatDuration, totalMinutes } from '../../domain/rehearsal-factory';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

/**
 * Editor de ensayo.
 *
 * Los bloques son editables porque el manual describe una costumbre, no una
 * regla: si un miércoles hace falta el doble de repertorio y menos ejercicios,
 * la aplicación no debe estorbar.
 */
export function RehearsalEditorPage() {
  const { rehearsalId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();

  const isNew = !rehearsalId;
  const [rehearsal, setRehearsal] = useState<Rehearsal | null | undefined>(undefined);
  const [setlists, setSetlists] = useState<readonly Setlist[]>([]);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allowed = can(actor, 'rehearsal:write');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const found = isNew ? emptyRehearsal() : await repository.getRehearsal(actor, rehearsalId);
      const lists = can(actor, 'setlist:read') ? await repository.listSetlists(actor) : [];
      const team = can(actor, 'member:read') ? await repository.listMembers(actor) : [];
      if (!active) return;
      setRehearsal(found);
      setSetlists(lists);
      setMembers(team);
    })();
    return () => {
      active = false;
    };
  }, [actor, rehearsalId, isNew, allowed]);

  if (!allowed) return <NoAccess />;
  if (rehearsal === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (rehearsal === null) return <EmptyState title="Ensayo no encontrado" />;

  const patch = (changes: Partial<Rehearsal>) => setRehearsal({ ...rehearsal, ...changes });

  const patchBlock = (index: number, changes: Partial<RehearsalBlock>) =>
    patch({
      blocks: rehearsal.blocks.map((b, i) => (i === index ? { ...b, ...changes } : b)),
    });

  const save = async () => {
    if (!rehearsal.date) {
      setError('El ensayo necesita una fecha.');
      return;
    }
    if (rehearsal.endTime <= rehearsal.startTime) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    setError(null);
    await repository.saveRehearsal(actor, rehearsal);
    navigate('/ensayo');
  };

  const remove = async () => {
    if (!confirm('¿Borrar este ensayo?')) return;
    await repository.deleteRehearsal(actor, rehearsal.id);
    navigate('/ensayo');
  };

  const total = totalMinutes(rehearsal.blocks);

  return (
    <div className="space-y-5 pb-4">
      <div>
        <button
          type="button"
          onClick={() => navigate('/ensayo')}
          className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted"
        >
          ← Ensayos
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {isNew ? 'Nuevo ensayo' : 'Editar ensayo'}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-3 block">
          <span className={labelClass}>Fecha</span>
          <input
            type="date"
            value={rehearsal.date}
            onChange={(e) => patch({ date: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Desde</span>
          <input
            type="time"
            value={rehearsal.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Hasta</span>
          <input
            type="time"
            value={rehearsal.endTime}
            onChange={(e) => patch({ endTime: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Repertorio a ensayar</span>
        <select
          value={rehearsal.setlistId ?? ''}
          onChange={(e) => patch({ setlistId: e.target.value || null })}
          className={inputClass}
        >
          <option value="">Sin repertorio asignado</option>
          {setlists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.entries.length})
            </option>
          ))}
        </select>
      </label>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
            Bloques
          </h2>
          <p className="text-xs text-aurora-muted">{formatDuration(total)} en total</p>
        </div>

        <ol className="space-y-2">
          {rehearsal.blocks.map((block, index) => (
            <li key={index} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
              <div className="flex gap-2">
                <input
                  aria-label={`Nombre del bloque ${index + 1}`}
                  value={block.title}
                  onChange={(e) => patchBlock(index, { title: e.target.value })}
                  className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`Minutos del bloque ${index + 1}`}
                  value={block.minutes}
                  onChange={(e) => patchBlock(index, { minutes: Number(e.target.value) || 0 })}
                  className="h-11 w-20 shrink-0 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-base"
                />
                <button
                  type="button"
                  aria-label={`Quitar bloque ${block.title}`}
                  onClick={() => patch({ blocks: rehearsal.blocks.filter((_, i) => i !== index) })}
                  className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
                >
                  ×
                </button>
              </div>
              <input
                aria-label={`Descripción del bloque ${index + 1}`}
                value={block.description ?? ''}
                onChange={(e) => patchBlock(index, { description: e.target.value || null })}
                placeholder="Qué se hace en este bloque"
                className="mt-2 h-11 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-sm"
              />
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() =>
            patch({ blocks: [...rehearsal.blocks, { title: 'Nuevo bloque', minutes: 10, description: null }] })
          }
          className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
        >
          Añadir bloque
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
          Quién viene
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-aurora-muted">
            No hay integrantes cargados. Añádelos en Equipo para repartir tareas del ensayo.
          </p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const asignado = rehearsal.assignments.find((a) => a.memberId === member.id);
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-3"
                >
                  <span className="min-w-0 truncate text-sm">{member.displayName}</span>
                  <select
                    aria-label={`Parte de ${member.displayName}`}
                    value={asignado ? partKey(asignado) : ''}
                    onChange={(e) => {
                      const otros = rehearsal.assignments.filter((a) => a.memberId !== member.id);
                      patch({
                        assignments: e.target.value
                          ? [...otros, fromPartKey(member.id, e.target.value)]
                          : otros,
                      });
                    }}
                    className="h-11 shrink-0 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-sm"
                  >
                    <option value="">No asignado</option>
                    {member.instruments.map((id) => (
                      <option key={`i:${id}`} value={`i:${id}`}>
                        {instrumentById(id)?.name ?? id}
                      </option>
                    ))}
                    {(Object.keys(VOICE_PART_LABELS) as VoicePart[]).map((part) => (
                      <option key={`v:${part}`} value={`v:${part}`}>
                        {VOICE_PART_LABELS[part]}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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

/** Instrumento y voz comparten un mismo desplegable; el prefijo los separa. */
function partKey(assignment: Assignment): string {
  if (assignment.instrument) return `i:${assignment.instrument}`;
  if (assignment.voicePart) return `v:${assignment.voicePart}`;
  return '';
}

function fromPartKey(memberId: string, key: string): Assignment {
  const [tipo, valor] = key.split(':');
  return {
    memberId,
    instrument: tipo === 'i' ? (valor as InstrumentId) : null,
    voicePart: tipo === 'v' ? (valor as VoicePart) : null,
    songId: null,
    notes: null,
  };
}

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted';
const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-3 text-base text-aurora-text';
