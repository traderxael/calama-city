# Diseño Técnico: Calama City Web 3D (Three.js + Cartografía Real OSM)

- **Fecha:** 2026-11-11
- **Repositorio:** `traderxael/calama-city`
- **Ubicación de la nueva versión Web:** `web/` (dejando el proyecto Unity 6 de la raíz 100 % intacto)
- **Publicación objetivo:** GitHub Pages estático desde `web/`

---

## 1. Intención y el Porqué

**Calama City** busca recrear la experiencia de recorrer a pie y conducir libremente por la ciudad real de **Calama, Chile** (Región de Antofagasta, desierto de Atacama).

Actualmente el repositorio tiene un MVP en Unity 6 pensado para una máquina con GPU modesta (**NVIDIA GT 640, 2 GB**), donde existen avances locales con datos de OpenStreetMap pero con limitaciones visibles: más del 85 % de las cuadras aparecen vacías por falta de polígonos de casas en OSM, se perdieron relaciones multipolígono clave (como el Estadio Zorros del Desierto), los edificios lucen como cajas lisas sin identidad local y no existe una versión jugable en navegador.

El objetivo de este proyecto es crear en `web/` una **versión jugable completa en Three.js**, lista para **GitHub Pages**, que lleve la precisión geográfica y la identidad arquitectónica de Calama al máximo nivel posible dentro del presupuesto de rendimiento de una GT 640, sin alterar ningún archivo del proyecto Unity existente.

---

## 2. Objetivos, No-Objetivos y Anti-Objetivos

### Objetivos (Goals)
1. **Precisión cartográfica escala 1:1 (1 unidad = 1 metro):** Trazado exacto del cuadrante urbano de Calama (`[-68.9600, -22.4900, -68.9000, -22.4400]`, ~6,6 × 5,5 km) con origen `(0, 0)` en la **Plaza 23 de Marzo** (`lat -22.4624, lon -68.9272`), preservando anchos reales, nombres de calles, sentidos de tránsito (`oneway`), los **209 semáforos reales**, los **651 pasos de cebra**, el **Río Loa**, el **Parque El Loa**, la **línea férrea (FCAB)** y las relaciones multipolígono de OSM.
2. **Ciudad llena y creíble (relleno urbano de cuadras vacías):** Precalcular loteos y edificaciones realistas en las manzanas donde OpenStreetMap no tiene polígonos trazados, respetando estrictamente calles, veredas, parques, plazas, vías férreas, cauces de agua y edificios OSM reales.
3. **Diseños 3D fieles de hitos calameños:** Modelar en Three.js (apoyándose en las fotos de referencia de `Referencias/fotos/` y en `catedral_calama.glb`) los hitos emblemáticos en sus coordenadas y orientaciones reales:
   - Catedral San Juan Bautista
   - Plaza 23 de Marzo (quiosco/monumento, pimientos, bancas, farolas)
   - Ilustre Municipalidad de Calama
   - Paseo Peatonal Eleuterio Ramírez y Monumento al Minero
   - Edificio Corporativo Codelco Norte (con su pérgola cobriza)
   - Estadio Municipal Zorros del Desierto
   - Mall Plaza Calama y Terminal de Buses
4. **Vehículos, personaje y vida urbana en 3D:** Reemplazar cápsulas y cubos simples por un personaje articulado con animación procedural, vehículos característicos de Calama (camioneta pickup minera, colectivo urbano y sedán) con ruedas funcionales, tránsito IA sobre el grafo vial real y peatones cercanos.
5. **GPS y mapa interactivo preciso:** Minimapa en HUD con calles reales, nombres y rumbo, más mapa desplegable (`M`) con buscador de calles/POIs, viaje rápido opcional a hitos y superposición opcional de teselas cartográficas OSM cuando haya conexión a internet.
6. **Despliegue directo y fluido:** Mantener **30–60 FPS en una GT 640 (2 GB)** y publicar `web/` automáticamente en GitHub Pages sin pasos frágiles de compilación en la nube.

### No-Objetivos (Non-Goals)
- **No modificar ni romper el proyecto Unity 6 existente:** No se alteran scripts C#, escenas, `Packages/` ni `ProjectSettings/` de Unity.
- **No multijugador en red** ni backend con base de datos.
- **No sistema de combate/armas ni misiones narrativas largas** en esta entrega (el foco es sandbox de exploración, conducción realista y fidelidad urbana/3D).
- **No cubrir fuera del cuadrante urbano de Calama** (como el rajo de Chuquicamata a 15 km al norte) en malla continua; la cordillera y el desierto circundante se representan como horizonte escénico 3D.

### Anti-Objetivos (Qué haría fallar el proyecto aunque funcione técnicamente)
- **Cuadras fantasmas o desierto pelado entre calles céntricas:** El centro y los barrios residenciales deben sentirse edificados como la ciudad real, nunca como líneas grises flotando sobre vacío.
- **Edificios invadiendo calles, plazas o el Río Loa:** Ningún edificio generado por relleno puede pisar calzadas ni áreas verdes.
- **Caída de FPS en hardware modesto (< 30 FPS en GT 640):** Prohibido crear miles de `THREE.Mesh` individuales o sombras dinámicas pesadas por cada edificio o farola.
- **Dependencia obligatoria de APIs externas en tiempo de juego:** El juego nunca debe quedarse en pantalla negra si Overpass API o un CDN externo falla o si se abre sin internet.

---

## 3. Restricciones Técnicas y Legales

1. **Hardware base de referencia:** GPU **NVIDIA GeForce GT 640 (2 GB VRAM)**, WebGL 2, resolución objetivo 720p/1080p con selector de calidad (`Baja / Media / Alta`, iniciando en `Media` optimizada sin shadow maps costosos y `pixelRatio` acotado a `<= 1.5`).
2. **Presupuesto de renderizado por cuadro:** Máximo **~120 draw calls visibles** mediante combinación de mallas por sectores (`400 × 400 m`) e `InstancedMesh` para vegetación, semáforos, farolas, señales y autos de tráfico.
3. **Aislamiento respecto a Unity:** Todo el juego web vive en `web/`. Para que Unity no intente importar miles de archivos JS/JSON ni genere archivos `.meta` innecesarios, `web/` queda fuera de `Assets/` (en la raíz del repositorio).
4. **Licencias limpias:**
   - Datos geográficos atribuidos visiblemente en créditos/HUD: **© OpenStreetMap contributors (ODbL)**.
   - Las fotografías de `Referencias/fotos/` (Wikimedia Commons CC BY / CC BY-SA) se emplean únicamente como guía geométrica y cromática para modelado 3D y texturas procedurales propias en Canvas, sin incrustar fotos con marcas registradas ni texturas derivadas privativas.

---

## 4. Enfoques Evaluados y Elección

| Enfoque | Resumen | Ventajas | Compromisos | Estado |
|---------|---------|----------|-------------|--------|
| **1. OSM precalculado + Three.js ES Modules puro en `web/`** | Script Python offline procesa `calama_centro.osm` -> JSON compacto con grafo vial, multipolígonos e infill de cuadras; `web/` sirve HTML + ES Modules + Three.js local en `web/vendor/`. | Cero paso de build para jugar/desarrollar, funciona offline, despliegue directo a GitHub Pages, máximo FPS en GT 640 al precalcular geometría pesada. | Ampliar el cuadrante geográfico en el futuro requiere re-ejecutar el script Python. | **Elegido** |
| **2. OSM precalculado + Vite y TypeScript** | Mismo pipeline offline de datos, pero cliente estructurado con bundler Vite + TS. | Tipado estático en compilación y minificación automática. | Exige `npm install` y compilación previa en local y en CI. | Descartado |
| **3. Consulta de teselas / Overpass en vivo** | Descarga y triangulación de OSM en tiempo real desde el navegador. | Mundo potencialmente ilimitado sin preprocesado. | Cortes de red/cuota, cuadras vacías sin preprocesar y tirones severos de CPU/GPU en GT 640. | Descartado |

---

## 5. Diseño de Arquitectura y Componentes (Lo Decidido)

### 5.1 Estructura de carpetas en el repositorio

```text
calama-city/
├── Assets/ ... ProjectSettings/     # Proyecto Unity 6 (INTACTO)
├── Tools/
│   └── generar_datos_web.py         # Preprocesador OSM XML -> JSON optimizado para Web
├── web/                             # Raíz publicada en GitHub Pages
│   ├── index.html                   # Entrada principal, HUD, minimapa y pantalla de mapa
│   ├── styles.css                   # Estilos del HUD, velocímetro, mapa interactivo y menú
│   ├── vendor/                      # Three.js r170+ local (three.module.min.js + addons GLTFLoader)
│   ├── assets/
│   │   └── models/
│   │       └── catedral_calama.glb  # Modelo GLB de la Catedral con ejes Y-up validados
│   ├── data/
│   │   └── calama_map.json          # Mapa real procesado (calles, edificios, infill, hitos, grafo, POIs)
│   └── src/
│       ├── main.js                  # Arranque, bucle principal, gestión de calidad e iluminación
│       ├── world/
│       │   ├── WorldBuilder.js      # Construcción por sectores (chunks 400x400m), suelo, río, rieles, cerros
│       │   ├── RoadNetworkMesh.js   # Mallas de calzadas, intersecciones, veredas, pasos de cebra y Paseo Ramírez
│       │   ├── BuildingMesh.js      # Extrusión con techos, zócalos comerciales, vertex AO y atlas de fachadas
│       │   ├── Landmarks3D.js       # Modelos 3D detallados de hitos reales de Calama
│       │   ├── StreetProps.js       # InstancedMesh: 209 semáforos reales, farolas, pimientos, palmeras y bancas
│       │   └── ProceduralTextures.js# Generador Canvas 2D de texturas (fachadas, asfalto, adoquín, vidrio, cobre)
│       ├── entities/
│       │   ├── PlayerController.js  # Personaje 3D articulado, movimiento, salto, entrada/salida de autos
│       │   ├── VehicleController.js # Física vehicular estable + modelos 3D (pickup minera, colectivo, sedán)
│       │   └── TrafficAndPeds.js    # Tránsito IA sobre grafo vial real (oneway + semáforos) y peatones
│       ├── physics/
│       │   └── SpatialGrid.js       # Colisión 2.5D rápida círculo/caja vs polígonos de edificios e hitos
│       └── ui/
│           ├── HUD.js               # Velocímetro, nombre de calle actual, hora/clima, controles y FPS opcional
│           └── MapGPS.js            # Minimapa rotativo + Mapa completo (M) con buscador, POIs y viaje rápido
├── tests/
│   └── web/                         # Pruebas automatizadas (Node test runner + verificación Playwright)
└── .github/
    └── workflows/
        └── pages.yml                # Publicación estática directa de `web/` en GitHub Pages
```

### 5.2 Pipeline de Precisión Cartográfica (`Tools/generar_datos_web.py`)

El script leerá directamente `Assets/Data/OSM/calama_centro.osm` (XML completo de 9,5 MB) para rescatar elementos que el parser previo omitía:

1. **Proyección métrica exacta:** Origen `(0, 0)` en Plaza 23 de Marzo (`-22.4624, -68.9272`), eje `+X` hacia el Este y eje `-Z` hacia el Norte en convención Three.js mano derecha (`x = +(lon - lon0) * M_LON`, `z = -(lat - lat0) * M_LAT`), garantizando que **el Norte geográfico sea `-Z` y el Este sea `+X` sin espejado** (en un mapa visto desde arriba, el Este queda a la derecha y el Norte arriba).
2. **Resolución de relaciones `multipolygon`:** Ensambla anillos `outer` e `inner` de las 11 relaciones urbanas (incluyendo el **Estadio Zorros del Desierto** `way 1057773844` / `relation 7375602`, Mall Plaza y edificios con patio interior).
3. **Red vial enriquecida y grafo de navegación:**
   - Conserva nombre real (`name`), categoría (`highway`), ancho real o inferido por categoría/carriles (`lanes`), sentido (`oneway`), superficie (`surface`, destacando `paving_stones` / `pedestrian` en Paseo Eleuterio Ramírez).
   - Detecta nodos compartidos entre vías para generar **polígonos de intersección limpios** y el **grafo dirigido de tránsito** (nodos + aristas conectadas).
   - Exporta las coordenadas exactas de los **209 semáforos (`highway=traffic_signals`)** y los **651 pasos de cebra (`highway=crossing`)** orientados según el vector de la calle donde se ubican.
4. **Relleno inteligente de cuadras vacías (Urban Block Infill):**
   - Rasteriza/indexa espacialmente una máscara de ocupación a resolución de `1.5 m` (o grilla geométrica por polígonos de manzana cerrados entre calles) marcando zonas prohibidas: calzadas + margen de vereda, los 1.179 edificios OSM reales, parques, plazas, canchas, cementerio, cauce del Río Loa y faja ferroviaria.
   - A lo largo de los tramos de calle urbana (`residential`, `tertiary`, `secondary`, `primary`, `living_street`, `pedestrian`) dentro del radio urbano habitado, coloca parcelas contiguas con retranqueo de vereda (`2.5–3.5 m`), frentes de `8–14 m` y fondos de `12–20 m` únicamente cuando el lote completo está libre en la máscara de ocupación y no intersecta ningún polígono existente.
   - Asigna tipología según la calle:
     - **Ejes comerciales céntricos** (Ramírez, Latorre, Vivar, Sotomayor, Vargas, Granaderos, Balmaceda, Mackenna): 2 a 5 pisos con zócalo comercial/galería.
     - **Calles residenciales calameñas:** casas continuas o pareadas de 1 a 2 pisos en tonos arena, terracota suave, crema, damasco y blanco caliche, con techos planos o de baja pendiente propios del desierto nortino.
   - Marca cada edificio con bandera `real: 1` (OSM) o `real: 0` (infill) para que el mapa GPS pueda distinguir huella catastral exacta de relleno contextual si el usuario lo desea.

### 5.3 Diseños 3D Detallados en Three.js

1. **Hitos emblemáticos a medida (`Landmarks3D.js`):**
   - **Catedral San Juan Bautista:** Posicionada en su huella real frente a Plaza 23 de Marzo y orientada hacia la plaza. Construye su arquitectura neogótica fiel a las fotos de referencia (fachada crema con pilastras y cornisas rosado-terracota, portal ojival profundo, rosetón vitral circular azul, ventanas ojivales geminadas, torre campanario central con celosías, aguja piramidal oscura con cruz y dos torretas laterales con agujas), además de soportar la carga de `web/assets/models/catedral_calama.glb`.
   - **Plaza 23 de Marzo:** Pavimento damero/radial claro con cintas oscuras, odeón/quiosco y monumento central, hileras de pimientos frondosos con base de tronco pintada de blanco (rasgo clásico nortino visible en las fotos), bancas de madera/fierro y farolas ornamentales amarillas/negras.
   - **Ilustre Municipalidad de Calama:** Edificio esquina crema neoclásico con zócalo azul cerámico, balcón central sobre ménsulas, frontón escalonado superior y tres mástiles con las banderas de Chile, Calama y Wiphala.
   - **Paseo Eleuterio Ramírez + Monumento al Minero:** Calzada peatonal adoquinada, pérgolas/jardineras, locales comerciales en primer piso y escultura color bronce/cobre del minero sobre pedestal de piedra.
   - **Edificio Corporativo Codelco Norte:** Bloques laterales de hormigón visto con ranuras horizontales, fachada central de muro cortina azul reflectante y la característica gran pérgola reticular color cobre/madera sobre columnas en su acceso.
   - **Estadio Zorros del Desierto:** Polígono real del estadio con revestimiento exterior facetado color cobre brillante (identidad minera/Cobreloa), graderías naranjas/rojas visibles hacia el interior, cancha verde reglamentaria con líneas blancas y 4 torres de iluminación en las esquinas.
   - **Mall Plaza Calama y Terminal de Buses:** Volúmenes de gran escala con pórticos de acceso acristalados, tótems y andenes de buses.
2. **Edificios urbanos con relieve visual y bajo coste GPU (`BuildingMesh.js` + `ProceduralTextures.js`):**
   - Atlas de texturas procedurales generadas en Canvas (512×1024 px, mipmaps limpios) con variaciones de ventanas, marcos, cortinas metálicas comerciales, letreros genéricos chilenos (*Almacén, Farmacia, Ferretería, Bazar, Residencial*), cornisas y unidades de aire acondicionado en azotea.
   - Oclusión ambiental por vértice (oscurecimiento sutil al pie del muro) para dar peso visual sin requerir SSAO ni sombras en tiempo real.
3. **Vehículos y personaje (`VehicleController.js`, `PlayerController.js`):**
   - **Vehículo inicial (Pickup Minera Doble Cabina):** Carrocería roja/blanca con barra antivuelco, pick-up trasero, cabina con vidrios polarizados suaves, parrilla frontal, focos delanteros blancos y luces de freno rojas que se encienden al frenar, más 4 ruedas 3D independientes con giro y dirección.
   - **Flota adicional conducible en la ciudad:** Colectivos urbanos negros con letrero amarillo en el techo, sedanes, SUVs y buses interurbanos cerca del Terminal. Cualquier vehículo estacionado o detenido puede abordarse con `E`.
   - **Personaje:** Modelo 3D articulado (cabeza, cabello/gorra, torso con chaqueta, brazos y piernas con pivotes en hombros y caderas) con ciclo suave de reposo, caminata, trote y salto.

### 5.4 Iluminación Desértica, HUD y Mapa GPS (`HUD.js`, `MapGPS.js`)

- **Atmósfera del Desierto de Atacama:** Cielo gradiente limpio de altiplano (`2.260 m s.n.m.`), cordillera de los Andes y cerros de Chuquicamata/Montecristo en el horizonte lejano, Río Loa con superficie reflectante/animada suave y vegetación ribereña en Parque El Loa, más selector rápido de iluminación (**Día Soleado**, **Atardecer Calameño**, **Noche Urbana** con emisión en ventanas, farolas y semáforos).
- **HUD en vivo:**
  - Indicador superior/inferior limpio con **nombre real de la calle actual o barrio** calculado en tiempo real según el tramo vial más cercano, velocidad en `KM/H` al conducir, selector de hora/calidad y guía compacta de controles.
  - **Minimapa circular/cuadrado** en esquina con calles reales coloreadas por jerarquía, parques, Río Loa, hitos marcados y flecha del jugador.
  - **Mapa interactivo completo (`M` o clic en minimapa):** Zoom y paneo, buscador instantáneo de calles y POIs reales (*"Ramírez"*, *"Catedral"*, *"Codelco"*, *"Estadio"*, *"Parque El Loa"*), marcado de ruta visual hacia un destino en el minimapa, botón de **Viaje Rápido** a cualquier hito emblemático, y conmutador opcional de **capa cartográfica OSM online** bajo el trazado vectorial.

---

## 6. Decisiones Delegadas al Implementador (Builder Calls)

Las siguientes decisiones de detalle técnico quedan resueltas por diseño salvo que el propietario prefiera cambiarlas:

1. **Tamaño de sector (chunk) de renderizado:** `400 × 400 m` para mallas estáticas de edificios y calles, lo que divide el mapa de ~6,6 × 5,5 km en una grilla manejable con frustum culling nativo de Three.js.
2. **Versión de Three.js en `web/vendor/`:** Copia local autocontenida de `three.module.min.js` y `GLTFLoader` (rama moderna r160–r175) dentro de `web/vendor/` para cero dependencia de internet al abrir el juego.
3. **Radio de simulación activa de tráfico y peatones:** Spawning y reciclaje dinámico en un anillo de `180 m` alrededor del jugador/cámara (`~18–25` vehículos IA y `~25–35` peatones simultáneos), manteniendo el consumo de CPU por debajo de `2 ms/frame`.
4. **Controles unificados con la versión Unity:** Se mantienen exactamente las mismas teclas base documentadas en `README.md` (`WASD` mover/conducir, `Shift` correr, `Espacio` saltar / freno de mano, `E` entrar/salir de vehículo, `Esc` pausa/menú) añadiendo `M` para abrir el mapa GPS completo, `C` para alternar distancia de cámara y `T` para cambiar hora del día (día / atardecer / noche).
5. **Publicación en GitHub Pages:** Workflow `.github/workflows/pages.yml` usando `actions/upload-pages-artifact` sobre `./web` y `actions/deploy-pages`, complementado con `.nojekyll` dentro de `web/` y enlace destacado en el `README.md` principal sin borrar las instrucciones de Unity.
