# 🗺️ Roadmap — Calama City

Documento para seguir mejorando **Calama City** sin volver a descubrir todo de cero.

---

## Cómo se trabaja

**TDD donde aporta.** Los sistemas con lógica pura (conversión de velocidad, minimapa, generadores) tienen tests EditMode que corren por CLI antes de cada push.

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
| 5 | Build de Windows (exe) | ✅ Documentada y reproducible |
| 6 | MVP jugable: compilación, escena, HUD, conducción y tests | ✅ Completada |

---

## v1.0 (Fase 6) — hecho

- [x] Compilación limpia en Unity 6000.6.5f1 (Built-in RP)
- [x] Escena jugable generada por código y registrada en Build Settings
- [x] Personaje: caminar/correr/saltar
- [x] Cámara en tercera persona que cambia de objetivo
- [x] Coche con física básica, freno de mano y agarre lateral
- [x] Entrar y salir del coche (tecla `E`, un único responsable)
- [x] Escenario: Plaza 23 de Marzo + calle + manzanas procedurales
- [x] UI: velocímetro, barra de vida, minimapa, ayuda y pausa
- [x] Tests EditMode y build de Windows por CLI

---

## Próximas fases (v1.1+)

- [ ] Conducción con `WheelCollider` (suspensión, dirección y frenos reales)
- [ ] Peatones y tráfico con `com.unity.ai.navigation` (NavMeshSurface + NavMeshAgent)
- [ ] Audio: motor ligado a RPM + ambiente urbano
- [ ] Guardado de partida (PlayerPrefs/JSON)
- [ ] Variedad de edificios y mobiliario urbano (bancos, árboles, semáforos)
- [ ] Menú principal y ajustes (volumen, sensibilidad, calidad)
