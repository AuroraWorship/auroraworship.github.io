import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PENDING, type HistoryEntry, type Service, type Setlist, type Song } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess, PendingNotice } from '../components/Notices';

interface Loaded {
  service: Service;
  setlist: Setlist | null;
  songs: Map<string, Song>;
}

/**
 * La pantalla que responde a "¿qué toco este sábado?".
 *
 * Es la razón de ser del producto: un músico debe ver canción, tonalidad y su
 * parte sin navegar ni buscar.
 */
export function ServicePage() {
  const { actor } = useSession();
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [registrado, setRegistrado] = useState<number | null>(null);

  const allowed = can(actor, 'service:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;

    (async () => {
      const services = await repository.listServices(actor);
      const service = services[0];
      if (!service) {
        if (active) setData(null);
        return;
      }
      const setlist = service.setlistId
        ? await repository.getSetlist(actor, service.setlistId)
        : null;
      const songs = new Map<string, Song>();
      for (const entry of setlist?.entries ?? []) {
        const song = await repository.getSong(actor, entry.songId);
        if (song) songs.set(song.id, song);
      }
      if (active) setData({ service, setlist, songs });
    })();

    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;
  if (data === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (data === null) return <EmptyState title="No hay servicios registrados" />;

  const { service, setlist, songs } = data;
  const entries = [...(setlist?.entries ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Servicio</h1>
          <p className="truncate text-sm text-aurora-muted">
            {service.date === PENDING ? 'Fecha sin confirmar' : service.date} · {service.event}
          </p>
        </div>
        {can(actor, 'service:write') && (
          <Link
            to="/servicio/planificar"
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Planificar
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          to="/vivo?modo=servicio"
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-aurora-violet/50 bg-aurora-violet/10 text-sm font-medium text-aurora-violet-soft"
        >
          Modo servicio
        </Link>
        {can(actor, 'member:read') && (
          <Link
            to="/equipo"
            className="flex h-12 items-center rounded-xl border border-aurora-border bg-aurora-surface px-4 text-sm"
          >
            Equipo
          </Link>
        )}
      </div>

      {can(actor, 'service:write') && service.date !== PENDING && entries.length > 0 && (
        <button
          type="button"
          onClick={async () => {
            // El identificador combina servicio y canción, así que registrar
            // dos veces el mismo servicio no duplica el historial.
            const nuevas: HistoryEntry[] = entries.map((entry) => ({
              id: `history-${service.id}-${entry.songId}`,
              songId: entry.songId,
              date: service.date,
              serviceId: service.id,
              key: entry.key ?? songs.get(entry.songId)?.currentKey ?? '',
              leadVocalistId: entry.leadVocalistId,
              memberIds: service.assignments.map((a) => a.memberId),
            }));
            setRegistrado(await repository.addHistory(actor, nuevas));
          }}
          className="h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface text-sm"
        >
          {registrado === null
            ? 'Registrar en el historial'
            : registrado === 0
              ? 'Ya estaba registrado'
              : `Registradas ${registrado} canciones`}
        </button>
      )}

      {service.date === PENDING && (
        <PendingNotice>
          Este es un servicio de demostración. Cuando Aurora cargue su calendario real, aquí
          aparecerán la fecha, los participantes y las tonalidades acordadas.
        </PendingNotice>
      )}

      <ol className="space-y-2">
        {entries.map((entry, index) => {
          const song = songs.get(entry.songId);
          if (!song) return null;
          const key = entry.key ?? song.currentKey;
          return (
            <li key={entry.songId}>
              <Link
                to={`/canciones/${song.id}`}
                className="block rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-aurora-muted">Canción {index + 1}</p>
                    <p className="truncate font-medium">{song.title}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-aurora-surface-2 px-2.5 py-1 font-semibold text-aurora-violet-soft">
                    {key}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-aurora-muted">BPM</dt>
                  <dd className="text-right">{song.bpm ?? '—'}</dd>
                  <dt className="text-aurora-muted">Voz principal</dt>
                  <dd className="text-right">
                    {entry.leadVocalistId ?? <span className="text-aurora-ember">Pendiente</span>}
                  </dd>
                </dl>
              </Link>
            </li>
          );
        })}
      </ol>

      {entries.length === 0 && <EmptyState title="El servicio aún no tiene repertorio" />}
    </div>
  );
}
