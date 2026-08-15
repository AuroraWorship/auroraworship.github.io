# Estado del loop

> Punto de entrada de cada sesión. Leer esto antes que ningún otro archivo.

## LOOP actual

**LOOP 003 — EQUIPO Y PREPARACIÓN** · completado

## Objetivo

Que la aplicación sepa quién es cada quien: equipo, tonalidad por vocalista y la pantalla que
responde a "¿qué me toca a mí?".

LOOP 001 (bootstrap, motor musical, RBAC, UI) y LOOP 002 (persistencia, edición) completados y
verificados.

## Completado

- [x] Entorno cloud inspeccionado (Node 22, npm 10, Chromium, registro npm accesible)
- [x] Stack elegido y justificado (ADR-001)
- [x] Estructura de proyecto y documentación base
- [x] Modelo de datos completo: canciones, voces, instrumentos, partes, repertorios, servicios,
      ensayos, historial, tutoriales, recursos, derechos
- [x] RBAC con 11 roles, 19 permisos y 3 ámbitos de visibilidad
- [x] Motor de notas con modelo diatónico (ADR-002)
- [x] Motor de acordes: mayores, menores, séptimas, sus, add, dim, aug, slash, alteraciones
- [x] Motor de transposición con preservación de estructura, letra y formato
- [x] Parser de cuerpo de canción (secciones + acordes inline)
- [x] Repositorio con filtrado por ámbito y búsqueda
- [x] UI mobile-first: canciones, búsqueda, hoja de acordes, selector de tonalidad, servicio,
      ensayo, tutoriales
- [x] 113 pruebas de dominio, todas en verde
- [x] Comprobación en navegador real: transposición visible en pantalla, permisos efectivos,
      cero errores de consola
- [x] Despliegue continuo a GitHub Pages configurado

## Añadido en LOOP 002

- [x] Renombrado del producto a **Aurora Worship** (forma corta: Aurora)
- [x] `KeyValueStore` con IndexedDB, respaldo en localStorage y memoria para pruebas (ADR-008)
- [x] `StoredRepository`: siembra en el primer arranque, después manda lo guardado
- [x] Escritura con permiso exigido en el repositorio, no en la pantalla
- [x] Editor de canciones completo, con vista previa en vivo de la hoja de acordes
- [x] Borrado con confirmación, restringido a admin y super admin
- [x] Aviso cuando una canción se marca pública sin derechos que lo permitan
- [x] El rol público puede leer contenido público (ADR-009)
- [x] 121 pruebas; comprobación en navegador ampliada a crear, guardar y recargar

## Añadido en LOOP 003

- [x] Equipo: alta, edición y baja de integrantes, con instrumentos y tesitura cómoda
- [x] El modelo de integrante no guarda datos de contacto, y hay una prueba que lo vigila
- [x] `member:read` para los roles internos: un músico necesita saber quién canta
- [x] Identidad de sesión ("soy yo"), preparada para venir de la cuenta cuando haya auth
- [x] Tonalidad por vocalista, editable por canción y visible en el detalle
- [x] Vista "Mi preparación": próximo servicio, canciones, tonalidad y tu parte
- [x] `saveService` en el repositorio, con permiso exigido
- [x] 128 pruebas; comprobación en navegador ampliada a equipo, identidad y vocalistas

## Pendiente (siguiente loop)

**LOOP 004 — PLANIFICACIÓN Y USO EN VIVO**

1. Edición de servicios y repertorios: fechas, orden de canciones, asignaciones.
2. Modo ensayo y modo servicio: interfaz mínima para el atril.
3. Favoritos.
4. PWA instalable y offline.

## Errores corregidos en este loop

| Qué | Cómo se detectó |
|---|---|
| `Coro` se parseaba como acorde (`C` + sufijo `oro`) | Prueba `isChord('Coro')` |
| La búsqueda no encontraba palabras partidas por un acorde (`omnipo[A]tente`) | Prueba de búsqueda por letra |
| 404 de consola por favicon ausente | Comprobación en navegador |
| El rol público no podía leer nada, lo que hacía imposible la app pública | Refactor de persistencia (ADR-009) |
| El `textarea` del editor heredaba altura fija de la clase de input | Revisión del editor |
| El encabezado truncaba el nombre en pantalla de teléfono | Captura de la comprobación |
| `Loaded['songs']` era readonly y no admitía construcción incremental | Typecheck |

## Bloqueos abiertos

Requieren acción humana. Todo lo demás siguió adelante.

### B-01 · Organización de GitHub `auroraworship` — **bloquea la URL final**

Las organizaciones solo se crean desde la web, no por API. Para que la aplicación quede en
`auroraworship.github.io` hace falta:

1. Crear la organización en `github.com/organizations/plan` (gratis).
2. Transferir este repositorio: Settings → Danger Zone → Transfer ownership.
3. Renombrarlo a `auroraworship.github.io` para que sirva desde la raíz.

Mientras tanto el despliegue funciona en la cuenta personal.

### B-02 · Activar GitHub Pages — **bloquea el despliegue**

En Settings → Pages, elegir origen **GitHub Actions**. El workflow ya está en el repositorio y se
ejecuta solo al hacer merge.

### B-03 · Autenticación real

Hoy hay un selector de rol de demostración, marcado como tal, que **no es autenticación**. La real
necesita cuenta en un proveedor externo (Supabase encaja: auth + Postgres + storage, plan gratuito
suficiente). Requiere que el usuario cree la cuenta y facilite las claves. No se ha contratado nada.

### B-04 · Identidad visual de Aurora

La paleta actual es provisional: hereda morado y naranja de MARCADOS. Falta confirmación de
colores, logo y tipografía oficiales.

### B-05 · Datos reales del ministerio

No se ha inventado nada. Falta que Aurora facilite: integrantes y sus instrumentos, vocalistas y
sus tonalidades, repertorio real con su estado de derechos, calendario de servicios y ensayos.

## Decisiones registradas

ADR-001 a ADR-007 en `DECISIONS.md`.
