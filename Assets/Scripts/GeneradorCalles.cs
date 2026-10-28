using UnityEngine;
using CalamaCity.Core;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera calles y aceras paramétricas para el centro de Calama.
    /// </summary>
    public class GeneradorCalles : MonoBehaviour
    {
        [Header("Dimensiones de la calle principal")]
        public float anchoCalle = 12f;
        public float largoCalle = 200f;
        public float grosorAsfalto = 0.2f;

        [Header("Aceras")]
        public float anchoAceras = 3f;
        public float grosorAceras = 0.1f;

        [Header("Colores")]
        public Color colorAsfalto = new Color(0.15f, 0.15f, 0.17f);
        public Color colorAceras = new Color(0.7f, 0.7f, 0.7f);
        public Color colorLineaCentral = new Color(1f, 1f, 1f);

        [Header("Generación")]
        public bool autoGenerar = true;

        private bool generado;

        void Start()
        {
            if (autoGenerar) GenerarTodo();
        }

        public void GenerarTodo()
        {
            if (generado) return;
            generado = true;

            GenerarCallePrincipal();
            GenerarAceras();
            GenerarLineasViales();
        }

        void GenerarCallePrincipal()
        {
            GameObject calle = new GameObject("CallePrincipal");
            calle.transform.SetParent(transform, false);

            float alturaAsfalto = -grosorAsfalto / 2f + 0.02f;
            CrearCubo("Asfalto", new Vector3(0, alturaAsfalto, 0),
                new Vector3(anchoCalle, grosorAsfalto, largoCalle), colorAsfalto, calle.transform, true);
        }

        void GenerarAceras()
        {
            GameObject aceras = new GameObject("Aceras");
            aceras.transform.SetParent(transform, false);

            CrearCubo("AceraIzquierda", new Vector3(-(anchoCalle / 2f + anchoAceras / 2f), 0, 0),
                new Vector3(anchoAceras, grosorAceras, largoCalle), colorAceras, aceras.transform, true);

            CrearCubo("AceraDerecha", new Vector3(anchoCalle / 2f + anchoAceras / 2f, 0, 0),
                new Vector3(anchoAceras, grosorAceras, largoCalle), colorAceras, aceras.transform, true);
        }

        void GenerarLineasViales()
        {
            GameObject lineas = new GameObject("LineasViales");
            lineas.transform.SetParent(transform, false);

            int numLineas = Mathf.FloorToInt(largoCalle / 6f);
            for (int i = 0; i < numLineas; i++)
            {
                float zPos = -largoCalle / 2f + i * 6f + 3f;
                CrearCubo($"LineaCentral_{i}", new Vector3(0, 0.04f, zPos),
                    new Vector3(0.3f, 0.02f, 3f), colorLineaCentral, lineas.transform, false);
            }
        }

        void CrearCubo(string nombre, Vector3 posicionLocal, Vector3 escala, Color color, Transform padre, bool conCollider)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.SetParent(padre, false);
            cubo.transform.localPosition = posicionLocal;
            cubo.transform.localScale = escala;

            Renderer renderer = cubo.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(color);

            if (!conCollider)
                Utilidades.Destruir(cubo.GetComponent<Collider>());
        }
    }
}
