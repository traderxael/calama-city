# Calama City — Fase 2: Conducción y entrada/salida de vehículo

## Qué se agregó

| Script | Qué hace |
|--------|----------|
| `PersonajeController.cs` | Ahora puede entrar/salir de vehículos. Cuando está dentro, se sincroniza con el coche y el CharacterController se desactiva. |
| `VehiculoController.cs` | Conducción con 4 `WheelCollider`: suspensión, dirección, torque trasero y freno de mano. Incluye `puntoSalida` para posicionar al personaje al salir. |
| `GestorVehiculo.cs` | Coordina entrar/salir (única tecla `E`) y re-apunta la cámara al coche o al jugador. |
| `GeneradorCocheSimple.cs` | Genera un coche paramétrico (cubos + cilindros) para pruebas sin necesidad de modelos 3D externos. |
| `GameManager.cs` | Gestor principal del juego, singleton, maneja pausa con `ESC`. |

## Cómo probar

1. Abrir Unity Hub → Add project → `<ruta-del-proyecto>` con Unity **6000.6.5f1**.
2. Abrir `Assets/Scenes/CalamaCity.unity` y darle Play. La escena se construye por código desde Fase 6; si falta, usar el menú **Calama City → Reconstruir escena jugable**.
3. Usa `WASD` para caminar, `E` para entrar al coche, `WASD` para conducir, `E` para salir.

> Nota histórica: hasta la Fase 5 este setup era manual (crear cámara, jugador y coche a mano). Desde la Fase 6 todo lo arma `ArranqueCalamaCity`.

## Controles

| Acción | Tecla |
|--------|-------|
| Caminar | `WASD` |
| Correr | `Shift` + `WASD` |
| Saltar | `ESPACIO` |
| Entrar/salir del coche | `E` |
| Conducir (acelerar/frenar/girar) | `W` / `S` / `A` / `D` |
| Pausa | `ESC` |

## Pendiente para Fase 3

- Escenario 3D: Plaza 23 de Marzo + calles del centro de Calama
- Edificios simples generados por código
- Carreteras y aceras
