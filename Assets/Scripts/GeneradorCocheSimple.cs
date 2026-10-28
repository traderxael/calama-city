using UnityEngine;
using CalamaCity.Core;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Genera un coche paramétrico simple (cubos y cilindros) con cuatro WheelColliders.
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

        [Header("Física")]
        public float masaCoche = 1200f;

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

            Transform visualDelDer = CrearRueda("Rueda_Del_Der", new Vector3(xRueda, radioRueda, zRueda));
            Transform visualDelIzq = CrearRueda("Rueda_Del_Izq", new Vector3(-xRueda, radioRueda, zRueda));
            Transform visualTraDer = CrearRueda("Rueda_Tra_Der", new Vector3(xRueda, radioRueda, -zRueda));
            Transform visualTraIzq = CrearRueda("Rueda_Tra_Izq", new Vector3(-xRueda, radioRueda, -zRueda));

            GameObject puntoSalidaGO = new GameObject("PuntoSalida");
            puntoSalidaGO.transform.SetParent(transform, false);
            puntoSalidaGO.transform.localPosition = new Vector3(ancho / 2f + 1.2f, 0.2f, 0f);

            Rigidbody rb = GetComponent<Rigidbody>();
            if (rb == null)
                rb = gameObject.AddComponent<Rigidbody>();

            rb.mass = masaCoche;
            rb.linearDamping = 0.02f;
            rb.angularDamping = 0.4f;
            rb.freezeRotation = false;

            // Collider del chasis elevado: el contacto con el suelo es de las ruedas.
            BoxCollider collider = GetComponent<BoxCollider>();
            if (collider == null)
                collider = gameObject.AddComponent<BoxCollider>();

            collider.center = new Vector3(0f, alto / 2f + 0.1f, 0f);
            collider.size = new Vector3(ancho, alto - 0.2f, largo);

            VehiculoController controlador = GetComponent<VehiculoController>();
            if (controlador == null)
                controlador = gameObject.AddComponent<VehiculoController>();

            controlador.radioRueda = radioRueda;

            float ySuspension = radioRueda + controlador.distanciaSuspension * controlador.posicionObjetivoSuspension;

            WheelCollider wcDelDer = CrearWheelCollider("WC_Del_Der", new Vector3(xRueda, ySuspension, zRueda));
            WheelCollider wcDelIzq = CrearWheelCollider("WC_Del_Izq", new Vector3(-xRueda, ySuspension, zRueda));
            WheelCollider wcTraDer = CrearWheelCollider("WC_Tra_Der", new Vector3(xRueda, ySuspension, -zRueda));
            WheelCollider wcTraIzq = CrearWheelCollider("WC_Tra_Izq", new Vector3(-xRueda, ySuspension, -zRueda));

            controlador.ruedaDelDer = wcDelDer;
            controlador.ruedaDelIzq = wcDelIzq;
            controlador.ruedaTraDer = wcTraDer;
            controlador.ruedaTraIzq = wcTraIzq;
            controlador.visualDelDer = visualDelDer;
            controlador.visualDelIzq = visualDelIzq;
            controlador.visualTraDer = visualTraDer;
            controlador.visualTraIzq = visualTraIzq;
            controlador.puntoSalida = puntoSalidaGO.transform;
            controlador.ConfigurarRuedas();
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

        Transform CrearRueda(string nombre, Vector3 posicion)
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
            return rueda.transform;
        }

        WheelCollider CrearWheelCollider(string nombre, Vector3 posicion)
        {
            GameObject rueda = new GameObject(nombre);
            rueda.transform.SetParent(transform, false);
            rueda.transform.localPosition = posicion;

            WheelCollider collider = rueda.AddComponent<WheelCollider>();
            collider.radius = radioRueda;
            return collider;
        }
    }
}
