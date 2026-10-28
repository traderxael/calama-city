# Calama City — Diseño del juego

Juego 3D de mundo abierto en primera persona / tercera persona, ambientado en el centro de Calama, Chile. Mecánica principal: conducción libre tipo GTA (sandbox).

Motor: **Unity 6000.6.5f1** + **URP** (espacio de color Linear)
Input: **Input System 1.20.0**
UI: **IMGUI / Canvas** (simple, legible)
Arte: **Paramétrico y generado por código** (sin assets de terceros con derechos)

---

## ¿Qué se incluye en la v1.0?

| Sistema | Qué hace |
|---------|----------|
| Personaje | Camina, corre, salta, entra/sale de vehículos |
| Vehículo | Conducción física básica (acelerar, frenar, girar, reversa) |
| Cámara | Tercera persona que sigue al jugador o al coche |
| Ciudad | Plaza 23 de Marzo + calles del centro de Calama |
| UI mínima | Velocímetro, barra de vida, minimapa simple |

---

## Cómo abrir y jugar

1. Unity Hub → Add project → esta carpeta, con Unity **6000.6.5f1**.
2. Abrir `Assets/Scenes/MainMenu.unity` y darle Play.
3. O abrir `Assets/Scenes/CentroCalama.unity` para ir directo al juego.

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
│   ├── Scenes/          Escenas del juego
│   ├── Scripts/         Lógica en C#
│   ├── Prefabs/         Objetos reutilizables
│   ├── Materials/       Materiales URP
│   └── Audio/           Sonidos y música
├── docs/
│   ├── DESIGN.md        Este archivo
│   └── ROADMAP.md       Fases de desarrollo
├── README.md            Cómo abrir, controles, build
└── .gitignore           Estándar de Unity
```

---

## Pilares de diseño (mismo estilo que SLUG OUT)

1. **Todo avisa.** Cualquier cosa que te pueda dañar o bloquear se anuncia antes con una señal visual.
2. **Jugabilidad legible.** Nada de azar oculto; todo se puede leer y anticipar.
3. **Código limpio.** Scripts pequeños, bien nombrados, documentados en español.

---

## Licencia

MIT — ver [LICENSE](LICENSE) para detalles.
