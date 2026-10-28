using UnityEngine;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera calles y aceras paramétricas para el centro de Calama.
    /// Fase 3 del roadmap.
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

        void Start()
        {
            GenerarCallePrincipal();
            GenerarAceras();
            GenerarLineasViales();
        }

        void GenerarCallePrincipal()
        {
            GameObject calle = new GameObject("CallePrincipal");
            calle.transform.parent = transform;

            CrearCubo("Asfalto", Vector3.zero, new Vector3(anchoCalle, grosorAsfalto, largoCalle), colorAsfalto, calle.transform);

            // Collider para la calle (los coches no caen)
            BoxCollider bc = calle.AddComponent<BoxCollider>();
            bc.size = new Vector3(anchoCalle, grosorAsfalto * 2f, largoCalle);
            bc.isTrigger = true;

            calle.tag = "Calle";
        }

        void GenerarAceras()
        {
            GameObject aceras = new GameObject("Aceras");
            aceras.transform.parent = transform;

            // Acerada izquierda
            CrearCubo("AceradaIzquierda", new Vector3(-(anchoCalle / 2f + anchoAceras / 2f), 0, 0),
                new Vector3(anchoAceras, grosorAceras, largoCalle), colorAceras, aceras.transform);

            // Acerada derecha
            CrearCubo("AceradaDerecha", new Vector3(anchoCalle / 2f + anchoAceras / 2f, 0, 0),
                new Vector3(anchoAceras, grosorAceras, largoCalle), colorAceras, aceras.transform);
        }

        void GenerarLineasViales()
        {
            GameObject lineas = new GameObject("LineasViales");
            lineas.transform.parent = transform;

            // Línea central divisoria
            int numLineas = Mathf.FloorToInt(largoCalle / 6f);
            for (int i = 0; i < numLineas; i++)
            {
                float zPos = -largoCalle / 2f + i * 6f + 3f;
                CrearCubo($"LineaCentral_{i}", new Vector3(0, grosorAsfalto + 0.01f, zPos),
                    new Vector3(0.3f, 0.02f, 3f), colorLineaCentral, lineas.transform);
            }
        }

        void CrearCubo(string nombre, Vector3 posicionLocal, Vector3 escala, Color color, Transform padre)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.parent = padre;
            cubo.transform.localPosition = posicionLocal;
            cubo.transform.localScale = escala;

            Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = color;
            cubo.GetComponent<Renderer>().material = mat;

            Collider col = cubo.GetComponent<Collider>();
            if (col != null)
#if UNITY_EDITOR
                UnityEditor.Undo.DestroyObjectImmediate(col);
#else
                DestroyImmediate(col);
#endif
        }
    }
}
