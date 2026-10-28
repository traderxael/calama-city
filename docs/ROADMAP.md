# 🗺️ Roadmap — Calama City

Documento para seguir mejorando **Calama City** sin volver a descubrir todo de cero.

---

## Cómo se trabaja

**TDD estricto.** Ninguna línea de producción sin un test que falle primero por el motivo correcto.

Cada feature sigue:
1. RED — el test falla por la razón esperada
2. GREEN — el cambio mínimo para que pase
3. Regresión — todas las suites pasan
4. Push a `main`

---

## Fases de desarrollo

| Fase | Objetivo | Estado |
|------|----------|--------|
| 1 | Proyecto Unity vacío, personaje caminando, cámara básica | ✅ Completada |
| 2 | Vehículo enterable, conducción, entrar/salir del coche | ✅ Completada |
| 3 | Escenario: Plaza 23 de Marzo + calles del centro | ✅ Completada |
| 4 | UI: velocímetro, vida, minimapa | ✅ Completada |
| 5 | Build de Windows (exe) | 📋 Documentación lista |

---

## Pendientes (v1.0)

- [ ] Personaje caminar/correr/saltar con animación básica
- [ ] Cámara en tercera persona que sigue al personaje
- [ ] Coche con física básica (acelerar, frenar, girar)
- [ ] Entrar y salir del coche (tecla `E`)
- [ ] Escenario: Plaza 23 de Marzo + calles circundantes
- [ ] UI: velocímetro, barra de vida, minimapa
- [ ] Build de Windows funcionando

---

## Reglas de diseño (no negociables)

1. **Todo avisa.** Cualquier cosa que te pueda dañar o bloquear se anuncia antes con una señal visual.
2. **El jugador puede moverse libremente.** La ciudad es un sandbox; no hay misiones forzadas en v1.0.
3. **Código en español.** Variables, comentarios y nombres de scripts en español.
4. **Sin assets con derechos.** Todo lo arte es generado por código o placeholder simple.
