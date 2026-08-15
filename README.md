# Aurora Worship

Aplicación digital del **Ministerio de Alabanza Aurora**, ligado al ministerio juvenil MARCADOS de
Fuente de Vida.

Responde a dos preguntas concretas:

- **Músico** — ¿Qué toco este sábado? ¿En qué tonalidad? ¿Qué debo estudiar?
- **Líder** — ¿Qué vamos a tocar? ¿Quién participa? ¿Qué tan preparado está el equipo?

## Estado

LOOP 002 completado. Funciona hoy: biblioteca de canciones, búsqueda, hoja de acordes con letra,
motor de transposición, tonalidad original frente a tonalidad actual, edición y persistencia de
canciones en el dispositivo, roles con permisos reales,
vista de servicio y estructura de ensayo.

No implementado todavía: autenticación real, sincronización entre dispositivos, subida de archivos, secuencias,
academia. Ver `ROADMAP.md` y `LOOP_STATUS.md`.

## Uso

```bash
npm install
npm run dev        # desarrollo
npm test           # pruebas de dominio
npm run typecheck
npm run build      # salida estática en dist/
npm run smoke      # comprobación en navegador real (requiere build + preview)
```

## Cómo se escribe una canción

Letra y acordes van en un solo campo de texto, pensado para escribirse desde el teléfono:

```
# Verso 1
[G]Sublime gracia del [G7]Se[C]ñor
que a un [G]pecador sal[Em]vó;
```

Una línea que empieza por `#` abre una sección. Los acordes van entre corchetes, pegados a la
sílaba donde entran. Al transponer cambian los acordes y **nada más**: letra, secciones y formato
quedan intactos.

## Documentación

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Instrucciones de trabajo para sesiones de IA |
| `ARCHITECTURE.md` | Cómo está montado y por qué |
| `ROADMAP.md` | Qué falta, por fases |
| `LOOP_STATUS.md` | Estado del loop actual y bloqueos abiertos |
| `DECISIONS.md` | Decisiones técnicas con su razón |
| `CHANGELOG.md` | Historial de cambios |

## Sobre los datos

La aplicación **no inventa información del ministerio**. No hay integrantes, líderes, fechas ni
repertorios reales cargados: lo que falta aparece marcado como `INFORMACIÓN PENDIENTE`.

Las dos canciones de ejemplo son himnos de dominio público comprobado (Newton, 1779; Heber/Dykes,
1826/1861). No se ha copiado material de terceros con derechos vigentes.

## Licencia

Pendiente de decisión del ministerio.
