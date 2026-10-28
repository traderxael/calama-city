using UnityEngine;
using CalamaCity.Core;

namespace CalamaCity.Ciudad
{
    /// <summary>
    /// Genera la Plaza 23 de Marzo de Calama: área abierta, monumento central y farolas.
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

            GenerarSueloPlaza();
            if (generarMonumento) GenerarMonumentoCentral();
            GenerarFarolas();
        }

        void GenerarSueloPlaza()
        {
            GameObject suelo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            suelo.name = "SueloPlaza23DeMarzo";
            suelo.transform.SetParent(transform, false);
            suelo.transform.localScale = new Vector3(radioPlaza * 2f, grosorSuelo, radioPlaza * 2f);
            suelo.transform.localPosition = new Vector3(0, -grosorSuelo + 0.01f, 0);

            Renderer renderer = suelo.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(colorSueloPlaza);

            // El cilindro primitivo trae CapsuleCollider (no es un disco plano): se reemplaza por una caja.
            Utilidades.Destruir(suelo.GetComponent<Collider>());
            BoxCollider collider = suelo.AddComponent<BoxCollider>();
            collider.size = new Vector3(1f, 2f, 1f);
        }

        void GenerarMonumentoCentral()
        {
            GameObject monumento = new GameObject("MonumentoCentral");
            monumento.transform.SetParent(transform, false);
            monumento.transform.localPosition = Vector3.zero;

            CrearCubo("Base", new Vector3(0, 0.5f, 0), new Vector3(6f, 1f, 6f), colorMonumento, monumento.transform);
            CrearCubo("Obelisco", new Vector3(0, 1f + (alturaMonumento - 1f) / 2f, 0),
                new Vector3(2f, alturaMonumento - 1f, 2f), colorMonumento, monumento.transform);

            BoxCollider collider = monumento.AddComponent<BoxCollider>();
            collider.center = new Vector3(0, alturaMonumento / 2f, 0);
            collider.size = new Vector3(6f, alturaMonumento, 6f);
        }

        void GenerarFarolas()
        {
            GameObject contenedorFarolas = new GameObject("Farolas");
            contenedorFarolas.transform.SetParent(transform, false);

            for (int i = 0; i < numFarolas; i++)
            {
                float angulo = i * (360f / numFarolas) * Mathf.Deg2Rad;
                Vector3 posicion = new Vector3(
                    Mathf.Cos(angulo) * (radioPlaza - 5f),
                    0,
                    Mathf.Sin(angulo) * (radioPlaza - 5f));

                GameObject farola = new GameObject($"Farola_{i}");
                farola.transform.SetParent(contenedorFarolas.transform, false);
                farola.transform.localPosition = posicion;
                farola.transform.LookAt(transform.position);

                CrearCubo("Poste", new Vector3(0, alturaFarola / 2f, 0),
                    new Vector3(0.2f, alturaFarola, 0.2f), colorFarola, farola.transform);
                CrearCubo("Brazo", new Vector3(0, alturaFarola - 0.5f, 1f),
                    new Vector3(0.2f, 0.2f, 2f), colorFarola, farola.transform);
                CrearCubo("Luz", new Vector3(0, alturaFarola - 0.7f, 2f),
                    new Vector3(0.5f, 0.3f, 0.5f), colorLuzFarola, farola.transform, true);
            }
        }

        void CrearCubo(string nombre, Vector3 posicionLocal, Vector3 escala, Color color, Transform padre, bool emisivo = false)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.SetParent(padre, false);
            cubo.transform.localPosition = posicionLocal;
            cubo.transform.localScale = escala;

            Renderer renderer = cubo.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(color, emisivo);

            Utilidades.Destruir(cubo.GetComponent<Collider>());
        }
    }
}
