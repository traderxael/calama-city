using UnityEngine;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera una manzana de edificios paramétricos alrededor de una calle.
    /// Fase 3 del roadmap: escenario de Calama.
    /// </summary>
    public class GeneradorEdificios : MonoBehaviour
    {
        [Header("Dimensiones de la manzana")]
        public int edificiosEnX = 3;
        public int edificiosEnZ = 3;
        public float separacionEdificios = 6f;
        public float anchoAvenida = 12f;

        [Header("Dimensiones de cada edificio")]
        public float anchoMin = 8f;
        public float anchoMax = 16f;
        public float largoMin = 10f;
        public float largoMax = 20f;
        public float pisoAltura = 3.5f;
        public int pisosMin = 2;
        public int pisosMax = 6;

        [Header("Colores")]
        public Color colorPared = new Color(0.85f, 0.82f, 0.78f);
        public Color colorTecho = new Color(0.4f, 0.35f, 0.3f);
        public Color colorVentana = new Color(0.3f, 0.5f, 0.7f, 0.6f);

        void Start()
        {
            GenerarManzana();
        }

        void GenerarManzana()
        {
            for (int x = 0; x < edificiosEnX; x++)
            {
                for (int z = 0; z < edificiosEnZ; z++)
                {
                    Vector3 posicion = new Vector3(
                        x * (anchoMax + separacionEdificios),
                        0,
                        z * (largoMax + separacionEdificios)
                    );

                    GenerarEdificio(posicion);
                }
            }
        }

        void GenerarEdificio(Vector3 posicionBase)
        {
            float ancho = Random.Range(anchoMin, anchoMax);
            float largo = Random.Range(largoMin, largoMax);
            int pisos = Random.Range(pisosMin, pisosMax);
            float alturaTotal = pisos * pisoAltura;

            GameObject edificio = new GameObject("Edificio");
            edificio.transform.parent = transform;
            edificio.transform.position = posicionBase;

            // Paredes principales
            CrearCubo("ParedFrente", new Vector3(0, alturaTotal / 2f, largo / 2f), new Vector3(ancho, alturaTotal, 0.2f), colorPared, edificio.transform);
            CrearCubo("ParedAtras", new Vector3(0, alturaTotal / 2f, -largo / 2f), new Vector3(ancho, alturaTotal, 0.2f), colorPared, edificio.transform);
            CrearCubo("ParedIzq", new Vector3(-ancho / 2f, alturaTotal / 2f, 0), new Vector3(0.2f, alturaTotal, largo), colorPared, edificio.transform);
            CrearCubo("ParedDer", new Vector3(ancho / 2f, alturaTotal / 2f, 0), new Vector3(0.2f, alturaTotal, largo), colorPared, edificio.transform);

            // Techo
            CrearCubo("Techo", new Vector3(0, alturaTotal + 0.5f, 0), new Vector3(ancho + 1f, 1f, largo + 1f), colorTecho, edificio.transform);

            // Ventanas en cada piso
            for (int p = 1; p <= pisos; p++)
            {
                float yPiso = p * pisoAltura - pisoAltura / 2f;

                // Ventanas frente y atrás
                int ventanasFrente = Mathf.Max(2, Mathf.FloorToInt(ancho / 3f));
                for (int v = 0; v < ventanasFrente; v++)
                {
                    float xV = -ancho / 2f + (v + 0.5f) * (ancho / ventanasFrente);
                    CrearCubo($"VentanaFrente_{p}_{v}", new Vector3(xV, yPiso, largo / 2f + 0.11f), new Vector3(1.5f, 1.5f, 0.1f), colorVentana, edificio.transform);
                    CrearCubo($"VentanaAtras_{p}_{v}", new Vector3(xV, yPiso, -largo / 2f - 0.11f), new Vector3(1.5f, 1.5f, 0.1f), colorVentana, edificio.transform);
                }

                // Ventanas lados
                int ventanasLado = Mathf.Max(2, Mathf.FloorToInt(largo / 3f));
                for (int v = 0; v < ventanasLado; v++)
                {
                    float zV = -largo / 2f + (v + 0.5f) * (largo / ventanasLado);
                    CrearCubo($"VentanaIzq_{p}_{v}", new Vector3(-ancho / 2f - 0.11f, yPiso, zV), new Vector3(0.1f, 1.5f, 1.5f), colorVentana, edificio.transform);
                    CrearCubo($"VentanaDer_{p}_{v}", new Vector3(ancho / 2f + 0.11f, yPiso, zV), new Vector3(0.1f, 1.5f, 1.5f), colorVentana, edificio.transform);
                }
            }

            // Collider del edificio
            BoxCollider bc = edificio.AddComponent<BoxCollider>();
            bc.size = new Vector3(ancho + 2f, alturaTotal + 1f, largo + 2f);

            edificio.tag = "Edificio";
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
