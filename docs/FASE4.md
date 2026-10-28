# Calama City — Fase 4: UI (velocímetro, vida, minimapa)

## Qué se agregó

| Script | Qué hace |
|--------|----------|
| `HUDVehiculo.cs` | Muestra velocidad actual (KM/H) y barra de vida del jugador. Incluye métodos `RecibirDaño()` y `Curar()`. |
| `VehiculoVelocidad.cs` | Extensión de `VehiculoController`: expone `ObtenerVelocidadKmh()` para el HUD. |
| `Minimapa.cs` | Minimapa simple que sigue al jugador, rota el icono según dirección y limita al radio de vista. |

## Cómo configurar en Unity

### 1. Crear el Canvas
1. En la escena, hacer clic derecho → UI → Canvas
2. Configurar Canvas:
   - Render Mode: Screen Space - Overlay
   - UI Scale Mode: Scale With Screen Size

### 2. Velocímetro
1. Crear UI → Text (llamarlo `TextoVelocidad`)
2. Posicionar en esquina inferior izquierda
3. Crear UI → Image (llamarlo `BarraVida`), tipo Fill
4. Crear un GameObject vacío llamado `HUD`
5. Agregar componente `HUDVehiculo`
6. Arrastrar `TextoVelocidad` al campo `Texto Velocidad`
7. Arrastrar `BarraVida` al campo `Barra Vida`
8. Arrastrar el `VehiculoController` del coche al campo `Vehículo`

### 3. Minimapa
1. Crear UI → Image (llamarlo `FondoMinimapa`), color gris oscuro
2. Crear UI → Image (llamarlo `IconoJugador`), color verde o azul
3. Crear un GameObject vacío llamado `MinimapaGO`
4. Agregar componente `Minimapa`
5. Arrastrar `FondoMinimapa` al campo `Fondo Minimapa`
6. Arrastrar `IconoJugador` al campo `Icono Jugador`
7. Arrastrar el `Jugador` al campo `Jugador`

## Controles (actualizados)

| Acción | Tecla |
|--------|-------|
| Caminar | `WASD` |
| Correr | `Shift` + `WASD` |
| Saltar | `ESPACIO` |
| Entrar/salir del coche | `E` |
| Conducir | `W` / `S` / `A` / `D` |
| Pausa | `ESC` |

## Pendiente para Fase 5

- Build de Windows (exe)
- Pruebas y ajuste de balance
- Vehículos estacionados y tráfico simple
