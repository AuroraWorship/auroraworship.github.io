# Instrucciones de trabajo — Aurora Worship

## Antes de tocar nada

1. Lee `LOOP_STATUS.md` (90 líneas). Estado, bloqueos e índice de loops. **Con esto suele bastar.**
2. Después, solo lo que el trabajo de hoy necesite:
   - dónde vive el código → tabla «Dónde vive cada cosa» en `ARCHITECTURE.md`
   - por qué algo se hizo así → índice de `DECISIONS.md`, y lee **solo** ese ADR
   - qué falta del encargo original → `BRIEF_COVERAGE.md` (no releas el brief ni re-audites)
3. Inspecciona los archivos concretos que vas a cambiar.

**No leas** salvo que la pregunta sea histórica: `docs/HISTORIAL.md`,
`docs/CHANGELOG-ANTERIOR.md`, ni `DECISIONS.md` entero.

No releas el proyecto entero cada sesión. Si un archivo ya explica algo, no lo repitas.

## Al terminar

1. Actualiza `LOOP_STATUS.md`: cambia el loop actual y añade **una línea** al índice. El detalle
   de lo hecho va a `docs/HISTORIAL.md`, no aquí — este archivo se lee cada sesión y debe
   quedarse corto.
2. Registra decisiones importantes en `DECISIONS.md` con contexto, alternativas, decisión, razón y
   consecuencias, y añade su fila al índice del encabezado.
3. Ajusta `ROADMAP.md` y `CHANGELOG.md`.

## Comandos

```bash
npm test           # pruebas de dominio
npm run typecheck  # tipos
npm run build      # compilación
npm run smoke      # navegador real; requiere build + preview corriendo
npm run a11y       # accesibilidad; mismos requisitos
```

`smoke` calla en verde y solo grita lo que falla; `AURORA_SMOKE_VERBOSE=1` lo cuenta todo.
Necesita un build **sin** `.env` (en modo autenticación no existe el selector de rol que conduce).

Las herramientas que devuelven mucho (listar ejecuciones de GitHub Actions, por ejemplo) se
filtran antes de leerlas — `python3 -c` o `jq` sobre el resultado — en vez de volcarlas enteras.

Antes de dar algo por terminado: pruebas en verde, tipos en verde, compilación en verde. Si toca la
interfaz, comprobación en navegador.

## Reglas del producto

**No inventes información del ministerio.** Integrantes, edades, cargos, instrumentos, líderes,
repertorios, fechas, tonalidades, canciones, cuentas, credenciales: si no está confirmado, se marca
`PENDING` (`INFORMACIÓN PENDIENTE`) y se muestra como pendiente. Una suposición no se convierte en
dato.

**Derechos de autor.** Nada de material de terceros sin estado de derechos declarado. Solo `own` y
`public-domain` pueden salir al ámbito público.

**Privacidad.** Aurora trabaja con jóvenes. Teléfonos, correos y datos personales no entran en el
modelo mientras la aplicación no los necesite para funcionar.

**Secretos.** Nunca en el repositorio. Variables de entorno.

**Permisos.** El filtrado vive en el repositorio, no en las pantallas (ADR-005).

**Sin gastos.** No contratar servicios de pago ni activar planes sin autorización expresa. Se puede
dejar la integración preparada y detenerse ahí.

## Cultura del producto

Aurora entiende a sus integrantes como ministros de adoración, no como músicos a secas. Eso debe
notarse en el producto, no como frases decorativas sino en las decisiones: la aplicación sirve para
preparar y honrar, no para competir ni exhibir. No hay rankings ni métricas de vanidad.

## Autonomía

Decide tú el framework, la estructura, los nombres, las librerías, los patrones, el testing y la
UX razonable. Pide intervención humana solo cuando sea inevitable: cuentas externas, claves, pagos,
dominios, decisiones legales, borrados irreversibles o información que solo el ministerio tiene.

Ante un bloqueo: haz todo lo demás, documéntalo en `LOOP_STATUS.md`, reduce la pregunta al mínimo y
sigue.
