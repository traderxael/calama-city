# Calama City — Diseño del juego

Juego 3D de mundo abierto en tercera persona, ambientado en el centro de Calama, Chile. Mecánica principal: conducción libre tipo GTA (sandbox) combinada con exploración a pie.

Motor: **Unity 6000.6.5f1** — **Built-in Render Pipeline** (espacio de color Gamma por defecto del proyecto)
Input: **Input Manager clásico** (teclado)
UI: **uGUI** generada por código (Canvas + Text/Image)
Arte: **paramétrico y generado por código** (sin assets de terceros con derechos)

---

## ¿Qué incluye la v1.0?

| Sistema | Qué hace |
|---------|----------|
| Personaje | Camina, corre, salta, entra y sale de vehículos |
| Vehículo | Conducción con `WheelCollider`: suspensión, dirección, torque trasero, freno de mano y barras estabilizadoras |
| Cámara | Tercera persona que sigue al jugador y cambia de objetivo al coche |
| Ciudad | Plaza 23 de Marzo + calle principal + manzanas de edificios procedurales |
| UI | Velocímetro, barra de vida, minimapa, ayuda de controles y pausa |

---

## Cómo abrir y jugar

1. Unity Hub → Add project → esta carpeta, con Unity **6000.6.5f1**.
2. Abrir `Assets/Scenes/CalamaCity.unity` y darle Play.
3. Si la escena no existe: menú **Calama City → Reconstruir escena jugable**.

La escena contiene únicamente `ArranqueCalamaCity`, que construye todo en runtime con una semilla fija.

| Acción | Control |
|--------|---------|
| Mover personaje | `WASD` |
| Correr | `Shift` + `WASD` |
| Saltar | `ESPACIO` |
| Entrar/salir del coche | `E` |
| Conducir (acelerar/frenar/girar) | `W` / `S` / `A` / `D` |
| Freno de mano | `ESPACIO` (en coche) |
| Pausa | `ESC` |

---

## Estructura del repositorio

```
Calama City/
├── Assets/
│   ├── Editor/          Constructor de la escena jugable
│   ├── Resources/       Material base (shader Standard)
│   ├── Scenes/          CalamaCity.unity
│   ├── Scripts/         Lógica en C# (asmdef CalamaCity)
│   └── Tests/EditMode/  Tests automatizados
├── docs/                Roadmap, fases y research log
├── Packages/            Manifest y lock de paquetes
├── ProjectSettings/     Configuración de Unity (tags, build settings, calidad)
├── README.md
└── .gitignore
```

---

## Pilares de diseño

1. **Todo avisa.** Cualquier cosa que te pueda dañar o bloquear se anuncia antes con una señal visual.
2. **Jugabilidad legible.** Nada de azar oculto; todo se puede leer y anticipar (ciudad con semilla fija).
3. **Código limpio.** Scripts pequeños, bien nombrados, documentados en español.

---

## Rendimiento

La máquina de desarrollo tiene una GPU limitada (GT 640, 2 GB), así que la v1.0 prioriza legibilidad y fluidez:

- Calidad gráfica en **Low**, sin sombras en tiempo real.
- Farolas emisivas sin luces puntuales adicionales.
- Materiales compartidos por color para favorecer el batching.
- Niebla lineal para recortar la vista sin coste de occlusion culling.

---

## Licencia

MIT — ver [LICENSE](LICENSE) para detalles.
