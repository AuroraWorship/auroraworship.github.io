import { useRef, useState } from 'react';
import {
  backupFilename,
  exportBackup,
  importBackup,
  parseBackup,
  summarize,
  type Backup,
  type ImportSummary,
} from '../../data/backup';
import { appStore } from '../../data/repository';
import { can } from '../../domain/rbac/roles';
import { useSession } from '../session';
import { NoAccess, PendingNotice } from '../components/Notices';
import { InstrumentCatalog } from '../components/InstrumentCatalog';

const ETIQUETAS: Record<keyof ImportSummary, string> = {
  songs: 'canciones',
  setlists: 'repertorios',
  services: 'servicios',
  rehearsals: 'ensayos',
  tutorials: 'tutoriales',
  members: 'integrantes',
};

/**
 * Copia y restauración.
 *
 * Mientras no haya backend, esta pantalla es la que permite que el repertorio
 * del líder llegue al teléfono del resto del equipo, y la que evita que meses
 * de trabajo dependan de un solo dispositivo.
 */
export function SettingsPage() {
  const { actor } = useSession();
  const archivo = useRef<HTMLInputElement>(null);

  const [pendiente, setPendiente] = useState<Backup | null>(null);
  const [resultado, setResultado] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const puedeExportar = can(actor, 'data:export');
  const puedeImportar = can(actor, 'data:import');

  if (!puedeExportar && !puedeImportar) return <NoAccess />;

  const exportar = async () => {
    setError(null);
    try {
      const copia = await exportBackup(actor, appStore);
      const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = backupFilename();
      enlace.click();
      // Liberar el objeto en cuanto el navegador ha tomado el archivo.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar.');
    }
  };

  const leerArchivo = async (file: File) => {
    setError(null);
    setResultado(null);
    try {
      setPendiente(parseBackup(await file.text()));
    } catch (e) {
      setPendiente(null);
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
  };

  const confirmarImportacion = async () => {
    if (!pendiente) return;
    try {
      const resumen = await importBackup(actor, appStore, pendiente);
      setPendiente(null);
      setResultado(resumen);
      // La aplicación ya tiene datos distintos en memoria; recargar es lo
      // honesto en vez de dejar pantallas mostrando lo anterior.
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo importar.');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Copia de datos</h1>
        <p className="text-sm text-aurora-muted">Mover el repertorio entre teléfonos</p>
      </div>

      <PendingNotice>
        Todavía no hay servidor, así que los datos viven en cada teléfono por separado y no se
        sincronizan solos. Esta pantalla es el puente: el liderazgo exporta un archivo, lo comparte
        por el medio que prefiera, y el equipo lo importa.
      </PendingNotice>

      {puedeExportar && (
        <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
          <h2 className="font-medium">Exportar</h2>
          <p className="mt-1 text-sm text-aurora-muted">
            Descarga un archivo con canciones, repertorios, servicios, ensayos, tutoriales e
            integrantes. Tus favoritos no van dentro: son personales de cada quien.
          </p>
          <button
            type="button"
            onClick={exportar}
            className="mt-3 h-12 w-full rounded-xl bg-aurora-violet-solid font-medium text-white"
          >
            Descargar copia
          </button>
        </section>
      )}

      {puedeImportar && (
        <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
          <h2 className="font-medium">Importar</h2>
          <p className="mt-1 text-sm text-aurora-muted">
            Sustituye los datos de este teléfono por los del archivo. Se revisa antes de tocar nada,
            y se te muestra qué contiene para que confirmes.
          </p>

          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            aria-label="Archivo de copia"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void leerArchivo(file);
            }}
            className="mt-3 block w-full text-sm text-aurora-muted file:mr-3 file:h-11 file:rounded-lg file:border file:border-aurora-border file:bg-aurora-surface-2 file:px-4 file:text-sm file:text-aurora-text"
          />

          {pendiente && (
            <div className="mt-4 rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-3">
              <p className="text-sm font-medium">Esta copia contiene:</p>
              <ul className="mt-2 space-y-0.5 text-sm">
                {(Object.keys(ETIQUETAS) as (keyof ImportSummary)[]).map((clave) => (
                  <li key={clave} className="flex justify-between">
                    <span className="text-aurora-muted">{ETIQUETAS[clave]}</span>
                    <span>{summarize(pendiente)[clave]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-aurora-ember">
                Al continuar, lo que hay ahora en este teléfono se pierde.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={confirmarImportacion}
                  className="h-12 flex-1 rounded-xl bg-aurora-violet-solid font-medium text-white"
                >
                  Sustituir datos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendiente(null);
                    if (archivo.current) archivo.current.value = '';
                  }}
                  className="h-12 rounded-xl border border-aurora-border px-4"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {resultado && (
            <p className="mt-3 rounded-xl border border-aurora-violet/40 bg-aurora-violet/10 p-3 text-sm">
              Importado: {(Object.keys(ETIQUETAS) as (keyof ImportSummary)[])
                .map((c) => `${resultado[c]} ${ETIQUETAS[c]}`)
                .join(', ')}
              . Recargando…
            </p>
          )}
        </section>
      )}

      <InstrumentCatalog />

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
