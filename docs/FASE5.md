# Calama City — Fase 5: Build de Windows

## 🎯 Objetivo

Generar el ejecutable (.exe) de Calama City para Windows, listo para distribuir y jugar.

---

## 📋 Requisitos previos

| Requisito | Versión |
|-----------|---------|
| Unity Hub | Cualquier versión reciente |
| Unity Editor | **6000.6.5f1** (mismo que SLUG OUT) |
| Módulos de Unity | Windows Build Support (IL2CPP) |
| Espacio en disco | ~2 GB libre para el build |
| Sistema | Windows 10 o 11 (64-bit) |

---

## 🛠️ Pasos para hacer el build

### Paso 1: Abrir el proyecto en Unity

1. Abrir **Unity Hub**
2. Clic en **Add**
3. Seleccionar la carpeta: `C:/Users/USUARIO/Calama City`
4. Seleccionar la versión **6000.6.5f1**
5. Clic en **Add Project**

### Paso 2: Configurar Build Settings

1. Abrir la escena principal: `Assets/Scenes/CalamaCity.unity`
2. Ir a **File → Build Settings**
3. En la plataforma, seleccionar **PC, Mac & Linux Standalone**
4. Clic en **Switch Platform** (esperar a que termine la importación)
5. Configurar:
   - **Target Platform:** Windows
   - **Architecture:** x86_64
   - **Scripting Backend:** Mono (por defecto) o IL2CPP si el módulo está instalado
   - **Compression:** LZ4 (equilibrio entre tamaño y velocidad)

### Paso 3: Configurar Player Settings

1. En Build Settings, clic en **Player Settings**
2. Configurar lo mínimo:
   - **Company Name:** traderxael
   - **Product Name:** Calama City
   - **Default Icon:** (opcional, agregar un icono .ico de 256x256)
   - **Resolution:** 1280x720 (o dejar por defecto)
   - **Run In Background:** desactivado

### Paso 4: Ejecutar el build

1. En Build Settings, clic en **Build**
2. Seleccionar la carpeta de destino: `Builds/CalamaCity/`
3. Clic en **Select Folder**
4. Esperar a que termine (puede tomar 2-5 minutos la primera vez)

### Paso 5: Verificar el build

1. Ir a `C:/Users/USUARIO/Calama City/Builds/Windows/`
2. Deberías ver:
   - `CalamaCity.exe` (el ejecutable principal)
   - `CalamaCity_Data/` (carpeta con assets y dependencias)
   - `UnityCrashHandler64.exe` (manejador de errores)
3. Doble clic en `CalamaCity.exe` para probar el juego

---

## 📜 Build automático por CLI

```bash
"C:/Program Files/Unity/Hub/Editor/6000.6.5f1/Editor/Unity.exe" -batchmode \
  -projectPath "C:/Users/USUARIO/Calama City" \
  -buildWindows64Player "C:/Users/USUARIO/Calama City/Builds/Windows/CalamaCity.exe" -quit
```

La escena jugable se crea con:

```bash
"C:/Program Files/Unity/Hub/Editor/6000.6.5f1/Editor/Unity.exe" -batchmode -nographics \
  -projectPath "C:/Users/USUARIO/Calama City" \
  -executeMethod ConstructorEscenaCalamaCity.ConstruirDesdeCLI -quit
```

---

## 📁 Estructura esperada después del build

```
Calama City/
├── Builds/
│   └── CalamaCity/
│       ├── Calama City.exe
│       ├── Calama City_Data/
│       │   ├── Mono/
│       │   ├── Plugins/
│       │   ├── Resources/
│       │   ├── Scenes/
│       │   └── ...
│       └── UnityCrashHandler64.exe
├── Assets/
├── ProjectSettings/
└── docs/
```

---

## ✅ Checklist antes de publicar

- [ ] El juego abre sin errores
- [ ] Se puede caminar (WASD)
- [ ] Se puede entrar/salir del coche (E)
- [ ] Se puede conducir
- [ ] El velocímetro muestra velocidad
- [ ] La barra de vida funciona
- [ ] El minimapa se ve
- [ ] La pausa (ESC) funciona
- [ ] No hay errores de consola en rojo

---

## 🐛 Problemas comunes

| Problema | Solución |
|----------|----------|
| El build falla con "IL2CPP" | Instalar módulo Windows Build Support (IL2CPP) en Unity Hub |
| El exe no abre | Verificar que `Calama City_Data/` esté al lado del .exe |
| El minimapa no se ve | Verificar que el Canvas esté en Screen Space - Overlay |
| El coche no acelera | Verificar que el VehiculoController tenga Rigidbody y Collider |

---

## 🚀 Listo para jugar

Una vez completado el build, tienes un ejecutable de Windows de **Calama City** que puedes:
- Ejecutar en tu PC
- Compartir con amigos
- Subir a itch.io o cualquier plataforma de juegos

**Repo:** https://github.com/traderxael/calama-city
