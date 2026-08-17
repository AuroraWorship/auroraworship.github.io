# Estado del loop

> Punto de entrada de cada sesión. Leer esto antes que ningún otro archivo — y con esto suele
> bastar: la historia está archivada en `docs/HISTORIAL.md` y no hace falta cargarla.

## LOOP actual

**LOOP 019 — REDUCIR EL CONTEXTO** · completado

Aurora añadió los secretos de Supabase en GitHub y pidió reducir la ventana de contexto. Este
loop hace lo segundo: la documentación había crecido a 1.800 líneas y este archivo —de lectura
obligatoria en cada sesión— pesaba 372. Ahora pesa una cuarta parte, sin perder nada: lo
archivado sigue en `docs/HISTORIAL.md` (ADR-025).

Loops 001 a 018 completados y verificados. Índice al final de este archivo.

## Qué falta para cerrar la autenticación (B-03)

El código está escrito y verificado en modo demo (LOOP 018, ADR-024). Los secretos ya están
puestos y el despliegue se relanzó para que el build los tome. Falta **una sola cosa**, que solo
Aurora puede hacer porque este entorno no tiene permiso de red hacia `*.supabase.co`:

Probar el ciclo completo en el sitio publicado — "Entrar" → "¿No tienes cuenta? Créala" →
registrarse → confirmar el correo que envía Supabase → entrar. La primera cuenta queda como
super-admin sola, y entonces debe aparecer "Cuentas y roles" en Ajustes.

Si algo de eso no ocurre, decirlo: se revisa en el siguiente loop.

## Pendiente

Fases 1 a 3 completas, y de la fase 4, Academia (§37). Lo que queda depende de los bloqueos:

1. Sincronización entre dispositivos (B-03). Mientras tanto, la copia de datos del LOOP 007
   hace de puente.
2. Subida de archivos a storage. Hoy el material se enlaza, que funciona.
3. Pagos de Academia (B-06).
4. Pantalla y reproductor de secuencias (modelo ya listo, LOOP 014) e IA — fase 5.

## Bloqueos abiertos

Requieren acción humana. Todo lo demás siguió adelante.

### B-03 · Autenticación real — a falta de la verificación de Aurora

Proyecto de Supabase creado, esquema ejecutado, código escrito, secretos configurados. Solo falta
la prueba en vivo descrita arriba. Detalle técnico en ADR-023 y ADR-024.

### B-04 · Identidad visual de Aurora

La paleta actual es provisional: hereda morado y naranja de MARCADOS. Falta confirmación de
colores, logo y tipografía oficiales.

### B-05 · Datos reales del ministerio

No se ha inventado nada. Falta que Aurora facilite: integrantes y sus instrumentos, vocalistas y
sus tonalidades, repertorio real con su estado de derechos, calendario de servicios y ensayos.

### B-06 · Pagos de Aurora Academy

Depende de B-03: primero cuentas reales, para saber quién pagó qué. Falta que Aurora cree la
cuenta de Stripe (o elija otro proveedor). Plan en ADR-023. Regla sin excepción ("Sin gastos",
`CLAUDE.md`): no se contrata ni se activa nada sin autorización expresa.

**B-01** (organización de GitHub) y **B-02** (activar Pages) quedaron resueltos — ver
`docs/HISTORIAL.md`.

## Índice de loops

Detalle de cada uno en `docs/HISTORIAL.md`; el porqué de las decisiones, en `DECISIONS.md`.

| Loop | Qué trajo |
|---|---|
| 019 | Reducción de contexto: documentación archivada, salida de `smoke` comprimida |
| 018 | Autenticación real: entrar/registrarse, sesión de verdad, asignación de roles |
| 017 | Plan de autenticación y pagos + esquema SQL listo para ejecutar |
| 016 | Aurora Academy: cursos, clases, matrícula, progreso, certificado |
| 015 | Digitaciones de acordes calculadas por instrumento |
| 014 | Arquitectura de secuencias (solo el modelo) |
| 013 | Historial global, progreso personal, estado de canción |
| 012 | Recursos, catálogo de instrumentos ampliable, versiones de canción |
| 011 | Varios servicios, cada uno con su repertorio |
| 010 | Búsqueda avanzada, voces y partes por instrumento |
| 009 | Revisión: código muerto, peso del paquete, offline real |
| 008 | Tutoriales con material enlazado |
| 007 | Copia de datos entre teléfonos (exportar / importar) |
| 006 | Ensayos reales con bloques editables |
| 005 | Favoritos, auditoría de accesibilidad y de contraste |
| 004 | Planificación del servicio, modo en vivo, PWA |
| 003 | Equipo, identidad «soy yo», tonalidad por vocalista, Mi preparación |
| 002 | Persistencia en IndexedDB, editor de canciones |
| 001 | Núcleo: modelo, RBAC, motor musical, interfaz, despliegue |
