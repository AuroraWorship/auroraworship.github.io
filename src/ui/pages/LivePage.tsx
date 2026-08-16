import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PENDING, type Setlist, type Song } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { ChordSheet } from '../components/ChordSheet';
import { EmptyState, NoAccess } from '../components/Notices';

interface Item {
  song: Song;
  key: string;
}

/**
 * Modo en vivo: ensayo y servicio.
 *
 * Pantalla completa, sin navegación y sin nada que distraiga. Se usa con el
 * instrumento en las manos, así que solo hay tres gestos posibles: anterior,
 * siguiente y salir.
 *
 * Mantiene la pantalla encendida mientras esté abierta, porque un teléfono
 * que se apaga a mitad de canción es peor que no tener aplicación.
 */
export function LivePage() {
  const navigate = useNavigate();
  const { actor } = useSession();
  const [params] = useSearchParams();
  const mode = params.get('modo') === 'ensayo' ? 'ensayo' : 'servicio';

  const [items, setItems] = useState<readonly Item[] | null>(null);
  const [index, setIndex] = useState(0);
  const [lyricsOnly, setLyricsOnly] = useState(false);

  const allowed = can(actor, 'setlist:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;

    (async () => {
      // Cada modo mira su propia fuente: el ensayo tiene su repertorio y no
      // tiene por qué coincidir con el del servicio.
      let setlist: Setlist | null = null;

      if (mode === 'ensayo' && can(actor, 'rehearsal:read')) {
        const hoy = new Date().toISOString().slice(0, 10);
        const rehearsals = await repository.listRehearsals(actor);
        const proximo = rehearsals.find((r) => r.date >= hoy) ?? rehearsals.at(-1) ?? null;
        if (proximo?.setlistId) setlist = await repository.getSetlist(actor, proximo.setlistId);
      }

      if (!setlist && can(actor, 'service:read')) {
        const servicios = await repository.listServices(actor);
        const hoy = new Date().toISOString().slice(0, 10);
        const service =
          servicios.find((s) => s.date >= hoy || s.date === PENDING) ?? servicios.at(-1) ?? null;
        if (service?.setlistId) setlist = await repository.getSetlist(actor, service.setlistId);
      }

      // Último recurso: el repertorio base, para no dejar la pantalla vacía.
      if (!setlist) setlist = (await repository.listSetlists(actor))[0] ?? null;

      const loaded: Item[] = [];
      for (const entry of [...(setlist?.entries ?? [])].sort((a, b) => a.order - b.order)) {
        const song = await repository.getSong(actor, entry.songId);
        if (song) loaded.push({ song, key: entry.key ?? song.currentKey });
      }
      if (active) setItems(loaded);
    })();

    return () => {
      active = false;
    };
  }, [actor, allowed, mode]);

  // Bloqueo de apagado de pantalla. Es opcional: si el navegador no lo
  // soporta, el modo sigue funcionando igual.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        if ('wakeLock' in navigator) {
          sentinel = await navigator.wakeLock.request('screen');
          if (cancelled) void sentinel.release();
        }
      } catch {
        // Denegado o no disponible: no es motivo para romper nada.
      }
    };
    void request();

    return () => {
      cancelled = true;
      void sentinel?.release();
    };
  }, []);

  if (!allowed) return <NoAccess />;

  const current = items?.[index];

  return (
    <div className="flex h-dvh flex-col bg-aurora-bg">
      <header className="flex items-center justify-between gap-3 border-b border-aurora-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-aurora-violet-soft">
            Modo {mode}
          </p>
          <h1 className="truncate text-lg font-semibold leading-tight">
            {current?.song.title ?? '—'}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setLyricsOnly((v) => !v)}
            aria-pressed={lyricsOnly}
            className="h-11 rounded-lg border border-aurora-border px-3 text-xs"
          >
            {lyricsOnly ? 'Acordes' : 'Solo letra'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Salir del modo en vivo"
            className="h-11 rounded-lg border border-aurora-border px-3 text-xs"
          >
            Salir
          </button>
        </div>
      </header>

      {items !== null && items.length === 0 && (
        <div className="p-4">
          <EmptyState title="No hay repertorio para este modo">
            Arma el repertorio del servicio y vuelve a entrar.
          </EmptyState>
        </div>
      )}

      {current && (
        <>
          <div className="flex items-center gap-3 border-b border-aurora-border px-4 py-2 text-sm">
            <span className="rounded-lg bg-aurora-surface-2 px-2.5 py-1 text-base font-semibold text-aurora-violet-soft">
              {current.key}
            </span>
            {current.song.bpm && <span className="text-aurora-muted">{current.song.bpm} BPM</span>}
            {current.song.meter && <span className="text-aurora-muted">{current.song.meter}</span>}
            <span className="ml-auto text-aurora-muted">
              {index + 1} / {items!.length}
            </span>
          </div>

          {/* Texto más grande que en el resto de la aplicación: aquí se lee a
              un metro de distancia, no en la mano. */}
          <div className="flex-1 overflow-y-auto px-4 py-4 text-[17px]">
            <ChordSheet
              body={current.song.body}
              fromKey={current.song.originalKey}
              toKey={current.key}
              lyricsOnly={lyricsOnly}
            />
          </div>

          <nav className="border-t border-aurora-border bg-aurora-surface px-4 pb-[env(safe-area-inset-bottom)]">
            {index + 1 < items!.length && (
              <p className="truncate pt-2 text-center text-xs text-aurora-muted">
                Siguiente: {items![index + 1].song.title} · {items![index + 1].key}
              </p>
            )}
            <div className="flex gap-3 py-3">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="h-14 flex-1 rounded-xl border border-aurora-border text-base disabled:opacity-40"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(items!.length - 1, i + 1))}
                disabled={index + 1 >= items!.length}
                className="h-14 flex-[2] rounded-xl bg-aurora-violet-solid text-base font-medium text-white disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
