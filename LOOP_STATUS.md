# Estado del loop

> Punto de entrada de cada sesión. Leer esto antes que ningún otro archivo.

## LOOP actual

**LOOP 010 — BÚSQUEDA, VOCES Y PARTES** · completado

## Objetivo

Cerrar tres huecos entre el modelo y la interfaz: la búsqueda solo exponía texto aunque el
repositorio filtraba por más, y las voces y las partes por instrumento existían en los datos pero
no se podían editar desde ninguna pantalla.

Loops 001 a 009 completados y verificados.

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

## Añadido en LOOP 004

- [x] Planificación del servicio: fecha, evento, orden del repertorio, tonalidad por canción,
      voz principal y asignaciones por integrante
- [x] `saveSetlist` en el repositorio, con permiso exigido
- [x] Modo en vivo (servicio y ensayo): pantalla completa, texto grande, anterior/siguiente,
      aviso de la canción que viene y alternancia acordes/solo letra
- [x] Bloqueo de apagado de pantalla mientras el modo en vivo está abierto
- [x] PWA: manifiesto, iconos generados, service worker propio y offline (ADR-010)
- [x] 132 pruebas; comprobación en navegador ampliada a planificar, reordenar, modo en vivo y PWA

## Añadido en LOOP 005

- [x] Favoritos personales, guardados por actor: marcar uno no toca el repertorio del ministerio
- [x] Filtro «solo mis favoritos» en la biblioteca
- [x] `npm run a11y`: auditoría de accesibilidad ejecutable sobre las nueve pantallas (ADR-013)
- [x] Auditoría de contraste de toda la paleta; un par incumplía AA y se corrigió (ADR-012)
- [x] Auditoría de secretos y de vectores de inyección: sin hallazgos
- [x] Comprobación real de funcionamiento sin conexión, cortando la red
- [x] 137 pruebas de dominio

## Añadido en LOOP 006

- [x] Ensayos reales: alta, edición y baja con fecha, horario y repertorio asignado
- [x] Bloques editables por ensayo — la estructura del manual se copia al crear, no se impone
- [x] Reparto de instrumentos y voces para el ensayo
- [x] Próximo ensayo y tu parte en él, dentro de «Mi preparación»
- [x] El modo ensayo usa el repertorio del ensayo, no el del servicio
- [x] Fecha propuesta: el próximo miércoles, según la costumbre del manual
- [x] 155 pruebas; comprobación en navegador y auditoría de accesibilidad ampliadas

## Añadido en LOOP 007

- [x] Exportar todos los datos del ministerio a un archivo JSON versionado
- [x] Importar con validación previa: se comprueba el archivo entero antes de tocar nada
- [x] Se muestra qué contiene la copia y se avisa de que sustituye, antes de confirmar
- [x] Permisos separados: el liderazgo exporta, solo admin y super admin importan (ADR-014)
- [x] Los favoritos no viajan en la copia: son personales
- [x] 173 pruebas; comprobación en navegador con descarga y restauración reales

## Añadido en LOOP 010

- [x] Filtros de repertorio: tonalidad, instrumento, vocalista, etiqueta, dificultad y rango de BPM
- [x] Los filtros solo ofrecen valores que existen en el repertorio
- [x] Editor de voces: melodía y armonías, con intervalo e indicaciones
- [x] Editor de partes por instrumento, con las secciones leídas del propio cuerpo de la canción
- [x] 189 pruebas; comprobación en navegador ampliada a filtros, voces y partes

## Añadido en LOOP 009

- [x] Nueve exportaciones muertas eliminadas
- [x] `isRedistributable` e `isPending` conectados donde las pantallas duplicaban su lógica a mano
- [x] Editores cargados aparte: arranque de 97 KB a 90 KB comprimidos (ADR-015)
- [x] El service worker precachea el JS y el CSS de arranque leyéndolos del `index.html`
- [x] Comprobado que los editores abren sin conexión

## Añadido en LOOP 008

- [x] Editor de tutoriales: categoría, descripción, vínculo a canción, instrumento o voz
- [x] Material por enlace (vídeo, audio, PDF, imagen, enlace, texto), con su tipo y sus derechos
- [x] Filtro por categoría, mostrando solo las que tienen contenido
- [x] Aviso al publicar un tutorial que enlaza material de terceros sin licencia
- [x] Historial: registrar un servicio tocado, sin duplicar si se pulsa dos veces
- [x] Historial visible en el detalle de la canción, con la tonalidad realmente usada
- [x] 184 pruebas; comprobación en navegador y accesibilidad ampliadas

## Pendiente

El producto cubre las fases 1 a 3 del roadmap. Lo que queda depende de los bloqueos de abajo:

1. Autenticación real y sincronización entre dispositivos (B-03). Mientras tanto, la copia de
   datos del LOOP 007 hace de puente.
2. Subida de archivos a storage. Hoy el material se enlaza, que funciona; subirlo necesita cuenta.
3. Secuencias, academia y extensiones de IA — fases 4 y 5.

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
| El modo en vivo se superponía, dejando la navegación alcanzable por tabulador y lector de pantalla | Comprobación en navegador (ADR-011) |
| Faltaban los tipos de `vite/client` para `import.meta.env` | Typecheck |
| Dos aserciones de la comprobación eran frágiles: buscaban texto que también aparece en `<option>` invisibles | Falso negativo investigado leyendo IndexedDB |
| Blanco sobre violeta daba 4.23:1, por debajo de AA | Auditoría de contraste (ADR-012) |
| Once objetivos táctiles por debajo de 44px: selector de rol, reordenar repertorio, fichas de instrumento, enlaces de volver, cabecera del modo en vivo | `npm run a11y` |
| La propia auditoría contaba enlaces en línea como botones y no recargaba al cambiar de rol | Revisión de sus hallazgos |
| El modo ensayo cargaba el repertorio del servicio en lugar del propio ensayo | Revisión al conectar los ensayos |
| La comprobación intentaba cambiar de rol estando en modo en vivo, que no tiene cabecera | Ejecución de la comprobación |
| La comprobación del historial abría la primera canción alfabética, que no estaba en el repertorio del servicio | Falso negativo revisado |
| El JS y el CSS de arranque nunca entraban en la caché del service worker: se piden antes de que tome el control | Inspección de la caché tras dividir el paquete (ADR-015) |
| Calentar la caché desde la página dependía de ganar una carrera con `clients.claim()` | Tres arranques idénticos con resultados distintos |
| La comprobación offline fijaba el rol sin recargar, y la aplicación seguía con el anterior | Falso negativo revisado |

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
