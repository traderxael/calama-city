# Plan de Mejora — Calama City (Post-Fase 5, revisado por research)

> **Revision 2026-10-28** — reescrito tras el ciclo `autoresearch-goal` (ver `docs/RESEARCH-LOG.md`).
> Correccion critica: el proyecto **no usa URP** (usa **Built-in RP**) y **no tiene ninguna escena**, por lo que hoy no es jugable.
>
> **Estado 2026-10-28 (Fase 6 implementada)** — P0 0.1/0.2/0.3 completados: compilacion limpia, escena `Assets/Scenes/CalamaCity.unity` registrada en Build Settings y documentacion corregida. Tambien se completaron los tests EditMode (P1) y el pulido de HUD, minimapa y conduccion. Siguen pendientes: `WheelCollider`, NPC/NavMesh, audio y guardado. Ver `README.md` y `docs/ROADMAP.md`.

## P0 — Bloqueantes (sin esto no hay juego ni build)
| # | Tarea | Criterio de aceptacion |
|---|-------|------------------------|
| 0.1 | Crear `Assets/Scenes/CalamaCity.unity` con bootstrap en runtime: `GameManager`, `CiudadManager`, `GeneradorCalles`, `GeneradorPlaza23DeMarzo`, `GeneradorEdificios`, `PersonajeController`, `GestorVehiculo`, vehiculo y HUD | Escena abre en Play sin `NullReferenceException` y se ve la Plaza 23 de Marzo |
| 0.2 | Registrar la escena en `EditorBuildSettings` (`m_Scenes`) | Build de Windows genera ejecutable jugable |
| 0.3 | Corregir `README.md` y `Docs/FASE*.md`: el pipeline real es **Built-in RP**, no URP | Cero afirmaciones de URP en la documentacion |
| 0.4 | Verificar build: `Unity.exe -batchmode -quit -projectPath <path> -buildWindows64Player <out>` | Build termina con exit code 0 y produce `.exe` |

## Objetivos (Goals)
1. **Hacer jugable el juego**: existe al menos una escena completa con ciudad, personaje, vehiculo y HUD.
2. **Eliminar errores** de compilacion y de tiempo de ejecucion (unico error historico ya corregido: `[Tooltip=]` en `Minimapa.cs`).
3. **Mejorar la jugabilidad**: conduccion con `WheelCollider` (suspension + assist), controles responsivos, feedback visual/auditivo.
4. **Expandir contenido**: variedad estructural en edificios, misiones simples, walkers con IA de navegacion.
5. **Optimizar rendimiento**: static batching, LOD Group, occlusion culling horneado, medido con panel Stats.
6. **Introducir pruebas automatizadas**: suite EditMode ejecutable por CLI, alineada al TDD del ROADMAP.
7. **Pulir UI/UX**: HUD legible, menus, accesibilidad.

## No-objetivos (Non-goals)
- Cambiar de motor (sigue Unity 6000.6.5f1).
- **No migrar a URP en el MVP** — se difiere hasta que exista contenido 3D real; la migracion exige instalar el paquete, crear el URP Asset y convertir assets.
- **No migrar al Input System** — `activeInputHandler: 0` (Input Manager old) y la API legacy funciona; no aporta valor ahora.
- No multijugador en linea.
- No dependencia de assets 3D pagados.

## Suposiciones (corregidas con evidencia)
- ~~El proyecto usa URP~~ → **FALSO**: `GraphicsSettings.m_CustomRenderPipeline = {fileID: 0}` y no hay `com.unity.render-pipelines.universal` en el manifest. **Usa Built-in RP.**
- ~~Las fases 1-5 dejan un juego jugable~~ → **PARCIAL**: las fases dejaron el *codigo*; faltan escena, prefabs, materiales y assets.
- Unity 6000.6.5f1 + Windows Build Support (IL2CPP) disponibles en `C:/Program Files/Unity/Hub/Editor/6000.6.5f1`.
- `com.unity.test-framework` 1.8.0 ya esta instalado (indirecto) -> no requiere instalar nada para escribir tests.
- `com.unity.ai.navigation` **no** esta instalado -> se agrega solo cuando se aborden los walkers.
- Desarrollo individual; el alcance se mide por sprint de 1-2 semanas.

## Hechos conocidos (Known Facts)
- `Assets/` contiene **0 escenas, 0 prefabs, 0 materiales**; todo el escenario es procedural en codigo.
- `EditorBuildSettings.m_Scenes` esta vacio -> hoy el build no tendria contenido.
- `Assets/Scripts` tiene 12 scripts: `GameManager`, `CiudadManager`, `PersonajeController`, `GestorVehiculo`, `VehiculoController` (+ `partial` `VehiculoVelocidad`), `CamaraTerceraPersona`, `HUDVehiculo`, `Minimapa`, `GeneradorCalles`, `GeneradorEdificios`, `GeneradorPlaza23DeMarzo`, `GeneradorCocheSimple`.
- 0 `.asmdef` y 0 tests en todo el repo.
- `VehiculoController` no usa `WheelCollider` ni constraints de Rigidbody (106 lineas).
- El proyecto tiene 5 commits (Fases 1-5) y un working tree con `.meta`/settings sin trackear.

## Criterios de aceptacion (globales)
1. **Compilacion limpia**: 0 errores y 0 warnings en Unity Editor.
2. **Escena jugable**: `Assets/Scenes/CalamaCity.unity` en Play sin excepciones; Plaza 23 de Marzo visible.
3. **Build de Windows**: `.exe` generado con exit code 0 y arranca en <30 s.
4. **Suite verde**: `Unity.exe -runTests -batchmode -testPlatform EditMode -testResults results.xml` -> 0 fallos.
5. **Estabilidad**: 5 min de juego (andar + entrar/salir de vehiculo x3) sin excepciones ni freeze.
6. **Rendimiento**: >=30 FPS con panel Stats visible y draw calls reportados vs. baseline.
7. **Docs correctas**: README y FASE*.md sin afirmaciones falsas sobre el pipeline.

## Estrategia de verificacion (Verification Strategy)
- **Compilacion**: abrir el proyecto en Unity 6000.6.5f1 -> Console sin errores; o batchmode con `-quit` y revisar `Logs/Editor.log`.
- **Tests (flags verificados en el paquete instalado 1.8.0)**:
  `Unity.exe -runTests -batchmode -projectPath "<proj>" -testPlatform EditMode -testFilter "<clase>" -testResults "<abs>/results.xml" -assemblyNames "<asm>" -quit`
  (flags disponibles: `-runTests`, `-testPlatform`, `-testFilter`, `-editorTestsFilter`, `-testResults`, `-assemblyNames`, `-runSynchronously`, `-quit`).
- **Build**: `Unity.exe -batchmode -quit -projectPath "<proj>" -buildWindows64Player "<out>/CalamaCity.exe"` (o metodo propio en `Assets/Editor/`).
- **Play mode**: entrar a la escena, 5 min de juego, Console vacia; repetir entrar/salir de vehiculo 3 veces; HUD y minimapa actualizandose en vivo.
- **Rendimiento**: panel Stats (triangles/verts/batches) antes vs. despues de aplicar batching + LOD + occlusion.
- **Documentacion**: `grep -ri "urp" README.md Docs/` sin resultados falsos.
