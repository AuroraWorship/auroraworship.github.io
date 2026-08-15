# Estado del loop

> Punto de entrada de cada sesión. Leer esto antes que ningún otro archivo.

## LOOP actual

**LOOP 001 — CLOUD BOOTSTRAP** · completado

## Objetivo

Levantar el proyecto desde cero en la nube: stack, arquitectura, modelo de datos, RBAC, motor
musical probado y una aplicación que se pueda abrir y usar.

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

## Pendiente (siguiente loop)

**LOOP 002 — PERSISTENCIA Y EDICIÓN**

1. Edición de canciones desde la aplicación (hoy solo lectura).
2. Persistencia local (IndexedDB) tras la interfaz de repositorio: hace la aplicación usable de
   verdad sin depender aún de cuenta externa.
3. Modelo de vocalista + tonalidad por vocalista, conectado a la vista de servicio.
4. Vista "Mi preparación".
5. PWA instalable.

## Errores corregidos en este loop

| Qué | Cómo se detectó |
|---|---|
| `Coro` se parseaba como acorde (`C` + sufijo `oro`) | Prueba `isChord('Coro')` |
| La búsqueda no encontraba palabras partidas por un acorde (`omnipo[A]tente`) | Prueba de búsqueda por letra |
| 404 de consola por favicon ausente | Comprobación en navegador |

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
