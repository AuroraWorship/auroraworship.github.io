# Changelog

## [0.15.2] — Más naranja, con criterio

Se pidió más presencia del naranja. Las insignias de tonalidad que se repetían en cinco
pantallas (lista de canciones, servicio, historial, modo en vivo, mi preparación) y el
chip de "±N semitonos" del selector pasan de violeta a naranja, para que lo musical
(acordes, tonalidad) se lea siempre en naranja y la interfaz en violeta (ADR-021). El
primer intento con un naranja translúcido fallaba el contraste (3.3–3.7:1); el fondo
sólido final da 5.13:1, verificado antes de subir.

## [0.15.1] — Fondo más claro

Se pidió aclarar el fondo un 15%. Tocar solo ese color rompía la jerarquía visual
(las tarjetas dejaban de distinguirse del fondo) y el contraste del violeta usado como
texto. Se sube en su lugar toda la escala oscura —fondo, superficie, superficie-2,
borde— la misma proporción, y el violeta se reajusta para conservar su contraste
(ADR-020). Paleta provisional (B-04): sin cambios de comportamiento ni de datos.

## [0.15.0] — LOOP 015 · Digitaciones de acordes

Primera de las mejoras que pidió el ministerio tras ver la aplicación en uso. Tocar un
acorde en la hoja muestra cómo se hace en el instrumento propio.

### Añadido

- **Diagramas de acordes** por instrumento: mástil para guitarra, bajo y ukelele, teclado
  para piano. Hasta cuatro posturas alternativas por acorde.
- **Selector de instrumento** en la hoja de acordes, con la preferencia guardada en el
  teléfono. «Sin diagramas» deja la hoja exactamente como estaba.
- **Motor de notas del acorde** (`chord-tones.ts`), que además distingue qué notas se
  pueden omitir cuando no caben todas bajo la mano.

### Detalle

Ninguna digitación está guardada: se calculan desde la estructura del acorde y la
afinación del instrumento (ADR-019). Por eso funcionan igual con un `Am` que con un
`Am7b5`, y un instrumento de cuerda nuevo solo necesita su afinación.

### Interno

- 235 pruebas de dominio.

## [0.14.0] — LOOP 014 · Arquitectura de secuencias

Cierra el último hueco que quedaba abierto en `BRIEF_COVERAGE.md` sin depender de ningún
bloqueo: §27 pedía preparar la arquitectura de secuencias, y no se había hecho.

### Añadido

- `SequencePlan` y `SequenceTrack` en el modelo (§27): click, pads, loops y pistas sueltas,
  con el binario en storage, nunca en el modelo (mismo patrón que `SongVersion`, ver ADR-018).
- `Song.sequences`, análogo a `Song.versions`: una canción puede tener más de un plan.
- `SetlistEntry.sequencePlanId`: qué plan toca en cada servicio o ensayo concreto.

### Sin construir a propósito

Pantalla de edición, reproductor y su integración con el modo en vivo — el propio brief los
pide para una fase posterior. El modelo existe para no migrar datos cuando llegue esa fase.

### Interno

- 219 pruebas de dominio.

## [0.13.0] — LOOP 013 · Historial global, progreso y estado

Cierra el último barrido de `BRIEF_COVERAGE.md` que no dependía de ningún bloqueo. Fases 1-3
del brief quedan completas.

### Añadido

- **Historial global** (`/historial`), enlazado desde Servicio: qué se tocó, cuándo, quién cantó
  y en qué tonalidad, por fecha en vez de por canción.
- **Estado de canción** (borrador / lista / archivada), con su filtro en la búsqueda.
- **Progreso personal** en Mi preparación: marcar cada parte asignada como preparada, con una
  barra de avance. Es personal — el mismo patrón de almacenamiento que los favoritos.

## [0.12.0] — LOOP 012 · Huecos del brief

Auditoría completa contra las 59 secciones del encargo original (`BRIEF_COVERAGE.md`),
y cierre de lo que no dependía de ningún bloqueo.

### Añadido

- Recursos (vídeo, audio, PDF, enlace) editables en canciones y en cada voz — antes solo
  existía el editor para tutoriales, aunque el modelo ya los soportaba en los tres.
- `SongVersion`: variantes de arreglo (acústica, en vivo, del artista) con nombre, notas y
  su propio material, sin duplicar letra ni acordes.
- Catálogo de instrumentos ampliable por el ministerio, gestionado en Ajustes.
- El modo en vivo muestra la parte instrumental de cada sección, no solo acordes y letra.

### Interno

- `ResourceListEditor` único, reutilizado por canción, voz y tutorial (ADR-017).
- `instrumentById` resuelve instrumentos personalizados por una caché de módulo en vez de
  enhebrar el catálogo como prop hasta cada pantalla (ADR-016).
- `BRIEF_COVERAGE.md`: checklist de cobertura contra el brief, para no re-auditar desde cero.

## [0.11.0] — LOOP 011 · Varios servicios

Se acabó el servicio único.

### Añadido

- **Varios servicios a la vez**, cada uno con su propio repertorio. Antes solo cabía uno:
  planificar el sábado siguiente pisaba el anterior, y con él el historial de lo que se tocó.
- **Lista completa de servicios**, con los pasados atenuados. La pantalla principal sigue
  mostrando el próximo, que es lo que quiere ver alguien que abre la aplicación un viernes.
- **«Repetir el repertorio anterior».** Copia canciones y tonalidades, pero no quién cantó: eso se
  decide cada vez.
- **Borrar un servicio**, que se lleva su repertorio consigo y deja los demás intactos.
- El servicio propone el próximo sábado, igual que el ensayo propone el miércoles. Es solo el valor
  inicial: no se guarda nada que el ministerio no haya creado.

### Cambiado

- «Mi preparación» y el modo en vivo apuntan al **próximo** servicio, no al primero de la lista.
- Los servicios sin fecha van al final: un servicio sin fecha es una plantilla a medio hacer, no lo
  próximo que ocurre.

## [0.10.0] — LOOP 010 · Búsqueda, voces y partes

Tres cosas que estaban en los datos pero no llegaban a la pantalla.

### Añadido

- **Filtros del repertorio.** Tonalidad, instrumento, vocalista, etiqueta, dificultad y rango de
  tempo. Van plegados: en un teléfono un panel abierto empuja la lista fuera de la pantalla.
- Los filtros **solo ofrecen valores que existen** en el repertorio. Un filtro que no devuelve nada
  es peor que no tenerlo.
- **Editor de voces.** Melodía principal y armonías, con su intervalo e indicaciones para quien las
  canta. El intervalo va como texto libre — «3ª arriba», «6ª abajo» — porque es como lo dice un
  equipo de alabanza.
- **Editor de partes por instrumento.** Qué hace cada instrumento en cada sección. Las secciones se
  leen del propio cuerpo de la canción, así que no se puede escribir una que no exista; y si se
  renombra una sección, la parte huérfana se marca en vez de perderse en silencio.

### Notas

- Una canción sin BPM no aparece al filtrar por tempo: no sabemos si cabe en el rango.

## [0.9.0] — LOOP 009 · Revisión y robustez

Loop de repaso sobre ocho loops de construcción.

### Cambiado

- **Arranque más ligero.** Las seis pantallas de edición se cargan bajo demanda: 90 KB comprimidos
  en vez de 97. Solo las abre el liderazgo, y el músico no tiene por qué pagarlas al arrancar.
- **Menos código.** Nueve exportaciones que ya no usaba nadie, fuera.
- **Menos reglas duplicadas.** `isRedistributable` e `isPending` existían en el dominio mientras dos
  pantallas repetían su lógica a mano. Ahora la regla vive en un solo sitio.

### Corregido

- **El modo sin conexión era más frágil de lo que aparentaba.** El JS y el CSS de arranque nunca
  llegaban a la caché del service worker — la página los pide antes de que el worker tome el
  control — y funcionaban solo por la caché HTTP del navegador, que puede vaciarse. Ahora el worker
  los precachea él mismo leyéndolos del `index.html` (ADR-015).

## [0.8.0] — LOOP 008 · Material y memoria

«Aprender» deja de ser una lista vacía, y el sistema empieza a recordar.

### Añadido

- **Editor de tutoriales.** Categoría, descripción y vínculo opcional a una canción, un instrumento
  o una voz. El material se adjunta por enlace: no hay storage todavía, pero enlazar a donde el
  ministerio ya guarda sus vídeos funciona hoy, y cuando lo haya el modelo no cambia.
- **Filtro por categoría**, mostrando solo las que tienen contenido. Un filtro vacío es ruido.
- **Aviso de derechos** al marcar como público un tutorial que enlaza material de terceros sin
  licencia registrada.
- **Historial.** Registrar un servicio ya tocado, y verlo en el detalle de cada canción: cuándo se
  tocó, quién la cantó y en qué tonalidad — la real, no la que tenga la canción hoy.
- Registrar dos veces el mismo servicio no duplica el historial.

## [0.7.0] — LOOP 007 · Copia de datos

El repertorio deja de vivir preso en un solo teléfono.

### Añadido

- **Exportar.** Un archivo JSON con canciones, repertorios, servicios, ensayos, tutoriales e
  integrantes. Sirve para pasar los datos al resto del equipo y como copia de seguridad de un
  repertorio que puede costar meses de cargar.
- **Importar.** Se valida el archivo entero antes de tocar nada, se muestra qué contiene y se
  avisa de que sustituye lo que hay. Un archivo equivocado no llega a la mitad del proceso.
- **Permisos separados.** El liderazgo exporta; solo admin y super admin importan. Sobrescribir el
  trabajo de todos no es una acción de uso diario.
- Los favoritos no viajan en la copia: son personales de cada quien.

### Notas

- La importación sustituye, no fusiona. Fusionar exigiría resolver conflictos por registro, y
  hacerlo mal perdería datos en silencio — peor que avisar y sobrescribir (ADR-014).
- Esto no es sincronización, y no pretende serlo. Es lo que permite trabajar hasta que haya
  backend.

## [0.6.0] — LOOP 006 · Ensayos reales

El miércoles ya existe en la aplicación.

### Añadido

- **Ensayos programables.** Fecha, horario, repertorio a ensayar y reparto de instrumentos y
  voces. Antes solo había una plantilla estática que no se podía usar para nada.
- **Bloques editables por ensayo.** La estructura del manual — oración, preparación, ejercicios,
  repertorio, revisión, cierre — se copia al crear cada ensayo y se ajusta ahí. Es una costumbre
  del ministerio, no una regla del software, y el código lo trata como tal.
- **El próximo ensayo aparece en «Mi preparación»**, con tu parte si te la han asignado.
- La fecha propuesta al crear es el próximo miércoles, que es cuando Aurora ensaya. Se puede
  cambiar, y no se guarda ningún ensayo que el ministerio no haya creado.

### Corregido

- El modo ensayo cargaba el repertorio del servicio en lugar del del propio ensayo. Cada modo mira
  ahora su fuente, y solo cae al repertorio base si no hay nada más.

## [0.5.0] — LOOP 005 · Favoritos y auditoría

Loop de revisión: poca superficie nueva, y todo lo construido pasado por el cedazo.

### Añadido

- **Favoritos personales.** Son por persona: marcar uno no modifica el repertorio del ministerio.
  La biblioteca gana un filtro para ver solo los tuyos.
- **`npm run a11y`.** Auditoría de accesibilidad que recorre las nueve pantallas en un navegador
  real y falla si algo pulsable mide menos de 44px, si le falta nombre accesible o si la pantalla
  no tiene exactamente un `h1`.
- Comprobación de funcionamiento sin conexión cortando la red de verdad, no solo mirando si el
  service worker se registró.

### Corregido

- **Contraste.** El blanco sobre el violeta de marca daba 4.23:1, por debajo del 4.5:1 de WCAG AA,
  y afectaba a todos los botones primarios. Se separan dos violetas: uno para texto y tintes, otro
  para rellenos con texto blanco (ADR-012).
- **Objetivos táctiles.** Once elementos por debajo de 44px: el selector de rol, los botones de
  reordenar el repertorio, las fichas de instrumento y tonalidad, los enlaces de volver y la
  cabecera del modo en vivo.

### Verificado sin hallazgos

- Ningún secreto, clave ni token en el repositorio.
- Ningún uso de `innerHTML` ni `dangerouslySetInnerHTML`: no hay vector de inyección.
- 90 KB comprimidos de JavaScript.

## [0.4.0] — LOOP 004 · Planificación y uso en vivo

Se cierra el círculo: el líder planifica, el músico toca.

### Añadido

- **Planificar el servicio.** Fecha, evento, orden del repertorio, tonalidad de cada canción, voz
  principal y reparto de instrumentos y voces por integrante.
- **Modo en vivo**, para servicio y ensayo. Pantalla completa sin navegación, texto grande,
  anterior/siguiente, aviso de qué canción viene y alternancia entre acordes y solo letra.
- **La pantalla no se apaga** mientras el modo en vivo está abierto.
- **PWA.** Instalable en el teléfono, con manifiesto, iconos y service worker propio. La
  aplicación abre y funciona sin conexión.

### Corregido

- El modo en vivo se superponía a la aplicación en lugar de sustituirla: cabecera y navegación
  seguían en el DOM, alcanzables con el tabulador y por un lector de pantalla (ADR-011).

### Notas

- Dos aserciones de la comprobación en navegador daban un falso negativo al buscar texto que
  también existe dentro de `<option>` invisibles. Se verificó contra IndexedDB que el dato sí se
  guardaba, y se corrigieron las aserciones, no el producto.

## [0.3.0] — LOOP 003 · Equipo y preparación

La aplicación ya sabe quién es cada quien.

### Añadido

- **Equipo.** Alta, edición y baja de integrantes con sus instrumentos y su tesitura cómoda. El
  ministerio arranca sin nadie cargado: no se inventan integrantes.
- **Identidad de sesión.** Marcar «soy yo» en el equipo. Con autenticación real vendrá de la
  cuenta; el contrato de la capa ya es el mismo.
- **Tonalidad por vocalista.** Editable por canción y visible en el detalle, resolviendo el nombre
  del integrante en vez de mostrar su identificador.
- **Mi preparación.** Próximo servicio, canciones en orden, tonalidad de cada una y tu parte
  cuando la haya. Si no hay asignaciones, lo dice en vez de aparentar.
- `member:read` para los roles internos, y `saveService` en el repositorio.

### Seguridad y privacidad

- El modelo de integrante sigue sin guardar teléfonos ni correos, y hay una prueba que falla si
  alguien añade un campo de contacto.

### Corregido

- El encabezado truncaba el nombre del producto en pantalla de teléfono.

## [0.2.0] — LOOP 002 · Persistencia y edición

El producto pasa de nombre y de naturaleza: ya no es solo lectura.

### Cambiado

- El producto se llama **Aurora Worship** (forma corta: Aurora). Antes «Aurora OS», que se leía
  como sistema operativo.

### Añadido

- **Persistencia real.** `KeyValueStore` con IndexedDB, respaldo en `localStorage` y memoria para
  pruebas. Lo que el ministerio cargue sobrevive a cerrar la aplicación.
- **Editor de canciones.** Alta, edición y borrado, con vista previa en vivo de la hoja de acordes
  mientras se escribe.
- **Escritura con permisos.** El repositorio exige el permiso antes de guardar o borrar; una
  pantalla que lo olvide no puede saltarse la regla.
- **Aviso de derechos.** Marcar una canción como pública sin derechos que lo permitan avisa en
  pantalla.
- El rol público puede leer contenido público; el ámbito sigue ocultándole lo interno.

### Corregido

- El rol público no tenía ningún permiso, lo que hacía imposible la aplicación pública prevista.
  Permiso y ámbito son ejes distintos (ADR-009).
- El área de texto del editor heredaba una altura fija pensada para campos de una línea.

### Notas

- Los datos viven por dispositivo y todavía no se sincronizan entre integrantes. Llega con el
  backend.

## [0.1.0] — LOOP 001 · Cloud bootstrap

Primera versión funcional de Aurora Worship.

### Añadido

- **Motor musical.** Notas con modelo diatónico, acordes estructurados con sufijo preservado,
  tonalidades y transposición que conserva estructura, letra y formato.
- **Cuerpo de canción.** Formato de secciones (`# Verso 1`) con acordes inline (`[C]`), pensado
  para escribirse desde el teléfono.
- **RBAC.** 11 roles, 19 permisos y 3 ámbitos de visibilidad, con el filtrado en la capa de datos.
- **Modelo de datos.** Canciones, voces, instrumentos, partes por instrumento, repertorios,
  servicios, ensayos, historial, tutoriales, recursos y estados de derechos.
- **Interfaz mobile-first.** Biblioteca con búsqueda, hoja de acordes con selector de tonalidad y
  ajuste por semitonos, vista de servicio, estructura de ensayo y centro de tutoriales.
- **Datos de arranque.** Dos himnos de dominio público comprobado.
- **Pruebas.** 113 pruebas de dominio y una comprobación en navegador real.
- **Despliegue.** Workflow de GitHub Pages.

### Corregido

- El parser aceptaba cualquier palabra que empezara por A-G como acorde (`Coro` → `C` + `oro`).
  Ahora el sufijo se valida contra una lista blanca.
- La búsqueda no encontraba palabras partidas por un acorde (`omnipo[A]tente`). Ahora busca sobre
  la letra limpia.

### Notas

- El selector de rol es de demostración y **no es autenticación**.
- La paleta es provisional, a la espera de la identidad oficial de Aurora.
- No hay datos reales del ministerio cargados.
