# Calama City

Juego 3D sandbox en el centro de Calama, Chile. Recorre la Plaza 23 de Marzo, las calles del centro y conduce un coche.

Motor: **Unity 6000.6.5f1** — **Built-in Render Pipeline** (sin URP).
Escena jugable: `Assets/Scenes/CalamaCity.unity`.

## Cómo abrir

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
"C:/Program Files/Unity/Hub/Editor/6000.6.5f1/Editor/Unity.exe" -batchmode \
  -projectPath "C:/Users/USUARIO/Calama City" -runTests -testPlatform PlayMode \
  -testResults "C:/Users/USUARIO/Calama City/TestResults/playmode.xml"

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
