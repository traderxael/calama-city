using UnityEngine;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera la Plaza 23 de Marzo de Calama como punto central de la ciudad.
    /// Incluye área abierta, banco central, farolas y señalética.
    /// Fase 3 del roadmap.
    /// </summary>
    public class GeneradorPlaza23DeMarzo : MonoBehaviour
    {
        [Header("Dimensiones de la plaza")]
        public float radioPlaza = 40f;
        public float grosorSuelo = 0.3f;

        [Header("Elementos centrales")]
        public bool generarMonumento = true;
        public float alturaMonumento = 8f;

        [Header("Farolas")]
        public int numFarolas = 12;
        public float alturaFarola = 6f;

        [Header("Colores")]
        public Color colorSueloPlaza = new Color(0.6f, 0.55f, 0.5f);
        public Color colorMonumento = new Color(0.9f, 0.85f, 0.8f);
        public Color colorFarola = new Color(0.2f, 0.2f, 0.2f);
        public Color colorLuzFarola = new Color(1f, 0.95f, 0.8f);

        void Start()
        {
            GenerarSueloPlaza();
            if (generarMonumento) GenerarMonumentoCentral();
            GenerarFarolas();
        }

        void GenerarSueloPlaza()
        {
            GameObject suelo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            suelo.name = "SueloPlaza23DeMarzo";
            suelo.transform.parent = transform;
            suelo.transform.localScale = new Vector3(radioPlaza * 2f, grosorSuelo, radioPlaza * 2f);
            suelo.transform.position = Vector3.zero;

            Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = colorSueloPlaza;
            suelo.GetComponent<Renderer>().material = mat;

            Collider col = suelo.GetComponent<Collider>();
            if (col != null)
#if UNITY_EDITOR
                UnityEditor.Undo.DestroyObjectImmediate(col);
#else
                DestroyImmediate(col);
#endif

            suelo.tag = "Plaza";
        }

        void GenerarMonumentoCentral()
        {
            GameObject monumento = new GameObject("MonumentoCentral");
            monumento.transform.parent = transform;
            monumento.transform.position = Vector3.up * (alturaMonumento / 2f);

            // Base
            CrearCubo("Base", Vector3.zero, new Vector3(6f, 1f, 6f), colorMonumento, monumento.transform);

            // Obelisco
            CrearCubo("Obelisco", new Vector3(0, alturaMonumento / 2f, 0), new Vector3(2f, alturaMonumento, 2f), colorMonumento, monumento.transform);

            // Collider
            BoxCollider bc = monumento.AddComponent<BoxCollider>();
            bc.size = new Vector3(6f, alturaMonumento, 6f);

            monumento.tag = "Monumento";
        }

        void GenerarFarolas()
        {
            GameObject contenedorFarolas = new GameObject("Farolas");
            contenedorFarolas.transform.parent = transform;

            for (int i = 0; i < numFarolas; i++)
            {
                float angulo = i * (360f / numFarolas) * Mathf.Deg2Rad;
                float x = Mathf.Cos(angulo) * (radioPlaza - 5f);
                float z = Mathf.Sin(angulo) * (radioPlaza - 5f);
                Vector3 posicion = new Vector3(x, 0, z);

                GameObject farola = new GameObject($"Farola_{i}");
                farola.transform.parent = contenedorFarolas.transform;
                farola.transform.position = posicion;

                // Mirar hacia el centro
                farola.transform.LookAt(Vector3.zero);

                // Poste
                CrearCubo("Poste", new Vector3(0, alturaFarola / 2f, 0), new Vector3(0.2f, alturaFarola, 0.2f), colorFarola, farola.transform);

                // Brazo
                CrearCubo("Brazo", new Vector3(0, alturaFarola - 0.5f, 1f), new Vector3(2f, 0.2f, 0.2f), colorFarola, farola.transform);

                // Luz
                GameObject luzGO = new GameObject("Luz");
                luzGO.transform.parent = farola.transform;
                luzGO.transform.localPosition = new Vector3(2f, alturaFarola - 0.5f, 0);
                Luz luz = luzGO.AddComponent<Luz>();
                luz.color = colorLuzFarola;
                luz.intensidad = 2f;

                farola.tag = "Farola";
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

    /// <summary>
    /// Componente simple de luz para farolas (sin depender de sistemas complejos).
    /// </summary>
    public class Luz : MonoBehaviour
    {
        public Color color = Color.white;
        public float intensidad = 1f;
    }
}
