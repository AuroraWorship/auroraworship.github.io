import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  isPending,
  type HistoryEntry,
  type Member,
  type Service,
  type Setlist,
  type Song,
} from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess, PendingNotice } from '../components/Notices';
import { formatDate } from './RehearsalPage';

interface Cargado {
  service: Service;
  setlist: Setlist | null;
  songs: Map<string, Song>;
  members: readonly Member[];
}

/**
 * La pantalla que responde a "¿qué toco este sábado?".
 *
 * Sin `serviceId` muestra el próximo servicio, que es lo que quiere ver
 * alguien que abre la aplicación un viernes. La lista completa vive detrás de
 * un enlace, porque consultarla es lo excepcional.
 */
export function ServicePage() {
  const { serviceId } = useParams();
  const { actor } = useSession();
  const [data, setData] = useState<Cargado | null | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [registrado, setRegistrado] = useState<number | null>(null);

  const allowed = can(actor, 'service:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;

    (async () => {
      const services = await repository.listServices(actor);
      const hoy = new Date().toISOString().slice(0, 10);
      // El próximo es el primero que no ha pasado; si todos pasaron, el último.
      const service = serviceId
        ? (services.find((s) => s.id === serviceId) ?? null)
        : (services.find((s) => isPending(s.date) || s.date >= hoy) ?? services.at(-1) ?? null);

      if (!service) {
        if (active) {
          setData(null);
          setTotal(services.length);
        }
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
      const members = can(actor, 'member:read') ? await repository.listMembers(actor) : [];

      if (active) {
        setData({ service, setlist, songs, members });
        setTotal(services.length);
        setRegistrado(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [actor, serviceId, allowed]);

  if (!allowed) return <NoAccess />;
  if (data === undefined) return <p className="text-aurora-muted">Cargando…</p>;

  if (data === null) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Servicio</h1>
        <EmptyState title="No hay servicios registrados">
          {can(actor, 'service:write')
            ? 'Crea el primero y reparte el repertorio.'
            : 'El liderazgo aún no ha planificado ninguno.'}
        </EmptyState>
        {can(actor, 'service:write') && <BotonNuevo />}
      </div>
    );
  }

  const { service, setlist, songs, members } = data;
  const entries = [...(setlist?.entries ?? [])].sort((a, b) => a.order - b.order);
  const nombreDe = (id: string | null) =>
    id ? (members.find((m) => m.id === id)?.displayName ?? 'Integrante retirado') : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Servicio</h1>
          <p className="truncate text-sm text-aurora-muted">
            {isPending(service.date) ? 'Fecha sin confirmar' : formatDate(service.date)}
            {service.event ? ` · ${service.event}` : ''}
          </p>
        </div>
        {can(actor, 'service:write') && (
          <Link
            to={`/servicio/${service.id}/planificar`}
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Planificar
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/vivo?modo=servicio"
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-aurora-violet/50 bg-aurora-violet/10 text-sm font-medium text-aurora-violet-soft"
        >
          Modo servicio
        </Link>
        {total > 1 && (
          <Link
            to="/servicios"
            className="flex h-12 items-center rounded-xl border border-aurora-border bg-aurora-surface px-4 text-sm"
          >
            Ver todos ({total})
          </Link>
        )}
        {can(actor, 'member:read') && (
          <Link
            to="/equipo"
            className="flex h-12 items-center rounded-xl border border-aurora-border bg-aurora-surface px-4 text-sm"
          >
            Equipo
          </Link>
        )}
        <Link
          to="/historial"
          className="flex h-12 items-center rounded-xl border border-aurora-border bg-aurora-surface px-4 text-sm"
        >
          Historial
        </Link>
      </div>

      {can(actor, 'service:write') && <BotonNuevo />}

      {can(actor, 'service:write') && !isPending(service.date) && entries.length > 0 && (
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

      {isPending(service.date) && (
        <PendingNotice>
          Este servicio no tiene fecha. Ponle una en «Planificar» para que el equipo sepa para
          cuándo prepararse.
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
                    {nombreDe(entry.leadVocalistId) ?? (
                      <span className="text-aurora-ember">Pendiente</span>
                    )}
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

function BotonNuevo() {
  return (
    <Link
      to="/servicio/nuevo"
      className="flex h-12 items-center justify-center rounded-xl border border-aurora-border bg-aurora-surface text-sm"
    >
      Nuevo servicio
    </Link>
  );
}

/** Lista completa de servicios, pasados y futuros. */
export function ServicesPage() {
  const { actor } = useSession();
  const [services, setServices] = useState<readonly Service[] | null>(null);

  const allowed = can(actor, 'service:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    repository.listServices(actor).then((list) => {
      if (active) setServices(list);
    });
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <Link to="/servicio" className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted">
          ← Servicio
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Todos los servicios</h1>
      </div>

      {services?.length === 0 && <EmptyState title="No hay servicios registrados" />}

      <ul className="space-y-2">
        {services?.map((service) => {
          const pasado = !isPending(service.date) && service.date < hoy;
          return (
            <li key={service.id}>
              <Link
                to={`/servicio/${service.id}`}
                className={[
                  'block rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2',
                  pasado ? 'opacity-70' : '',
                ].join(' ')}
              >
                <p className="font-medium">
                  {isPending(service.date) ? 'Sin fecha' : formatDate(service.date)}
                </p>
                <p className="text-sm text-aurora-muted">
                  {service.event || 'Sin nombre'}
                  {pasado ? ' · ya pasó' : ''}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
