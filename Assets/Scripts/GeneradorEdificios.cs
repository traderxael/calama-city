using UnityEngine;
using CalamaCity.Core;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera manzanas de edificios paramétricos alrededor de una calle.
    /// </summary>
    public class GeneradorEdificios : MonoBehaviour
    {
        [Header("Dimensiones de la manzana")]
        public int edificiosEnX = 3;
        public int edificiosEnZ = 3;
        public float separacionEdificios = 6f;

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

            GenerarManzana();
        }

        void GenerarManzana()
        {
            float pasoX = anchoMax + separacionEdificios;
            float pasoZ = largoMax + separacionEdificios;
            float offsetX = (edificiosEnX - 1) * pasoX / 2f;
            float offsetZ = (edificiosEnZ - 1) * pasoZ / 2f;

            for (int x = 0; x < edificiosEnX; x++)
            {
                for (int z = 0; z < edificiosEnZ; z++)
                {
                    Vector3 posicion = new Vector3(x * pasoX - offsetX, 0, z * pasoZ - offsetZ);
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
            edificio.transform.SetParent(transform, false);
            edificio.transform.localPosition = posicionBase;

            CrearCubo("ParedFrente", new Vector3(0, alturaTotal / 2f, largo / 2f), new Vector3(ancho, alturaTotal, 0.2f), colorPared, edificio.transform);
            CrearCubo("ParedAtras", new Vector3(0, alturaTotal / 2f, -largo / 2f), new Vector3(ancho, alturaTotal, 0.2f), colorPared, edificio.transform);
            CrearCubo("ParedIzq", new Vector3(-ancho / 2f, alturaTotal / 2f, 0), new Vector3(0.2f, alturaTotal, largo), colorPared, edificio.transform);
            CrearCubo("ParedDer", new Vector3(ancho / 2f, alturaTotal / 2f, 0), new Vector3(0.2f, alturaTotal, largo), colorPared, edificio.transform);
            CrearCubo("Techo", new Vector3(0, alturaTotal + 0.5f, 0), new Vector3(ancho + 1f, 1f, largo + 1f), colorTecho, edificio.transform);

            for (int p = 1; p <= pisos; p++)
            {
                float yPiso = p * pisoAltura - pisoAltura / 2f;

                int ventanasFrente = Mathf.Max(2, Mathf.FloorToInt(ancho / 3f));
                for (int v = 0; v < ventanasFrente; v++)
                {
                    float xV = -ancho / 2f + (v + 0.5f) * (ancho / ventanasFrente);
                    CrearCubo($"VentanaFrente_{p}_{v}", new Vector3(xV, yPiso, largo / 2f + 0.11f), new Vector3(1.5f, 1.5f, 0.1f), colorVentana, edificio.transform);
                    CrearCubo($"VentanaAtras_{p}_{v}", new Vector3(xV, yPiso, -largo / 2f - 0.11f), new Vector3(1.5f, 1.5f, 0.1f), colorVentana, edificio.transform);
                }

                int ventanasLado = Mathf.Max(2, Mathf.FloorToInt(largo / 3f));
                for (int v = 0; v < ventanasLado; v++)
                {
                    float zV = -largo / 2f + (v + 0.5f) * (largo / ventanasLado);
                    CrearCubo($"VentanaIzq_{p}_{v}", new Vector3(-ancho / 2f - 0.11f, yPiso, zV), new Vector3(0.1f, 1.5f, 1.5f), colorVentana, edificio.transform);
                    CrearCubo($"VentanaDer_{p}_{v}", new Vector3(ancho / 2f + 0.11f, yPiso, zV), new Vector3(0.1f, 1.5f, 1.5f), colorVentana, edificio.transform);
                }
            }

            BoxCollider collider = edificio.AddComponent<BoxCollider>();
            collider.center = new Vector3(0, alturaTotal / 2f, 0);
            collider.size = new Vector3(ancho, alturaTotal, largo);
        }

        void CrearCubo(string nombre, Vector3 posicionLocal, Vector3 escala, Color color, Transform padre)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.SetParent(padre, false);
            cubo.transform.localPosition = posicionLocal;
            cubo.transform.localScale = escala;

            Renderer renderer = cubo.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(color);

            Utilidades.Destruir(cubo.GetComponent<Collider>());
        }
    }
}
