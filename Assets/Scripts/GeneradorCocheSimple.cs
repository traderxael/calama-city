using UnityEngine;
using CalamaCity.Core;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Genera un coche paramétrico simple (cubos y cilindros) sin modelos 3D externos.
    /// El morro apunta a +Z, igual que transform.forward.
    /// </summary>
    public class GeneradorCocheSimple : MonoBehaviour
    {
        [Header("Dimensiones")]
        public float largo = 4.2f;
        public float ancho = 1.8f;
        public float alto = 1.5f;

        [Header("Colores")]
        public Color colorCarroceria = new Color(0.2f, 0.6f, 0.9f);
        public Color colorTecho = new Color(0.15f, 0.45f, 0.7f);
        public Color colorRuedas = new Color(0.1f, 0.1f, 0.1f);
        public Color colorVidrio = new Color(0.6f, 0.8f, 1f, 0.7f);

        [Header("Ruedas")]
        public float radioRueda = 0.45f;
        public float anchoRueda = 0.3f;

        void Awake()
        {
            if (Application.isPlaying)
                Generar();
        }

        public void Generar()
        {
            if (transform.Find("Chasis") != null) return;

            CrearCubo("Chasis", new Vector3(0, 0.45f, 0), new Vector3(ancho, 0.7f, largo), colorCarroceria);
            CrearCubo("Techo", new Vector3(0, 1.05f, -0.25f), new Vector3(ancho * 0.9f, 0.55f, largo * 0.45f), colorTecho);
            CrearCubo("Capo", new Vector3(0, 0.78f, largo * 0.3f), new Vector3(ancho * 0.95f, 0.25f, largo * 0.3f), colorCarroceria);
            CrearCubo("ParachoquesDelantero", new Vector3(0, 0.45f, largo / 2f + 0.05f),
                new Vector3(ancho * 1.02f, 0.3f, 0.15f), new Color(0.1f, 0.1f, 0.1f));
            CrearCubo("ParachoquesTrasero", new Vector3(0, 0.45f, -largo / 2f - 0.05f),
                new Vector3(ancho * 1.02f, 0.3f, 0.15f), new Color(0.1f, 0.1f, 0.1f));

            CrearCubo("VidrioDerecho", new Vector3(ancho * 0.5f + 0.01f, 1.05f, -0.25f),
                new Vector3(0.05f, 0.45f, largo * 0.38f), colorVidrio);
            CrearCubo("VidrioIzquierdo", new Vector3(-ancho * 0.5f - 0.01f, 1.05f, -0.25f),
                new Vector3(0.05f, 0.45f, largo * 0.38f), colorVidrio);

            float xRueda = ancho / 2f;
            float zRueda = largo * 0.32f;
            CrearRueda("Rueda_Del_Der", new Vector3(xRueda, radioRueda, zRueda));
            CrearRueda("Rueda_Del_Izq", new Vector3(-xRueda, radioRueda, zRueda));
            CrearRueda("Rueda_Tra_Der", new Vector3(xRueda, radioRueda, -zRueda));
            CrearRueda("Rueda_Tra_Izq", new Vector3(-xRueda, radioRueda, -zRueda));

            GameObject puntoSalidaGO = new GameObject("PuntoSalida");
            puntoSalidaGO.transform.SetParent(transform, false);
            puntoSalidaGO.transform.localPosition = new Vector3(ancho / 2f + 1.2f, 0.2f, 0f);

            if (GetComponent<Rigidbody>() == null)
            {
                Rigidbody rb = gameObject.AddComponent<Rigidbody>();
                rb.mass = 1200f;
            }

            if (GetComponent<BoxCollider>() == null)
            {
                BoxCollider collider = gameObject.AddComponent<BoxCollider>();
                collider.center = new Vector3(0, alto / 2f, 0);
                collider.size = new Vector3(ancho, alto, largo);
            }

            VehiculoController controlador = GetComponent<VehiculoController>();
            if (controlador == null)
                controlador = gameObject.AddComponent<VehiculoController>();
            controlador.puntoSalida = puntoSalidaGO.transform;
        }

        void CrearCubo(string nombre, Vector3 posicion, Vector3 escala, Color color)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.SetParent(transform, false);
            cubo.transform.localPosition = posicion;
            cubo.transform.localScale = escala;

            Renderer renderer = cubo.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(color);

            Utilidades.Destruir(cubo.GetComponent<Collider>());
        }

        void CrearRueda(string nombre, Vector3 posicion)
        {
            GameObject rueda = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            rueda.name = nombre;
            rueda.transform.SetParent(transform, false);
            rueda.transform.localPosition = posicion;
            rueda.transform.localScale = new Vector3(radioRueda * 2f, anchoRueda / 2f, radioRueda * 2f);
            rueda.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);

            Renderer renderer = rueda.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(colorRuedas);

            Utilidades.Destruir(rueda.GetComponent<Collider>());
        }
    }
}
