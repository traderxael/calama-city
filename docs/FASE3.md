# Calama City — Fase 3: Escenario 3D de Calama

## Qué se agregó

| Script | Qué hace |
|--------|----------|
| `GeneradorCalles.cs` | Genera calles principales con asfalto, aceras y líneas viales divisorias. |
| `GeneradorEdificios.cs` | Genera manzanas de edificios paramétricos con ventanas, techos y colliders. |
| `GeneradorPlaza23DeMarzo.cs` | Genera la Plaza 23 de Marzo como punto central: suelo circular, monumento central y farolas alrededor. |
| `CiudadManager.cs` | Coordinador singleton que inicializa todos los generadores del escenario. |

## Cómo probar

1. **Unity Hub** → Add project → `C:/Users/USUARIO/Calama City` con Unity **6000.6.5f1**.
2. **Crear escena nueva** (File → New Scene).
3. **Crear GameObject `Ciudad`** y agregar:
   - `CiudadManager`
   - `GeneradorCalles`
   - `GeneradorEdificios`
   - `GeneradorPlaza23DeMarzo`
4. **Crear GameObject `Jugador`** con:
   - `CharacterController`
   - `PersonajeController`
   - `GestorVehiculo`
   - `GameManager`
5. **Posicionar** la plaza en el centro (0, 0, 0) y las calles a los lados.
6. **Play** — Deberías ver la plaza, calles, edificios y poder caminar/conducir.

## Controles

| Acción | Tecla |
|--------|-------|
| Caminar | `WASD` |
| Correr | `Shift` + `WASD` |
| Saltar | `ESPACIO` |
| Entrar/salir del coche | `E` |
| Conducir | `W` / `S` / `A` / `D` |
| Pausa | `ESC` |

## Pendiente para Fase 4

- UI: velocímetro, barra de vida, minimapa
- Más detalles urbanos: bancas, señales de tránsito, farolas con luz dinámica
- Vehículos estacionados y tráfico simple
