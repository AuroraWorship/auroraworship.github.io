import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PENDING,
  isPending,
  VOICE_PART_LABELS,
  instrumentById,
  type Assignment,
  type InstrumentId,
  type Member,
  type Service,
  type Setlist,
  type SetlistEntry,
  type Song,
  type VoicePart,
} from '../../domain/model';
import { COMMON_MAJOR_KEYS, COMMON_MINOR_KEYS } from '../../domain/music/key';
import { copyEntries, emptyService, nextSaturday } from '../../domain/service-factory';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const ALL_KEYS = [...COMMON_MAJOR_KEYS, ...COMMON_MINOR_KEYS];

/**
 * Planificación del servicio.
 *
 * Aquí es donde el líder convierte «tenemos servicio el sábado» en algo que
 * el músico puede abrir y entender: fecha, orden de canciones, tonalidad de
 * cada una y quién hace qué.
 */
export function ServiceEditorPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();

  const isNew = !serviceId;
  const [service, setService] = useState<Service | null | undefined>(undefined);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [songs, setSongs] = useState<readonly Song[]>([]);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [saving, setSaving] = useState(false);
  /** Un servicio nuevo no existe en el almacén hasta el primer cambio. */
  const [persistido, setPersistido] = useState(!isNew);
  const [anterior, setAnterior] = useState<Setlist | null>(null);

  const allowed = can(actor, 'service:write');

  useEffect(() => {
    if (!allowed) return;
    let active = true;

    (async () => {
      const servicios = await repository.listServices(actor);
      let found: Service | null;
      let list: Setlist | null;

      if (isNew) {
        const creado = emptyService();
        found = { ...creado.service, date: nextSaturday() };
        list = creado.setlist;
      } else {
        found = await repository.getService(actor, serviceId);
        list = found?.setlistId ? await repository.getSetlist(actor, found.setlistId) : null;
      }

      // Repertorio del servicio anterior, para poder repetirlo de un toque.
      const previo = servicios.filter((s) => s.id !== found?.id).at(-1);
      const previoSetlist = previo?.setlistId
        ? await repository.getSetlist(actor, previo.setlistId)
        : null;

      const allSongs = await repository.listSongs(actor);
      const team = can(actor, 'member:read') ? await repository.listMembers(actor) : [];
      if (!active) return;
      setService(found);
      setSetlist(list);
      setAnterior(previoSetlist && previoSetlist.entries.length > 0 ? previoSetlist : null);
      setSongs(allSongs);
      setMembers(team);
    })();

    return () => {
      active = false;
    };
  }, [actor, serviceId, isNew, allowed]);

  if (!allowed) return <NoAccess />;
  if (service === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (service === null) return <EmptyState title="Servicio no encontrado" />;

  const entries = [...(setlist?.entries ?? [])].sort((a, b) => a.order - b.order);

  const updateEntries = async (next: SetlistEntry[]) => {
    if (!setlist) return;
    const renumbered = next.map((entry, i) => ({ ...entry, order: i + 1 }));
    const updated = { ...setlist, entries: renumbered };
    setSetlist(updated);
    setSaving(true);
    await repository.saveSetlist(actor, updated);
    if (!persistido) {
      await repository.saveService(actor, service);
      setPersistido(true);
    }
    setSaving(false);
  };

  const move = (index: number, delta: number) => {
    const next = [...entries];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void updateEntries(next);
  };

  const saveService = async (changes: Partial<Service>) => {
    const updated = { ...service, ...changes };
    setService(updated);
    setSaving(true);
    // Un servicio nuevo arrastra su repertorio la primera vez que se guarda.
    if (!persistido && setlist) {
      await repository.saveSetlist(actor, setlist);
      setPersistido(true);
    }
    await repository.saveService(actor, updated);
    setSaving(false);
  };

  const borrar = async () => {
    if (!confirm('¿Borrar este servicio y su repertorio? No se puede deshacer.')) return;
    if (persistido) {
      await repository.deleteService(actor, service.id);
      if (service.setlistId) await repository.deleteSetlist(actor, service.setlistId);
    }
    navigate('/servicio');
  };

  const addAssignment = (assignment: Assignment) =>
    saveService({ assignments: [...service.assignments, assignment] });

  const removeAssignment = (index: number) =>
    saveService({ assignments: service.assignments.filter((_, i) => i !== index) });

  return (
    <div className="space-y-5 pb-4">
      <div>
        <button type="button" onClick={() => navigate('/servicio')} className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted">
          ← Servicio
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {isNew ? 'Nuevo servicio' : 'Planificar servicio'}
        </h1>
        <p className="text-xs text-aurora-muted">
          {saving ? 'Guardando…' : persistido ? 'Los cambios se guardan solos' : 'Sin guardar todavía'}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted">
          Evento
        </span>
        <input
          value={service.event}
          onChange={(e) => saveService({ event: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted">
          Fecha
        </span>
        <input
          type="date"
          value={isPending(service.date) ? '' : service.date}
          onChange={(e) => saveService({ date: e.target.value || PENDING })}
          className={inputClass}
        />
        {isPending(service.date) && (
          <span className="mt-1 block text-xs text-aurora-ember">
            Sin fecha, el equipo no sabe para cuándo prepararse.
          </span>
        )}
      </label>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
          Repertorio
        </h2>

        {entries.length === 0 && anterior && (
          <button
            type="button"
            onClick={() => updateEntries([...copyEntries(anterior)])}
            className="mb-2 h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface text-sm"
          >
            Repetir el repertorio anterior ({anterior.entries.length} canciones)
          </button>
        )}

        <ol className="space-y-2">
          {entries.map((entry, index) => {
            const song = songs.find((s) => s.id === entry.songId);
            if (!song) return null;
            return (
              <li key={entry.songId} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{song.title}</p>
                    <p className="text-xs text-aurora-muted">Posición {index + 1}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      aria-label={`Subir ${song.title}`}
                      className="h-11 w-11 rounded-lg border border-aurora-border"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      aria-label={`Bajar ${song.title}`}
                      className="h-11 w-11 rounded-lg border border-aurora-border"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEntries(entries.filter((_, i) => i !== index))}
                      aria-label={`Quitar ${song.title}`}
                      className="h-11 w-11 rounded-lg border border-red-500/40 text-red-300"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-xs text-aurora-muted">
                    Tonalidad
                    <select
                      aria-label={`Tonalidad de ${song.title}`}
                      value={entry.key ?? song.currentKey}
                      onChange={(e) =>
                        updateEntries(
                          entries.map((x, i) => (i === index ? { ...x, key: e.target.value } : x)),
                        )
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-base text-aurora-text"
                    >
                      {ALL_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-aurora-muted">
                    Voz principal
                    <select
                      aria-label={`Voz principal de ${song.title}`}
                      value={entry.leadVocalistId ?? ''}
                      onChange={(e) =>
                        updateEntries(
                          entries.map((x, i) =>
                            i === index ? { ...x, leadVocalistId: e.target.value || null } : x,
                          ),
                        )
                      }
                      className="mt-1 h-11 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-base text-aurora-text"
                    >
                      <option value="">Pendiente</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ol>

        {setlist && (
          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted">
              Añadir canción
            </span>
            <select
              aria-label="Añadir canción al repertorio"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                updateEntries([
                  ...entries,
                  {
                    songId: e.target.value,
                    order: entries.length + 1,
                    key: null,
                    leadVocalistId: null,
                    notes: null,
                    sequencePlanId: null,
                  },
                ]);
              }}
              className={inputClass}
            >
              <option value="">Elegir del repertorio…</option>
              {songs
                .filter((s) => !entries.some((e) => e.songId === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
            </select>
          </label>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
          Quién participa
        </h2>

        {members.length === 0 ? (
          <p className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted">
            No hay integrantes cargados todavía. Añádelos en Equipo para poder repartir el servicio.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {service.assignments.map((assignment, index) => {
                const member = members.find((m) => m.id === assignment.memberId);
                return (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-3"
                  >
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">
                        {member?.displayName ?? 'Integrante retirado'}
                      </span>
                      <span className="block truncate text-aurora-muted">
                        {[
                          assignment.instrument ? instrumentById(assignment.instrument)?.name : null,
                          assignment.voicePart ? VOICE_PART_LABELS[assignment.voicePart] : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sin detalle'}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAssignment(index)}
                      aria-label="Quitar asignación"
                      className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>

            <AssignmentForm members={members} onAdd={addAssignment} />
          </>
        )}
      </section>

      <button
        type="button"
        onClick={borrar}
        className="h-12 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-sm font-medium text-red-300"
      >
        {persistido ? 'Borrar este servicio' : 'Descartar'}
      </button>
    </div>
  );
}

function AssignmentForm({
  members,
  onAdd,
}: {
  members: readonly Member[];
  onAdd: (assignment: Assignment) => void;
}) {
  const [memberId, setMemberId] = useState('');
  const [instrument, setInstrument] = useState<InstrumentId | ''>('');
  const [voicePart, setVoicePart] = useState<VoicePart | ''>('');

  const member = members.find((m) => m.id === memberId);

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-aurora-border bg-aurora-surface p-3">
      <select
        aria-label="Integrante"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        className={inputClass}
      >
        <option value="">Elegir integrante…</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.displayName}
          </option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Instrumento"
          value={instrument}
          onChange={(e) => setInstrument(e.target.value as InstrumentId | '')}
          className={inputClass}
        >
          <option value="">Sin instrumento</option>
          {/* Se ofrecen primero los suyos, pero no se le impide otro. */}
          {(member?.instruments ?? []).map((id) => (
            <option key={id} value={id}>
              {instrumentById(id)?.name ?? id}
            </option>
          ))}
        </select>

        <select
          aria-label="Voz"
          value={voicePart}
          onChange={(e) => setVoicePart(e.target.value as VoicePart | '')}
          className={inputClass}
        >
          <option value="">Sin voz</option>
          {(Object.keys(VOICE_PART_LABELS) as VoicePart[]).map((part) => (
            <option key={part} value={part}>
              {VOICE_PART_LABELS[part]}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={!memberId}
        onClick={() => {
          onAdd({
            memberId,
            instrument: instrument || null,
            voicePart: voicePart || null,
            songId: null,
            notes: null,
          });
          setMemberId('');
          setInstrument('');
          setVoicePart('');
        }}
        className="h-12 w-full rounded-xl bg-aurora-violet-solid font-medium text-white disabled:opacity-50"
      >
        Añadir al servicio
      </button>
    </div>
  );
}

const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-3 text-base text-aurora-text';
