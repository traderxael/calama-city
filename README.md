# Calama City

Juego 3D sandbox en el centro de Calama, Chile. Recorre la Plaza 23 de Marzo, las calles del centro y conduce un coche.

Motor Unity: **Unity 6000.6.5f1** — **Built-in Render Pipeline** (sin URP).
Escena jugable Unity: `Assets/Scenes/CalamaCity.unity`.
Versión Web 3D (**Three.js + OpenStreetMap escala 1:1**): carpeta [`web/`](web/index.html) (lista para GitHub Pages).

## Versión Web 3D en Three.js (`web/`)

Recreación jugable en navegador a escala real (`1 unidad = 1 metro`, origen en Plaza 23 de Marzo) construida a partir de datos reales de **OpenStreetMap**:
- **3.005 tramos de calles reales** con nombres, sentidos `oneway`, **209 semáforos reales** y **651 pasos de cebra**.
- **6.473 edificaciones** (huellas reales OSM + relleno urbano de cuadras vacías respetando veredas, plazas, parques, vía férrea FCAB y Río Loa).
- **Hitos 3D detallados de Calama:** Catedral San Juan Bautista, Plaza 23 de Marzo, Ilustre Municipalidad, Paseo Eleuterio Ramírez y Monumento al Minero, Edificio Corporativo Codelco Norte, Estadio Zorros del Desierto, Mall Plaza, Terminal de Buses y Parque El Loa.
- **Conducción, tráfico IA y GPS interactivo (`M`):** camioneta pickup minera 4x4, colectivos urbanos y sedanes, ciclo solar del Atacama (`T`: Día, Atardecer Calameño, Noche) y buscador de calles/POIs con ruteo GPS A*.

```bash
# Ejecutar localmente sin compilación
python -m http.server 8080 --directory web
# Abrir http://localhost:8080

# Regenerar dataset cartográfico desde OSM y correr suites de pruebas Web + Datos
python Tools/generar_datos_web.py
python -m unittest discover -s tests -p "test_*.py" -v
node --test tests/web/*.test.mjs
```

El workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publica `./web` directamente en **GitHub Pages** (en Settings → Pages elegir *Source: GitHub Actions*).

## Cómo abrir (Unity 6)

1. Unity Hub → Add project → esta carpeta, con Unity **6000.6.5f1**.
2. Abrir `Assets/Scenes/CalamaCity.unity` y darle Play.
3. Si la escena falta o quieres regenerarla: menú **Calama City → Reconstruir escena jugable**.

La escena solo contiene un GameObject con `ArranqueCalamaCity`. Al iniciar, ese componente construye en runtime la ciudad procedural, el jugador, el coche, la cámara y el HUD. La ciudad usa una semilla fija, así que siempre se ve igual.

## Controles

| Acción | Tecla |
|--------|-------|
| Mover personaje | `WASD` |
| Correr | `Shift` + `WASD` |
| Saltar | `ESPACIO` |
| Entrar/salir del coche | `E` (cerca del coche) |
| Conducir | `W` / `S` / `A` / `D` |
| Freno de mano | `ESPACIO` (en el coche) |
| Pausa | `ESC` |

## Verificación

```bash
# Ajusta UNITY a tu instalación de Unity 6000.6.5f1
UNITY="C:/Program Files/Unity/Hub/Editor/6000.6.5f1/Editor/Unity.exe"

# Tests EditMode
"$UNITY" -batchmode -projectPath . -runTests -testPlatform EditMode \
  -testResults TestResults/editmode.xml

# Tests PlayMode (física del coche)
"$UNITY" -batchmode -projectPath . -runTests -testPlatform PlayMode \
  -testResults TestResults/playmode.xml

# Build de Windows
"$UNITY" -batchmode -projectPath . \
  -buildWindows64Player Builds/Windows/CalamaCity.exe -quit
```

## Estado actual (Fase 6)

- Compilación limpia y proyecto en Built-in RP (los materiales se crean con el shader Standard).
- Escena jugable generada por código, con colisiones de suelo, calle y edificios.
- Personaje con caminar/correr/saltar y entrada/salida de coche.
- Conducción con **WheelCollider**: suspensión, dirección sensible a la velocidad, torque trasero, freno de mano y barras estabilizadoras.
- HUD: velocímetro, vida, minimapa, ayuda de controles y pausa.
- Tests EditMode y PlayMode (física del coche) y build de Windows reproducibles por CLI.

Pendiente para próximas fases: peatones/tráfico con NavMesh, audio y guardado de partida.

## Documentación

- [`DESIGN.md`](DESIGN.md) — diseño del juego
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — fases de desarrollo
- [`PLAN.md`](PLAN.md) — plan técnico post-Fase 5
- [`docs/RESEARCH-LOG.md`](docs/RESEARCH-LOG.md) — evidencia y decisiones técnicas

## Licencia

MIT
