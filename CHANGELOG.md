# Changelog

## [0.1.0] — LOOP 001 · Cloud bootstrap

Primera versión funcional de Aurora OS.

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
