# Build Script — Calama City (Windows)

Script para automatizar el build de Windows desde línea de comandos.

## Uso

Desde PowerShell, dentro de la carpeta del proyecto:

```powershell
# Ejecutar Unity en modo batch para hacer el build
"C:\Program Files\Unity\Hub\Editor\6000.6.5f1\Editor\Unity.exe" `
  -batchmode `
  -projectPath "C:/Users/USUARIO/Calama City" `
  -executeMethod CalamaCity.BuildScript.BuildWindows `
  -quit
```

## Script de Unity (opcional)

Para usar el executeMethod, crear este archivo en `Assets/Editor/BuildScript.cs`:

```csharp
using UnityEditor;
using UnityEditor.Build.Reporting;

namespace CalamaCity.BuildScript
{
    public static class BuildWindows
    {
        public static void PerformBuild()
        {
            string[] scenes = { "Assets/Scenes/MainMenu.unity" };
            string buildPath = "Builds/CalamaCity";

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = buildPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None
            };

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Success)
            {
                UnityEngine.Debug.Log($"Build exitoso: {buildPath} ({summary.totalSize} bytes)");
            }
            else
            {
                UnityEngine.Debug.LogError($"Build falló: {summary.totalErrors} errores");
            }
        }
    }
}
```
