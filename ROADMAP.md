# Roadmap

Estados: `[ ]` planificado · `[~]` en curso · `[x]` completo y verificado · `[!]` bloqueado

Nada se marca `[x]` sin prueba o comprobación que lo respalde.

## Fase 1 — Núcleo

- [x] Búsqueda por tonalidad, instrumento, vocalista, etiqueta, dificultad y tempo
- [x] Voces y partes por instrumento editables

- [x] Equipo: integrantes, instrumentos y tesitura
- [x] Catálogo de instrumentos ampliable por el ministerio

- [x] Motor de notas con modelo diatónico
- [x] Motor de acordes (mayores, menores, 7as, sus, add, dim, aug, slash, alteraciones)
- [x] Motor de transposición con preservación de estructura y letra
- [x] Tonalidad original frente a tonalidad actual
- [x] Catálogo de instrumentos
- [x] Modelo de voces (melodía, 1ª, 2ª, 3ª, armonía)
- [x] Modelo de canciones completo
- [x] RBAC: 11 roles, 19 permisos, 3 ámbitos
- [x] Repertorios: base, de servicio y por evento, cada uno independiente
- [x] Biblioteca de canciones con búsqueda
- [x] Hoja de acordes mobile-first
- [!] Autenticación real — bloqueo B-03
- [x] Edición de canciones desde la aplicación
- [x] Tonalidad por vocalista conectada a la UI

## Fase 2 — Operación del ministerio

- [x] Varios servicios, cada uno con su repertorio
- [x] Modelo de ensayos con bloques configurables
- [x] Vista de servicio
- [x] Vista de estructura de ensayo
- [x] Fecha y evento del servicio, editables
- [x] Ensayos programables con bloques, repertorio y reparto
- [x] Asignaciones por integrante
- [x] Vista "Mi preparación"
- [x] Modelo de tutoriales con categorías
- [x] Centro de tutoriales con material por enlace
- [!] Storage cloud para audio, vídeo y PDF — depende de B-03
- [x] Historial (modelo)
- [x] Consulta de historial

## Fase 3 — Uso en vivo

- [x] Modo ensayo
- [x] Modo servicio (interfaz mínima)
- [x] Favoritos
- [x] PWA instalable
- [~] Offline (funciona sin conexión; la sincronización llega con el backend)
- [ ] Notificaciones
- [x] Secuencias: modelo (`SequencePlan`/`SequenceTrack`, ADR-018)
- [ ] Secuencias: pantalla, reproductor e integración con el modo en vivo
- [x] Diagramas de acordes por instrumento, calculados (ADR-019)

## Fase 4 — Aurora Academy

- [x] Cursos, clases y lecciones
- [x] Estudiantes y progreso (personal, y roster para quien enseña)
- [x] Profesores (`Course.teacherIds`, sin rol nuevo de RBAC)
- [x] Certificados (panel imprimible, sin PDF ni verificación externa — ADR-022)
- [!] Pagos — requiere autorización expresa del usuario

## Fase 5 — Escala

- [ ] Aplicación pública (solo contenido redistribuible)
- [ ] Analytics
- [ ] Extensiones de IA sobre datos ya estructurados

## Transversal

- [x] Persistencia local (IndexedDB) tras la interfaz de repositorio
- [x] Exportar e importar datos entre dispositivos
- [x] Separación metadata / storage en el modelo
- [x] Estados de derechos de autor
- [x] Marcado de información pendiente
- [x] Despliegue continuo
- [x] URL definitiva en `auroraworship.github.io` — org creada, repo transferido y Pages sirviendo el build
- [ ] Límites de tamaño y tipo en subidas
- [x] Auditoría de accesibilidad ejecutable (`npm run a11y`)
- [x] Contraste verificado contra WCAG AA
- [ ] Registro de auditoría para cambios de rol
