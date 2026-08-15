# Aurora Worship

Aplicación digital del **Ministerio de Alabanza Aurora**, ligado al ministerio juvenil MARCADOS de
Fuente de Vida.

Responde a dos preguntas concretas:

- **Músico** — ¿Qué toco este sábado? ¿En qué tonalidad? ¿Qué debo estudiar?
- **Líder** — ¿Qué vamos a tocar? ¿Quién participa? ¿Qué tan preparado está el equipo?

## Estado

Cinco loops completados. Funciona hoy:

- Biblioteca de canciones con búsqueda por título, letra, etiqueta, tonalidad e instrumento.
- Hoja de acordes con la letra, transposición en vivo y tonalidad original frente a la del equipo.
- Alta, edición y borrado de canciones, con vista previa mientras escribes.
- Equipo: integrantes, instrumentos, tesitura y tonalidad por vocalista.
- Planificación del servicio: fecha, orden del repertorio, tonalidades y reparto de partes.
- «Mi preparación»: qué te toca a ti y en qué tonalidad.
- Modo en vivo para ensayo y servicio, a pantalla completa y con la pantalla bloqueada para que no
  se apague.
- Ensayos programables con bloques editables, repertorio y reparto de tareas.
- Centro de tutoriales con material enlazado, por categoría.
- Historial: cuándo se tocó cada canción, quién la cantó y en qué tonalidad.
- Favoritos personales.
- Copia de datos: exportar e importar para mover el repertorio entre teléfonos.
- Instalable en el teléfono y funcional sin conexión.

No implementado todavía: autenticación real, sincronización entre dispositivos, subida de archivos,
secuencias y academia. Ver `ROADMAP.md` y `LOOP_STATUS.md`.

## Uso

```bash
npm install
npm run dev        # desarrollo
npm test           # pruebas de dominio
npm run typecheck
npm run build      # salida estática en dist/
npm run smoke      # comprobación en navegador real (requiere build + preview)
npm run a11y       # auditoría de accesibilidad (requiere build + preview)
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
