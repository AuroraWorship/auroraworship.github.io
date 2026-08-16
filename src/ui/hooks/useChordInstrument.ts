/**
 * Instrumento con el que se dibujan las digitaciones.
 *
 * Es una preferencia del aparato, no del ministerio: el bajista mira siempre
 * el bajo y el guitarrista siempre la guitarra, así que se guarda en el
 * teléfono y no en los datos compartidos. Sobrevive a cerrar la aplicación,
 * que es lo que se espera de algo que se elige una vez.
 */

import { useCallback, useEffect, useState } from 'react';
import type { InstrumentId } from '../../domain/model';
import { TUNINGS } from '../../domain/music/voicing';

const CLAVE = 'aurora.chord-instrument';

/** Instrumentos con digitación: los de cuerda y el piano. */
export const DIAGRAM_INSTRUMENTS: readonly InstrumentId[] = [
  'acoustic-guitar',
  'electric-guitar',
  'bass',
  'piano',
];

export function hasDiagram(instrument: InstrumentId): boolean {
  return instrument in TUNINGS || instrument === 'piano';
}

/** `null` significa que el músico prefiere la hoja sin diagramas. */
export function useChordInstrument(): [InstrumentId | null, (value: InstrumentId | null) => void] {
  const [instrument, setInstrument] = useState<InstrumentId | null>(null);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado && hasDiagram(guardado)) setInstrument(guardado);
    } catch {
      // Un navegador con el almacenamiento bloqueado no debe romper la hoja.
    }
  }, []);

  const elegir = useCallback((value: InstrumentId | null) => {
    setInstrument(value);
    try {
      if (value) localStorage.setItem(CLAVE, value);
      else localStorage.removeItem(CLAVE);
    } catch {
      // Igual que arriba: la preferencia se pierde, la aplicación no.
    }
  }, []);

  return [instrument, elegir];
}
