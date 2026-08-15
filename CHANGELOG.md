# Changelog

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
