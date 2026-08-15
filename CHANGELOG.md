# Changelog

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
