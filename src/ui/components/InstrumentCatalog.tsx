import { useEffect, useState } from 'react';
import { INSTRUMENTS, type Instrument } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';

/**
 * Catálogo de instrumentos, ampliable por el ministerio (§19).
 *
 * Los seis de fábrica no se pueden tocar: son la base que todo el mundo
 * espera encontrar. Añadir o quitar exige `settings:write` — solo super
 * admin — porque es un catálogo compartido, no una preferencia personal.
 */
export function InstrumentCatalog() {
  const { actor } = useSession();
  const [custom, setCustom] = useState<readonly Instrument[]>([]);
  const [nombre, setNombre] = useState('');

  const puedeEditar = can(actor, 'settings:write');

  const recargar = () => repository.listInstruments(actor).then(setCustom);

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  if (!puedeEditar) return null;

  const añadir = async () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const id = `custom-${limpio.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
    await repository.saveInstrument(actor, { id, name: limpio, family: 'other' });
    setNombre('');
    recargar();
  };

  return (
    <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
      <h2 className="font-medium">Catálogo de instrumentos</h2>
      <p className="mt-1 text-sm text-aurora-muted">
        Los seis de fábrica ({INSTRUMENTS.map((i) => i.name).join(', ')}) siempre están. Añade los
        que falten para tu ministerio.
      </p>

      {custom.length > 0 && (
        <ul className="mt-3 space-y-1">
          {custom.map((instrument) => (
            <li key={instrument.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{instrument.name}</span>
              <button
                type="button"
                aria-label={`Quitar ${instrument.name}`}
                onClick={async () => {
                  await repository.deleteInstrument(actor, instrument.id);
                  recargar();
                }}
                className="h-9 w-9 rounded-lg border border-red-500/40 text-red-300"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Cajón, violín, saxo…"
          className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
        />
        <button
          type="button"
          onClick={añadir}
          disabled={!nombre.trim()}
          className="h-11 shrink-0 rounded-lg bg-aurora-violet-solid px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          Añadir
        </button>
      </div>
    </section>
  );
}
