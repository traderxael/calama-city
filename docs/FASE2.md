# Calama City — Fase 2: Conducción y entrada/salida de vehículo

## Qué se agregó

| Script | Qué hace |
|--------|----------|
| `PersonajeController.cs` | Ahora puede entrar/salir de vehículos. Cuando está dentro, se sincroniza con el coche y el CharacterController se desactiva. |
| `VehiculoController.cs` | Conducción física completa. Activa/desactiva cámaras según quién controle. Incluye `puntoSalida` para posicionar al personaje al salir. |
| `GestorVehiculo.cs` | Coordina entrar/salir entre personaje y vehículo. Genciona activación/desactivación de cámaras. |
| `GeneradorCocheSimple.cs` | Genera un coche paramétrico (cubos + cilindros) para pruebas sin necesidad de modelos 3D externos. |
| `GameManager.cs` | Gestor principal del juego, singleton, maneja pausa con `ESC`. |

## Cómo probar

1. Abrir Unity Hub → Add project → `C:/Users/USUARIO/Calama City` con Unity **6000.6.5f1**.
2. Crear una escena nueva (File → New Scene) o abrir `MainMenu.unity`.
3. Crear un GameObject vacío llamado `Jugador` y agregar:
   - `CharacterController`
   - `PersonajeController`
   - `GestorVehiculo`
   - `GameManager` (opcional, para singleton)
4. Crear un GameObject vacío llamado `Coche` y agregar:
   - `GeneradorCocheSimple` (para generar el coche paramétrico)
   - O asignar un modelo 3D real si tienes uno
5. Arrastrar la cámara principal al campo `Camara Personaje` del `GestorVehiculo`.
6. Crear una segunda cámara para el vehículo, asignarla al `Camara Vehiculo` del `VehiculoController`.
7. Dar Play. Usa `WASD` para caminar, `E` para entrar al coche, `WASD` para conducir, `E` para salir.

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
