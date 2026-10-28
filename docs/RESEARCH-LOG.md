# Research Log — Calama City (autoresearch-goal)

**Objetivo de research**: determinar, con evidencia, la vía técnica correcta para ejecutar las 6 areas de mejora del `PLAN.md` en Unity 6000.6.5f1, corrigiendo de paso las suposiciones falsas del plan.

**Criterios de validator (definidos ANTES de gather)**
| # | Criterio |
|---|----------|
| V1 | Cada recomendación cita >=1 fuente (oficial Unity versionada) O evidencia local observada del repo |
| V2 | Toda accion es compatible con Unity 6000.6.5f1 + la arquitectura de scripts existente (sin motor nuevo, sin assets pagados) |
| V3 | Cada una de las 6 areas del PLAN.md tiene >=1 accion concreta, implementable y con criterio de aceptacion |
| V4 | Los gaps de recuperacion no verificables quedan explicitamente registrados (no inventados) |
| V5 | Confianza declarada por area; los supuestos invalidos se corrigen explicitamente |

**Fronteras de fuente**: Docs oficiales Unity versionadas (docs.unity3d.com/6000.x y Packages/*), paquete local instalado en `Library/PackageCache` (fuente versionada exacta del proyecto), y archivos del repo `Calama City`. **Excluidos**: Stack Overflow sin verificar, tutoriales pre-2020, dependencias de marketplaces pagados.

**Suposicion de recencia**: documentacion Unity 6 consultada el 2026-10-28; se prefiere la URL versionada que coincide con el editor instalado.

**Presupuesto de iteraciones**: 3 ciclos (2 de cierre de brechas + 1 de sintesis/validacion).

---

## Ciclo 1 — Inventario de brechas de evidencia (LOCAL + REGISTRO)

### Hechos locales observados (fuente: repo Calama City)
| Hecho | Evidencia | Impacto en el plan |
|-------|-----------|---------------------|
| **El proyecto NO tiene escenas** | `Assets/**/*.unity` = 0 (solo samples en `Library/PackageCache`) | El juego **no se puede abrir ni jugar**; no hay escena ni build settings (`m_Scenes: []`) |
| **No hay prefabs ni materiales** | `Assets/Prefabs` y `Assets/Materials` existen pero vacios | Todo el escenario es procedural; el build de Windows (Fase 5) no tiene contenido |
| **NO hay tests** | 0 `.asmdef` en Assets; `com.unity.test-framework` 1.8.0 presente como indirecto | El TDD del ROADMAP nunca se pudo cumplir |
| **El pipeline real es Built-in RP, NO URP** | `GraphicsSettings.asset` -> `m_CustomRenderPipeline: {fileID: 0}`; `QualitySettings` sin ref de RP; manifest **sin** `com.unity.render-pipelines.universal` | **README.md y Docs/FASE*.md afirman URP: es falso** |
| Input Handling = **Input Manager (Old)** | `activeInputHandler: 0` | Los 10 usos de `Input.GetKey/GetAxis` funcionan; migrar al Input System es opcional, no urgente |
| Sin paquetes de navegacion/streaming | No hay `com.unity.ai.navigation` ni `com.unity.addressables` | NPCs con NavMesh requieren instalar AI Navigation |
| Fisica de vehiculo naive | `VehiculoController.cs` (106 lineas): 0 WheelCollider, 0 constraints de Rigidbody | La conduccion actual no puede dar sensacion de vehiculo realista |
| Compilacion | Unico error historique: `[Tooltip=...]` en `Minimapa.cs` (CS1003 x6) | **CORREGIDO** en esta sesion |

## Ciclo 2 — Cierre de brechas con fuentes oficiales

| # | Fuente oficial consultada | Hecho citado |
|---|--------------------------|---------------|
| S1 | Wheel colliders — Unity 6.0 Manual `wheel-colliders-introduction` | Cada rueda usa un `WheelCollider` (raycast de suspension); la rueda simulada **no** es geometria visible: se dibuja aparte |
| S2 | Occlusion culling setup — Unity 6.0 Manual `occlusion-culling-getting-started` | Un Static Occluder debe ser opaco, tener Mesh Renderer y **no moverse en runtime**; requiere *bake* de los datos; en Built-in RP se mide overdraw con Scene view mode + panel Stats |
| S3 | LOD — Unity 6.6 Manual `LevelOfDetail` | Unity 6 distingue **Mesh LOD** y **LOD Group**; LOD0 = mas detalle, indices superiores menos detalle |
| S4 | Instalar URP en proyecto Built-in — Unity 6.6 Manual `urp/InstallURPIntoAProject` | Migrar exige: instalar paquete -> crear URP Asset -> asignarlo como render pipeline activo -> convertir assets con Render Pipeline Converter |
| S5 | AI Navigation 2.0.16 Manual `NavMeshSurface` | `NavMeshSurface` define y hornea (Bake) el NavMesh por tipo de agente; admite superficies multiples por escena; solo las superficies habilitadas cargan su NavMesh |
| S6 | Runtime UI (UI Toolkit) — Unity 6.2 Manual `UIE-get-started-with-runtime-ui` | UI Toolkit soporta runtime via `.uxml` + `UIDocument` + Panel Settings; convive con uGUI |
| S7 | Test Framework local `com.unity.test-framework@80f691d4262b` (`SettingsBuilder.cs`) | Flags CLI verificados **en la version instalada**: `-runTests`, `-testPlatform` (EditMode/PlayMode), `-testFilter`, `-testResults`, `-assemblyNames`, `-runSynchronously`, `-quit` |

## Ciclo 3 — Sintesis y priorizacion

### Correccion de supuestos (VALIDATOR)
- El PLAN.md asumia "URP". **Realidad: Built-in RP.** Se corrige el plan (no-objetivo pasa de "mantener URP" a "mantener Built-in RP; URP queda como opcion diferida hasta que exista contenido 3D real").
- El PLAN.md asumia un juego con fases jugables. **Realidad: no existe escena.** Se inserta una Fase 0 (bootstrap jugable) como P0 antes de cualquier mejora.

### Recomendaciones priorizadas (V1/V2/V3)
| Prio | Area | Accion concreta | Fuente | Criterio de aceptacion |
|------|------|-----------------|--------|------------------------|
| **P0** | Nucleo / Bugs | Crear escena `Assets/Scenes/CalamaCity.unity` con bootstrap en runtime: `GameManager` + `CiudadManager` + `GeneradorCalles` + `GeneradorPlaza23DeMarzo` + `GeneradorEdificios` + `PersonajeController` + vehiculo, y registrarla en `EditorBuildSettings` | Evidencia local | Escena abre en Play, no hay NRE, se ve la Plaza 23 de Marzo |
| **P0** | Documentacion | Corregir `README.md` y `Docs/FASE*.md`: declarar Built-in RP (no URP) | Evidencia local + S4 | Cero afirmaciones de URP en docs |
| **P1** | Pruebas | Crear `Assets/Tests/EditMode/` + asmdef de tests y 3 tests EditMode (p.ej. `ObtenerVelocidadKmh()` con Rigidbody en movimiento, clamp del minimapa, escala de generadores) | S7 | `Unity.exe -runTests -batchmode -testPlatform EditMode -testResults results.xml` reporta 0 fallos |
| **P1** | Jugabilidad | Migrar conduccion a `WheelCollider` (suspension, steer, motor torque) manteniendo `GestorVehiculo` y `puntoSalida` intactos | S1 | El coche no derrapa de forma irreal, frena con steering assist, se puede tunear |
| **P2** | Rendimiento | Marcar edificios/calle como Static, aplicar **LOD Group** a edificios lejanos, hornear occlusion culling y medir con panel Stats | S2, S3 | Draw calls y batches reducidos vs. baseline medido; FPS >=30 |
| **P2** | Contenido / NPC | Instalar `com.unity.ai.navigation` (2.0.x) + `NavMeshSurface` para walkers y `NavMeshAgent` | S5 | Peatones caminan sin colisionar con edificios |
| **P3** | UI/UX | Mantener uGUI (ya implementado) para HUD; evaluar UI Toolkit solo para menus nuevos; arreglar que `Minimapa` no distingue vehicle icons | S6 | HUD legible a 1080p y 1440p, sin solapes |
| **P3** | Audio | Motor 3D en `AudioSource` ligado a RPM + ambiente urbano loop | Docs Unity 6 Audio | Sonido sincronizado con aceleracion |

### Lo que NO se hizo (YAGNI, justificado)
- **No** migrar a Input System: `activeInputHandler: 0` y la API legacy funciona; migrar Touchscreen/Pause seria trabajo sin beneficio actual.
- **No** migrar a URP ahora: cero assets/escenas -> costo de migracion ≈ costo de crear el pipeline desde cero; se difiere hasta tener contenido.
- **No** Addressables/streaming de ciudad: sin mundo grande que cargar.

## Resultado del validator
| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| V1 cada recomendacion con fuente | **PASS** | 7 fuentes oficiales (S1-S7) + evidencia local del repo |
| V2 compatible con 6000.6.5f1 y arquitectura | **PASS** | S4/S5/S7 son de la version instalada; no se cambian namespaces ni interfaces |
| V3 las 6 areas con accion + aceptacion | **PASS** | tabla P0-P3 cubre las 6 areas |
| V4 gaps registrados | **PASS** | ver abajo |
| V5 confianza y supuestos corregidos | **PASS** | correccion URP->Built-in documentada |

**Estado global: VALIDADO** — con 2 gaps de recuperacion abiertos (abajo) y sin ejecucion de codigo: este artefacto es *research*, no evidencia de build/CI.

## Gaps de recuperacion (V4) — NO inventados, explicitamente abiertos
1. **G1**: No existe `https://docs.unity3d.com/Packages/com.unity.test-framework@1.8/manual/reference-command-line.html` (404). Se resolvio con la fuente local versionada (S7), que es mas autoritativa, pero la URL canonica para 1.8 sigue sin confirmar.
2. **G2**: No se pudo ejecutar Unity en batchmode con exito en esta sesion (el path del proyecto se resolvia mal y la invocacion supero los 200s). Por tanto **no hay** evidencia de build, de corrida de tests ni de play mode. Todo lo anterior es research + inferencia sobre evidencia local.

## Confianza por area
| Area | Confianza | Motivo |
|------|-----------|--------|
| P0 escena bootstrap | Alta | Hecho local directo (0 escenas) + APIs ya usadas por los scripts |
| P0 docs Built-in RP | Alta | Doble evidencia: `m_CustomRenderPipeline:{fileID:0}` + manifest sin paquete URP |
| P1 tests EditMode | Alta | Flags CLI leidos del codigo del paquete instalado |
| P1 WheelCollider | Media-Alta | Mecanica documentada; el *feel* final requiere iteracion humana |
| P2 rendimiento | Media | Tecnicas documentadas, pero el beneficio real depende del escenario que aun no existe |
| P2 NPC NavMesh | Media-Alta | Componente documentado; requiere instalar el paquete (version a fijar: 2.0.x) |
| P3 UI/UX | Media | uGUI ya existe y funciona; migrar a UI Toolkit es decision de producto, no de docs |
| P3 Audio | Media | Patron estandar, sin fuente especifica citeada |

## Proximas preguntas (next questions)
1. ¿El bootstrap de la escena debe ser **manual en el Editor** o **generado por codigo** (`Assets/Editor/CalamaCityBuild.cs`) para que el build de Windows sea reproducible con un comando? -> Recomendacion: codigo.
2. ¿Se quiere migrar a URP **antes** de crear el primer material, o se acepta Built-in para el MVP? -> Recomendacion: Built-in para el MVP.
3. ¿El alcance de NPC es "peatones decorativos" o "peatones con rutina/tareas"? -> Cambia si se necesita NavMesh o no.
4. ¿Se incluye guardado de partida (PlayerPrefs/JSON) en el MVP o queda para la Fase 6?
