# Calama City Web 3D (Three.js + OSM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir en `web/` una recreación 3D jugable en navegador de Calama, Chile a escala real 1:1 en Three.js usando datos precisos de OpenStreetMap, relleno urbano realista de cuadras vacías, hitos arquitectónicos detallados, conducción/exploración con tráfico y GPS interactivo, lista para GitHub Pages sin tocar el proyecto Unity existente.

**Architecture:** Un preprocesador offline en Python (`Tools/generar_datos_web.py`) lee `Assets/Data/OSM/calama_centro.osm`, resuelve multipolígonos (incluyendo el Estadio Zorros del Desierto), extrae los 209 semáforos, 651 pasos de cebra y el grafo vial dirigido, rellena las cuadras vacías sin invadir calles ni áreas verdes y exporta `web/data/calama_map.json`. El cliente en `web/` usa ES Modules nativos con Three.js r170 local en `web/vendor/`, agrupa calles y edificios en sectores (`400 × 400 m`) con texturas procedurales en Canvas e `InstancedMesh` (< 120 draw calls para correr fluido en una GT 640), modela los hitos reales en 3D y ofrece física vehicular/peatonal sobre `SpatialGrid` junto a un minimapa y mapa GPS completo (`M`).

**Tech Stack:** Three.js `0.170.0` (ES Modules locales en `web/vendor/`), JavaScript ES2023 (`node --test` en Node 22 para pruebas unitarias), Python 3.12 (`unittest` para el pipeline OSM), HTML5 Canvas 2D (atlas de texturas y mapa vectorial GPS), GitHub Actions (`actions/deploy-pages`).

**Spec:** `docs/superpowers/specs/2026-11-11-calama-city-web-threejs-design.md`

## Global Constraints

- **Unity 6 intacto:** Prohibido modificar o borrar archivos existentes de Unity (`Assets/*.cs`, `Assets/Scenes/`, `Packages/`, `ProjectSettings/`). Solo se añade `Tools/generar_datos_web.py`, `web/`, `tests/`, `.github/workflows/pages.yml` y una sección de enlace Web en `README.md`.
- **Escala y proyección sin espejado:** Origen `(0, 0)` en Plaza 23 de Marzo (`lat = -22.4624`, `lon = -68.9272`); `1 unidad = 1 metro`; `+X = Este` (`+(lon - lon0) * M_LON`), `-Z = Norte` (`-(lat - lat0) * M_LAT`), `+Y = Arriba`.
- **Presupuesto GPU GT 640 (2 GB):** `pixelRatio <= 1.5` por defecto, sin shadow maps dinámicos costosos en modo base, mallas estáticas combinadas por chunks de `400 × 400 m` e `InstancedMesh` para props/tráfico, manteniendo `<= 120` draw calls visibles en vista urbana normal.
- **Cero dependencia obligatoria de red en runtime:** Three.js y `GLTFLoader` viven en `web/vendor/`; `web/data/calama_map.json` es local; si no hay internet, el juego y el mapa GPS funcionan al 100 % en modo vectorial.
- **Atribución legal visible:** Mostrar `© OpenStreetMap contributors (ODbL)` en el HUD/mapa y créditos; no usar fotos con marcas comerciales como texturas directas.

## Review Focus

1. **Inversión o espejado cardinal (`+X`/`-Z`):** Un signo invertido en latitud espeja toda Calama de norte a sur; el test de proyección en Task 1 verifica que puntos al norte de `-22.4624` tengan `z < 0` y al este de `-68.9272` tengan `x > 0`.
2. **Edificios de relleno (`infill`) invadiendo calzadas, parques o el Río Loa:** El test en Task 1 verifica sobre el JSON real generado que ningún polígono con `real === 0` caiga dentro del semiancho + margen de vereda de las calles ni dentro de Plaza 23 de Marzo.
3. **Ejes Z-up rotados en hitos 3D (torres acostadas horizontalmente):** El test en Task 4 verifica en cada constructor de hito (`Catedral`, `Municipalidad`, `Codelco`, `Estadio`, `Plaza23`) que la caja envolvente asiente en `min.y >= -0.5` y tenga su altura vertical real en `+Y`.
4. **Atravesar edificios a alta velocidad (tunneling) o bloqueo rígido contra muros:** El test en Task 2 y Task 5 verifica sub-stepping en vehículos rápidos (120 km/h) y deslizamiento tangencial suave contra polígonos en `SpatialGrid`.
5. **Fallo del mapa GPS cuando las teselas OSM online están bloqueadas o sin red:** El test en Task 6 verifica que `MapGPS` capture cualquier error de carga de `Image` de teselas remotas y renderice el mapa vectorial completo sin lanzar excepciones.

---

### Task 1: Pipeline Cartográfico OSM de Alta Precisión e Infill Urbano

**Files:**
- Create: `Tools/generar_datos_web.py`
- Create: `tests/test_generar_datos_web.py`
- Generate: `web/data/calama_map.json`

**Interfaces:**
- Consumes: `Assets/Data/OSM/calama_centro.osm` (XML OSM crudo, 9.5 MB)
- Produces: `web/data/calama_map.json` con esquema exacto:
  - `meta`: `{ version: 1, origin: { lat: -22.4624, lon: -68.9272 }, bounds: [minX, minZ, maxX, maxZ] }`
  - `roads`: `Array<{ id: number, n: string, t: string, w: number, o: -1|0|1, s: string, p: number[] }>` (`p = [x0,z0, x1,z1, ...]` cuantizado a `0.1 m`)
  - `graph`: `{ nodes: number[], edges: Array<[fromIdx, toIdx, roadIdx, oneway]> }` (`nodes = [x0,z0, ...]`)
  - `buildings`: `Array<{ h: number, k: number, r: 0|1, p: number[], holes?: number[][] }>` (`k`: `0=residencial`, `1=comercial`, `2=corporativo/industrial`, `3=institucional`; `r`: `1=OSM real`, `0=infill`)
  - `landmarks`: `Array<{ id: string, kind: string, name: string, cx: number, cz: number, angle: number, h: number, p: number[], holes?: number[][] }>` (incluye `plaza23`, `catedral`, `municipalidad`, `codelco`, `estadio`, `mall`, `terminal`, `paseo_ramirez`, `parque_loa`, `cobreloa`)
  - `parks`: `Array<{ name: string, p: number[] }>`, `plazas`: `Array<{ name: string, p: number[] }>`, `waterLines`: `Array<{ w: number, p: number[] }>`, `waterPolys`: `Array<{ p: number[] }>`, `railways`: `Array<{ p: number[] }>`
  - `signals`: `number[]` (`[x0,z0, ...]`, los ~209 semáforos reales), `crossings`: `number[]` (`[x0,z0, angleRad, ...]`, los ~651 pasos de cebra orientados a su vía)
  - `pois`: `Array<{ n: string, c: string, x: number, z: number }>`

- [ ] **Step 1: Escribir las pruebas fallidas del preprocesador OSM en `tests/test_generar_datos_web.py`**

Cubrir con `unittest`:
1. `test_proyeccion_sin_espejado`: `lat_lon_to_xz(-22.4614, -68.9262)` devuelve `x > 0` y `z < 0` (~110 m Norte, ~102 m Este).
2. `test_ensamblaje_multipoligono_estadio`: sobre `calama_centro.osm`, `landmarks` incluye `kind == "estadio"` (`Estadio Zorros del Desierto`) con área de huella `> 8000 m²`.
3. `test_semaforos_cruces_y_grafo`: `len(signals) // 2 >= 180`, `len(crossings) // 3 >= 500`, y `len(graph["edges"]) >= 2500`.
4. `test_infill_llena_cuadras_sin_pisar_calles_ni_plaza`: existen `>= 1500` edificios con `r == 0` (infill) además de `>= 1000` con `r == 1` (OSM), ningún vértice de edificio infill cae dentro del polígono de Plaza 23 de Marzo ni a menos de `(road.w * 0.5 + 1.2)` metros del eje de calles principales cercanas, y el archivo `web/data/calama_map.json` pesa `< 4_500_000` bytes.

- [ ] **Step 2: Ejecutar el test para verificar que falla (RED)**

Run: `python -m unittest tests/test_generar_datos_web.py -v`
Expected: FAIL con `ModuleNotFoundError` para `generar_datos_web`.

- [ ] **Step 3: Implementar `Tools/generar_datos_web.py` y generar `web/data/calama_map.json`**

Implementar:
- `lat_lon_to_xz(lat: float, lon: float) -> tuple[float, float]`
- Resolución de relaciones `type=multipolygon` encadenando ways `outer`/`inner` abiertos o cerrados.
- Extracción de `roads`, `signals`, `crossings`, `pois`, `parks`, `waterLines`, `waterPolys`, `railways`, `landmarks` (calculando el ángulo principal `angle` del frente más largo o hacia la calle adyacente).
- `generar_infill(roads, real_buildings, forbidden_polys) -> list[dict]`: grilla de ocupación espacial (`celda = 2.0 m`) sobre el casco urbano (`x in [-2400, 2200]`, `z in [-2200, 2200]`), marcando calzadas + vereda, edificios reales, parques, plazas, estadio, agua y ferrocarril; recorre segmentos viales urbanos generando lotes rectangulares orientados a la vía (frentes 8–14 m, fondos 11–18 m) solo cuando las muestras interiores y de borde del lote estén 100 % libres en la grilla, asignando altura/tipología comercial en ejes céntricos y residencial nortina en el resto.
- Construcción de `graph` fusionando vértices viales en tolerancia de `1.0 m`.

- [ ] **Step 4: Ejecutar el generador y las pruebas para verificar que pasan (GREEN)**

Run: `python Tools/generar_datos_web.py && python -m unittest tests/test_generar_datos_web.py -v`
Expected: `web/data/calama_map.json` generado y todos los tests `OK`.

- [ ] **Step 5: Commit de Task 1**

Run: `git add Tools/generar_datos_web.py tests/test_generar_datos_web.py web/data/calama_map.json && git commit -m "feat(data): generar mapa web preciso de Calama con multipoligonos, semaforos e infill"`

---

### Task 2: Base de `web/`, Vendor Local de Three.js, Geometría/Triangulación y `SpatialGrid`

**Files:**
- Create: `web/vendor/three.module.min.js`, `web/vendor/GLTFLoader.js`, `web/vendor/BufferGeometryUtils.js` (descargados de `three@0.170.0` y parcheados con import relativo `./three.module.min.js`)
- Create: `web/assets/models/catedral_calama.glb` (copia desde `Assets/Resources/Models/catedral_calama.glb`)
- Create: `web/src/utils/Geometry2D.js`
- Create: `web/src/physics/SpatialGrid.js`
- Create: `web/src/world/ProceduralTextures.js`
- Create: `tests/web/physics_and_geo.test.mjs`

**Interfaces:**
- Produces:
  - `Geometry2D.js`: `earcut2D(flatPoints, holesFlat = []) -> number[]`, `polygonAreaSigned(flatPoints) -> number`, `closestPointOnSegment(px, pz, ax, az, bx, bz) -> { x, z, distSq, t }`, `pointInPolygon(px, pz, flatPoints) -> boolean`
  - `SpatialGrid.js`: `class SpatialGrid { constructor(cellSize = 32); addPolygon(flatPoints, meta = {}); resolveCircle(x, z, radius) -> { x: number, z: number, hit: boolean, normalX: number, normalZ: number }; resolveSweptCircle(x0, z0, x1, z1, radius) -> { x: number, z: number, hit: boolean, normalX: number, normalZ: number }; findNearestRoad(x, z, maxDist = 40) -> object|null; addRoadSegment(ax, az, bx, bz, roadMeta) }`
  - `ProceduralTextures.js`: `createCityTextures(THREE, doc?) -> { facadeCommercial, facadeResidential, facadeModern, asphalt, cobbleRamirez, plazaTile, roofDesert }` (funciona tanto con DOM `<canvas>` en navegador como con `DataTexture` de respaldo en entorno Node headless para tests).

- [ ] **Step 1: Escribir las pruebas fallidas en `tests/web/physics_and_geo.test.mjs`**

Probar con `node:test` y `node:assert/strict`:
1. Importación directa de `THREE` desde `../../web/vendor/three.module.min.js`.
2. `earcut2D` triangula polígonos cóncavos en L y polígonos con hueco interior (como el Estadio) devolviendo el área total exacta.
3. `SpatialGrid.resolveCircle` empuja fuera un círculo que penetra un edificio y permite deslizar paralelo al muro sin trabarse.
4. `SpatialGrid.resolveSweptCircle` impide atravesar un muro delgado de `4 m` aunque el vehículo avance `12 m` en un solo frame (anti-tunneling).
5. `SpatialGrid.findNearestRoad` devuelve el nombre real de la calle más cercana.

- [ ] **Step 2: Ejecutar `node --test` para verificar que falla (RED)**

Run: `node --test tests/web/physics_and_geo.test.mjs`
Expected: FAIL por módulos aún inexistentes.

- [ ] **Step 3: Descargar `web/vendor/` e implementar `Geometry2D.js`, `SpatialGrid.js` y `ProceduralTextures.js`**

- Descargar `three.module.min.js`, `GLTFLoader.js` y `BufferGeometryUtils.js` de `three@0.170.0` ajustando imports internos a `./three.module.min.js`, y copiar `catedral_calama.glb` a `web/assets/models/`.
- Implementar triangulación ear-clipping con puenteo de huecos (`bridgeHoles`), colisión `SpatialGrid` con sub-pasos automáticos en `resolveSweptCircle`, e indexación de segmentos viales para consulta rápida de calle actual.
- Implementar `ProceduralTextures.js` generando texturas ricas en Canvas 2D (estuco nortino con ventanas y cortinas comerciales, muro cortina azul, adoquín del Paseo Ramírez, baldosa de Plaza 23 de Marzo y asfalto con grano) con fallback `DataTexture` cuando `document` no existe.

- [ ] **Step 4: Ejecutar `node --test` para verificar que pasa (GREEN)**

Run: `node --test tests/web/physics_and_geo.test.mjs`
Expected: PASS (0 fallos).

- [ ] **Step 5: Commit de Task 2**

Run: `git add web/vendor web/assets tests/web/physics_and_geo.test.mjs web/src/utils/Geometry2D.js web/src/physics/SpatialGrid.js web/src/world/ProceduralTextures.js && git commit -m "feat(web-core): agregar Three.js local, triangulacion con huecos, SpatialGrid y texturas procedurales"`

---

### Task 3: Construcción del Mundo 3D por Chunks (Red Vial, Edificios, Río Loa, Rieles y Props Instanciados)

**Files:**
- Create: `web/src/world/RoadNetworkMesh.js`
- Create: `web/src/world/BuildingMesh.js`
- Create: `web/src/world/StreetProps.js`
- Create: `web/src/world/WorldBuilder.js`
- Create: `tests/web/world_builder.test.mjs`

**Interfaces:**
- Consumes: `calama_map.json`, `Geometry2D.js`, `ProceduralTextures.js`, `SpatialGrid.js`
- Produces:
  - `buildRoadMeshes(THREE, mapData, textures) -> THREE.Group` (calzadas jerarquizadas, discos/polígonos de intersección, veredas elevadas `0.14 m` en zona céntrica, Paseo Ramírez en adoquín, líneas divisorias y los 651 pasos de cebra reales)
  - `buildChunkedBuildings(THREE, buildings, textures, chunkSize = 400) -> { group: THREE.Group, chunkCount: number, drawCallsEstimate: number }` (extrusión con UVs por metros para repetir pisos y ventanas, colores nortinos por vértice + vertex AO oscuro en `y=0`, parapetos/techos y agrupación por sector + categoría de fachada)
  - `buildStreetProps(THREE, mapData) -> { group: THREE.Group, updateSignalPhase(timeSec): void, getSignalStateAt(x, z, timeSec): 'green'|'red' }` (`InstancedMesh` para los 209 semáforos reales con luces verde/roja alternantes N-S vs E-O, farolas urbanas, pimientos calameños de tronco blanco y palmeras en plazas/parques)
  - `buildWorld(THREE, mapData, options?) -> { root: THREE.Group, colliderGrid: SpatialGrid, propsCtrl: object, stats: { drawCallsStatic: number, buildingCount: number, roadCount: number } }` (incluye suelo desértico del Loa, cordillera andina/cerros periféricos, Río Loa, parques, plazas y línea férrea FCAB con durmientes/rieles).

- [ ] **Step 1: Escribir las pruebas fallidas en `tests/web/world_builder.test.mjs`**

Cargar un subconjunto real de `web/data/calama_map.json` (centro en radio `600 m`) y verificar:
1. `buildWorld` construye mallas válidas (`position` sin `NaN`, con normales y colores de vértice).
2. El número total de `THREE.Mesh` + `THREE.InstancedMesh` estáticos generados para el radio céntrico es `<= 95` (cumpliendo holgadamente el presupuesto de la GT 640).
3. `colliderGrid` bloquea el paso dentro de los edificios reales e infill pero deja libre la Plaza 23 de Marzo `(0, 0)` y las calles adyacentes.
4. `propsCtrl.getSignalStateAt` alterna estados `'green'` / `'red'` de forma determinista con el tiempo.

- [ ] **Step 2: Ejecutar `node --test` para verificar que falla (RED)**

Run: `node --test tests/web/world_builder.test.mjs`
Expected: FAIL por módulos faltantes.

- [ ] **Step 3: Implementar `RoadNetworkMesh.js`, `BuildingMesh.js`, `StreetProps.js` y `WorldBuilder.js`**

Cuidar especialmente:
- Micro-offset determinista de altura por jerarquía vial (`parques 0.02 m`, `plazas 0.04 m`, `veredas 0.12 m`, `calles secundarias 0.05 m`, `calles primarias 0.06 m`, `cruces peatonales 0.075 m`) con `polygonOffset` para cero *z-fighting*.
- Vertex colors en edificios multiplicando el tono nortino de cada lote por `0.68` en la base (`y = 0`) y `1.0` en la cornisa para simular oclusión ambiental sin coste de shader extra.
- `InstancedMesh` para árboles (copa frondosa + tronco inferior pintado de cal blanca en pimientos urbanos), farolas y los 209 semáforos reales.

- [ ] **Step 4: Ejecutar `node --test` para verificar que pasa (GREEN)**

Run: `node --test tests/web/world_builder.test.mjs`
Expected: PASS (0 fallos).

- [ ] **Step 5: Commit de Task 3**

Run: `git add web/src/world/RoadNetworkMesh.js web/src/world/BuildingMesh.js web/src/world/StreetProps.js web/src/world/WorldBuilder.js tests/web/world_builder.test.mjs && git commit -m "feat(world): construir mallas urbanas por chunks, red vial con pasos de cebra y props instanciados"`

---

### Task 4: Diseños 3D Detallados de los Hitos Reales de Calama

**Files:**
- Create: `web/src/world/Landmarks3D.js`
- Modify: `web/src/world/WorldBuilder.js` (integrar `buildLandmarks3D` y registrar sus colisionadores en `SpatialGrid` omitiendo duplicar bloques genéricos sobre los mismos hitos)
- Create: `tests/web/landmarks_3d.test.mjs`

**Interfaces:**
- Produces in `Landmarks3D.js`:
  - `createCatedral3D(THREE) -> THREE.Group` (zócalo pétreo, nave, techo a dos aguas, fachada crema con pilastras y arcos terracota-rosados, portal ojival profundo, rosetón vitral azul con nervaduras, torre central con celosías, aguja piramidal oscura y cruz, más dos torretas laterales con agujas)
  - `createPlaza23DeMarzo3D(THREE, landmarkData) -> THREE.Group` (odeón octogonal con cúpula, monumento central, espejo de agua/fuente, bancas perimetrales, farolas clásicas amarillas y pimientos)
  - `createMunicipalidad3D(THREE) -> THREE.Group` (volumen esquina crema neoclásico, zócalo azul cerámico, balcón central sobre ménsulas, frontón escalonado y 3 mástiles con banderas de Chile, Calama y Wiphala)
  - `createCodelcoNorte3D(THREE) -> THREE.Group` (alas de hormigón visto ranurado, bloque central de cristal azul reflectante y gran pérgola reticular color cobre sobre pilares en el patio de acceso)
  - `createEstadioZorros3D(THREE, landmarkData) -> THREE.Group` (envolvente perimetral facetada color cobre Cobreloa siguiendo su huella real, graderías interiores naranjas, cancha de césped con demarcación blanca y arcos, y 4 torres de iluminación de estadio)
  - `createPaseoRamirezYMinero3D(THREE, landmarkData) -> THREE.Group` (Monumento al Minero en bronce/cobre con casco y picota sobre pedestal pétreo, pérgolas sombreadoras y jardineras)
  - `createMallYTerminal3D(THREE, kind, landmarkData) -> THREE.Group`
  - `buildLandmarks3D(THREE, mapData, colliderGrid, gltfLoader?) -> { group: THREE.Group, items: Array<{ id: string, name: string, kind: string, x: number, z: number, object: THREE.Object3D }> }`

- [ ] **Step 1: Escribir las pruebas fallidas en `tests/web/landmarks_3d.test.mjs`**

Verificar con `node:test`:
1. Cada constructor (`createCatedral3D`, `createPlaza23DeMarzo3D`, `createMunicipalidad3D`, `createCodelcoNorte3D`, `createEstadioZorros3D`, `createPaseoRamirezYMinero3D`) genera geometría no vacía, con `Box3` asentado en suelo (`min.y >= -0.6` y `min.y <= 0.5`) y orientación vertical correcta (`max.y` de Catedral `>= 22 m`, `max.y` de torres del Estadio `>= 20 m`, sin ejes Z-up acostados).
2. `buildLandmarks3D` sobre `web/data/calama_map.json` posiciona todos los hitos principales en sus coordenadas reales de Calama (Catedral a `< 80 m` de `(0, 0)`, Municipalidad a `< 250 m`, Estadio Zorros y Codelco en sus coordenadas OSM reales).

- [ ] **Step 2: Ejecutar `node --test` para verificar que falla (RED)**

Run: `node --test tests/web/landmarks_3d.test.mjs`
Expected: FAIL por `Landmarks3D.js` inexistente.

- [ ] **Step 3: Implementar `Landmarks3D.js` y conectarlo en `WorldBuilder.js`**

Modelar cada hito con proporciones y paleta fieles a las fotos de `Referencias/fotos/`, registrando colisionadores exactos en `colliderGrid` (dejando transitables la explanada de Plaza 23 de Marzo y el Paseo Ramírez excepto en monumentos/quiosco) y ofreciendo carga asíncrona opcional de `assets/models/catedral_calama.glb` normalizando automáticamente su escala y rotación Y-up si se habilita.

- [ ] **Step 4: Ejecutar `node --test` para verificar que pasa (GREEN)**

Run: `node --test tests/web/landmarks_3d.test.mjs tests/web/world_builder.test.mjs`
Expected: PASS (0 fallos).

- [ ] **Step 5: Commit de Task 4**

Run: `git add web/src/world/Landmarks3D.js web/src/world/WorldBuilder.js tests/web/landmarks_3d.test.mjs && git commit -m "feat(landmarks): modelar en 3D Catedral, Plaza 23 de Marzo, Municipalidad, Codelco, Estadio y Paseo Ramirez"`

---

### Task 5: Personaje 3D Articulado, Flota Vehicular Calameña, Cámara y Tránsito/Peatones IA

**Files:**
- Create: `web/src/entities/PlayerController.js`
- Create: `web/src/entities/VehicleController.js`
- Create: `web/src/entities/TrafficAndPeds.js`
- Create: `web/src/entities/ThirdPersonCamera.js`
- Create: `tests/web/entities_and_traffic.test.mjs`

**Interfaces:**
- Produces:
  - `PlayerController`: modelo 3D articulado (cabeza, gorra/cabello, torso, brazos y piernas con pivotes), `update(dt, input, cameraYaw, colliderGrid)`, salto/gravedad, animación de extremidades según velocidad, `enterVehicle(vehicle)` / `exitVehicle(colliderGrid)` buscando salida libre de muros.
  - `VehicleController`: constructores 3D detallados `createVehicleMesh(THREE, variant)` para `'pickup_minera'` (roja/blanca con barra antivuelco y caja trasera), `'colectivo'` (negro con letrero amarillo de línea calameña en techo) y `'sedan'`; física estable de bicicleta con aceleración, reversa, dirección progresiva sensible a la velocidad, freno de mano (`handbrake`), luces de freno emisivas, rotación/viraje de las 4 ruedas y colisión continua con `colliderGrid.resolveSweptCircle`.
  - `TrafficAndPeds`: administra flota de vehículos IA sobre `mapData.graph` respetando `oneway` y deteniéndose ante semáforos en rojo (`propsCtrl.getSignalStateAt`), más peatones articulados caminando en veredas/plazas dentro de un radio de `180 m` alrededor del foco activo; todos los vehículos estacionados o de tráfico pueden ser abordados con `E` cuando el jugador está a `<= 4.2 m`.
  - `ThirdPersonCamera`: cámara orbital suave con mouse/teclas, transición fluida pie <-> vehículo y modos de distancia (`C`).

- [ ] **Step 1: Escribir las pruebas fallidas en `tests/web/entities_and_traffic.test.mjs`**

Verificar con `node:test`:
1. `PlayerController` avanza con input `forward`, anima extremidades, salta con `jump` y no atraviesa polígonos en `SpatialGrid`.
2. `VehicleController` acelera en marcha adelante, reduce radio de giro a alta velocidad, enciende luces de freno al frenar y no atraviesa un muro de edificio ni siquiera a `35 m/s` (~126 km/h).
3. Subir y bajar de un vehículo (`E`) transfiere el control limpio y coloca al jugador en un punto exterior libre de colisión.
4. `TrafficAndPeds` mueve autos IA únicamente en el sentido permitido de aristas `oneway === 1` y detiene vehículos frente a un semáforo en `'red'`.

- [ ] **Step 2: Ejecutar `node --test` para verificar que falla (RED)**

Run: `node --test tests/web/entities_and_traffic.test.mjs`
Expected: FAIL por módulos inexistentes.

- [ ] **Step 3: Implementar `PlayerController.js`, `VehicleController.js`, `TrafficAndPeds.js` y `ThirdPersonCamera.js`**

Asegurar manejo ágil y divertido desde el primer segundo, con camioneta pickup minera estacionada junto a la Plaza 23 de Marzo lista para conducir al iniciar.

- [ ] **Step 4: Ejecutar `node --test` para verificar que pasa (GREEN)**

Run: `node --test tests/web/entities_and_traffic.test.mjs`
Expected: PASS (0 fallos).

- [ ] **Step 5: Commit de Task 5**

Run: `git add web/src/entities tests/web/entities_and_traffic.test.mjs && git commit -m "feat(gameplay): implementar personaje articulado, flota vehicular 3D, camara y trafico IA"`

---

### Task 6: HUD Urbano, Ciclo Solar del Atacama, Mapa GPS Interactivo (`M`) y GitHub Pages

**Files:**
- Create: `web/src/ui/MapGPS.js`
- Create: `web/src/ui/HUD.js`
- Create: `web/src/main.js`
- Create: `web/styles.css`
- Create: `web/index.html`
- Create: `web/.nojekyll`
- Create: `.github/workflows/pages.yml`
- Modify: `README.md` (añadir sección de versión Web Three.js y despliegue en GitHub Pages sin alterar la documentación de Unity)
- Create: `tests/web/map_gps.test.mjs`

**Interfaces:**
- Produces:
  - `MapGPS`: lógica pura desacoplada + renderizador Canvas 2D para minimapa en esquina y mapa completo (`M`):
    - `worldToTile(x, z, zoom, originLat, originLon) -> { tx, ty, px, py }` (conversión exacta Web Mercator para superponer teselas OSM opcionales alineadas al metro con la geometría 3D)
    - `searchMap(mapData, query) -> Array<{ label: string, kind: 'landmark'|'street'|'poi', x: number, z: number }>`
    - `computeRoutePolyline(graph, fromX, fromZ, toX, toZ) -> Array<[number, number]>` (ruta A* sobre el grafo vial real para mostrar línea GPS hacia el destino elegido)
    - Manejo tolerante a fallos si la carga de imágenes `tile.openstreetmap.org` falla o está offline (degrada limpio al render vectorial completo con calles, edificios, parques, Río Loa y nombres).
  - `HUD.js` + `main.js` + `index.html`:
    - Arranque instantáneo frente a la Plaza 23 de Marzo mirando hacia la Catedral y la pickup minera.
    - Indicador de calle actual en vivo, velocímetro digital/arco en `KM/H`, aviso contextual *"Presiona E para conducir"*, selector de hora (`Día Atacama`, `Atardecer Calameño`, `Noche Urbana`), selector de calidad gráfica (`Baja`, `Media`, `Alta`), controles táctiles opcionales en pantallas móviles, pausa (`Esc`) y atribución `© OpenStreetMap contributors`.

- [ ] **Step 1: Escribir las pruebas fallidas en `tests/web/map_gps.test.mjs`**

Verificar con `node:test`:
1. `searchMap` encuentra `"Ramírez"`, `"Catedral"`, `"Zorros"` y `"Codelco"` devolviendo coordenadas reales en metros.
2. `computeRoutePolyline` calcula una ruta vial conectada entre Plaza 23 de Marzo `(0, 0)` y Mall Plaza / Estadio sobre `mapData.graph`.
3. `worldToTile` proyecta `(0, 0)` exactamente a la tesela Web Mercator correspondiente a `(-22.4624, -68.9272)`.
4. El cargador de teselas remotas con un cargador simulado que rechaza/falla no lanza excepciones y mantiene `tileFallbackActive === true`.

- [ ] **Step 2: Ejecutar `node --test` para verificar que falla (RED)**

Run: `node --test tests/web/map_gps.test.mjs`
Expected: FAIL por `MapGPS.js` inexistente.

- [ ] **Step 3: Implementar `MapGPS.js`, `HUD.js`, `main.js`, `styles.css`, `index.html`, `.nojekyll`, `.github/workflows/pages.yml` y actualizar `README.md`**

Conectar todos los subsistemas en `web/src/main.js` con iluminación dinámica (sol direccional + luz hemisférica + niebla desértica + ventanas/farolas nocturnas), HUD limpio y workflow oficial de GitHub Pages desplegando `./web`.

- [ ] **Step 4: Ejecutar toda la suite automatizada (Python + Node) y verificación en navegador real**

Run: `python -m unittest discover -s tests -p "test_*.py" -v && node --test tests/web/*.test.mjs`
Expected: 100 % PASS con 0 errores; luego abrir `web/` en el navegador real, comprobar `0` errores en consola, verificar FPS/draw calls y tomar capturas reales de Plaza 23 de Marzo, Catedral, conducción, Estadio/Codelco y Mapa GPS.

- [ ] **Step 5: Commit de Task 6**

Run: `git add web tests/web/map_gps.test.mjs .github/workflows/pages.yml README.md && git commit -m "feat(web): completar juego Calama City en Three.js con HUD, GPS con rutas y GitHub Pages"`
