using System.Collections.Generic;
using UnityEngine;

namespace CalamaCity.Core
{
    /// <summary>
    /// Materiales compartidos del proyecto (Built-in RP).
    /// Usa el material base de Resources para garantizar que el shader Standard
    /// quede incluido en el build, y cachea uno por color.
    /// </summary>
    public static class Materiales
    {
        private static Material materialBase;
        private static readonly Dictionary<Color, Material> cache = new Dictionary<Color, Material>();

        public static Material Crear(Color color, bool emisivo = false)
        {
            if (!emisivo && cache.TryGetValue(color, out Material existente) && existente != null)
                return existente;

            Material fuente = ObtenerBase();
            if (fuente == null) return null;

            Material material = new Material(fuente)
            {
                name = "CalamaCity_" + ColorUtility.ToHtmlStringRGB(color),
                color = color
            };

            if (emisivo)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * 1.5f);
            }
            else
            {
                cache[color] = material;
            }

            return material;
        }

        private static Material ObtenerBase()
        {
            if (materialBase != null) return materialBase;

            materialBase = Resources.Load<Material>("Materiales/Base");

            if (materialBase == null)
            {
                Shader shader = Shader.Find("Standard")
                    ?? Shader.Find("Legacy Shaders/Diffuse")
                    ?? Shader.Find("Sprites/Default");

                if (shader != null)
                    materialBase = new Material(shader);
            }

            return materialBase;
        }
    }
}
