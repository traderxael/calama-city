using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using CalamaCity.Core;

/// <summary>
/// Genera la escena jugable (un único GameObject con ArranqueCalamaCity),
/// crea el material base Built-in y registra la escena en Build Settings.
/// </summary>
public static class ConstructorEscenaCalamaCity
{
    private const string RutaEscena = "Assets/Scenes/CalamaCity.unity";
    private const string RutaMaterial = "Assets/Resources/Materiales/Base.mat";

    [MenuItem("Calama City/Reconstruir escena jugable")]
    public static void ConstruirDesdeMenu()
    {
        Construir();
    }

    public static void ConstruirDesdeCLI()
    {
        Construir();
    }

    private static void Construir()
    {
        AsegurarCarpetas();
        AsegurarMaterialBase();

        var escena = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        GameObject arranque = new GameObject("ArranqueCalamaCity");
        arranque.AddComponent<ArranqueCalamaCity>();

        bool guardada = EditorSceneManager.SaveScene(escena, RutaEscena);
        RegistrarEnBuildSettings();
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();

        bool escenaOK = guardada && File.Exists(RutaEscena);
        string yaml = File.ReadAllText("ProjectSettings/EditorBuildSettings.asset");
        bool buildOK = yaml.Contains("path: " + RutaEscena);

        if (escenaOK)
            Debug.Log("ESCENA_OK " + RutaEscena);
        else
            Debug.LogError("ESCENA_FALLO: no se pudo guardar " + RutaEscena);

        if (buildOK)
            Debug.Log("BUILD_SETTINGS_OK " + RutaEscena);
        else
            Debug.LogError("BUILD_SETTINGS_FALLO: la escena no quedó registrada en EditorBuildSettings.asset");

        if (!escenaOK || !buildOK)
            EditorApplication.Exit(1);
    }

    private static void AsegurarCarpetas()
    {
        if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            AssetDatabase.CreateFolder("Assets", "Scenes");

        if (!AssetDatabase.IsValidFolder("Assets/Resources"))
            AssetDatabase.CreateFolder("Assets", "Resources");

        if (!AssetDatabase.IsValidFolder("Assets/Resources/Materiales"))
            AssetDatabase.CreateFolder("Assets/Resources", "Materiales");
    }

    private static void AsegurarMaterialBase()
    {
        if (AssetDatabase.LoadAssetAtPath<Material>(RutaMaterial) != null)
            return;

        Shader standard = Shader.Find("Standard");
        if (standard == null)
        {
            Debug.LogError("MATERIAL_FALLO: no se encontró el shader Standard (Built-in RP).");
            return;
        }

        Material material = new Material(standard) { name = "Base" };
        AssetDatabase.CreateAsset(material, RutaMaterial);
        AssetDatabase.SaveAssets();
        Debug.Log("MATERIAL_OK " + RutaMaterial);
    }

    private static void RegistrarEnBuildSettings()
    {
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(RutaEscena, true) };
        AssetDatabase.SaveAssets();

        Object settings = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/EditorBuildSettings.asset")[0];
        SerializedObject serialized = new SerializedObject(settings);
        serialized.ApplyModifiedProperties();
        AssetDatabase.SaveAssets();
    }
}
