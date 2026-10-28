using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Genera un coche paramétrico simple (cubos) para pruebas de Fase 2.
    /// No requiere modelos 3D externos. Se puede reemplazar por un modelo real luego.
    /// </summary>
    [ExecuteAlways]
    public class GeneradorCocheSimple : MonoBehaviour
    {
        [Header("Dimensiones")]
        public float largo = 4.2f;
        public float ancho = 1.8f;
        public float alto = 1.6f;

        [Header("Colores")]
        public Color colorCarroceria = new Color(0.2f, 0.6f, 0.9f);
        public Color colorTecho = new Color(0.15f, 0.45f, 0.7f);
        public Color colorRuedas = new Color(0.1f, 0.1f, 0.1f);
        public Color colorVidrio = new Color(0.6f, 0.8f, 1f, 0.7f);

        [Header("Ruedas")]
        public float radioRueda = 0.45f;
        public float anchoRueda = 0.25f;

        private GameObject objetoCoche;

        void OnValidate()
        {
            Generar();
        }

        void Generar()
        {
            // Limpiar objeto anterior en modo editor
            if (objetoCoche != null)
            {
#if UNITY_EDITOR
                UnityEditor.Undo.DestroyObjectImmediate(objetoCoche);
#else
                DestroyImmediate(objetoCoche);
#endif
                objetoCoche = null;
            }

            objetoCoche = new GameObject("CocheParametrico");
            objetoCoche.transform.parent = transform;
            objetoCoche.transform.localPosition = Vector3.zero;

            // Chasis
            CrearCubo("Chasis", Vector3.zero, new Vector3(largo, alto * 0.5f, ancho), colorCarroceria);

            // Techo
            CrearCubo("Techo", new Vector3(0, alto * 0.6f, 0), new Vector3(largo * 0.8f, alto * 0.5f, ancho * 0.7f), colorTecho);

            // Capó
            CrearCubo("Capo", new Vector3(largo * 0.35f, alto * 0.3f, 0), new Vector3(largo * 0.5f, alto * 0.4f, ancho * 0.8f), colorCarroceria);

            // Parachoques
            CrearCubo("ParachoqueDelantero", new Vector3(largo * 0.6f, alto * 0.2f, 0), new Vector3(largo * 0.15f, alto * 0.3f, ancho * 0.9f), new Color(0.1f, 0.1f, 0.1f));
            CrearCubo("ParachoqueTrasero", new Vector3(-largo * 0.6f, alto * 0.2f, 0), new Vector3(largo * 0.15f, alto * 0.3f, ancho * 0.9f), new Color(0.1f, 0.1f, 0.1f));

            // Ruedas
            float xRueda = largo * 0.45f;
            float yRueda = -alto * 0.3f;
            float zRueda = ancho * 0.55f;

            CrearRueda("Rueda_Del_Der", new Vector3(xRueda, yRueda, zRueda));
            CrearRueda("Rueda_Del_Izq", new Vector3(xRueda, yRueda, -zRueda));
            CrearRueda("Rueda_Tra_Der", new Vector3(-xRueda, yRueda, zRueda));
            CrearRueda("Rueda_Tra_Izq", new Vector3(-xRueda, yRueda, -zRueda));

            // Vidrios (ventanas simples)
            CrearCubo("Vidrio_Der", new Vector3(0, alto * 0.55f, ancho * 0.4f), new Vector3(largo * 0.6f, alto * 0.4f, 0.05f), colorVidrio);
            CrearCubo("Vidrio_Izq", new Vector3(0, alto * 0.55f, -ancho * 0.4f), new Vector3(largo * 0.6f, alto * 0.4f, 0.05f), colorVidrio);

            // Punto de salida del personaje
            GameObject puntoSalidaGO = new GameObject("PuntoSalida");
            puntoSalidaGO.transform.parent = objetoCoche.transform;
            puntoSalidaGO.transform.localPosition = new Vector3(largo * 0.5f + 1.5f, 0, 0);

            VehiculoController vc = objetoCoche.AddComponent<VehiculoController>();
            vc.puntoSalida = puntoSalidaGO.transform;

            // Rigidbody y Collider
            Rigidbody rb = objetoCoche.AddComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0, -0.6f, 0);
            rb.freezeRotation = true;

            BoxCollider bc = objetoCoche.AddComponent<BoxCollider>();
            bc.size = new Vector3(largo, alto, ancho);

            // Tag como vehículo
            objetoCoche.tag = "Vehiculo";

            Debug.Log("Coche paramétrico generado.");
        }

        void CrearCubo(string nombre, Vector3 posicion, Vector3 escala, Color color)
        {
            GameObject cubo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            cubo.name = nombre;
            cubo.transform.parent = objetoCoche.transform;
            cubo.transform.localPosition = posicion;
            cubo.transform.localScale = escala;

            Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = color;
            cubo.GetComponent<Renderer>().material = mat;

            // Eliminar el collider del primitivo para no duplicar
            Collider col = cubo.GetComponent<Collider>();
            if (col != null)
#if UNITY_EDITOR
                UnityEditor.Undo.DestroyObjectImmediate(col);
#else
                DestroyImmediate(col);
#endif
        }

        void CrearRueda(string nombre, Vector3 posicion)
        {
            GameObject rueda = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            rueda.name = nombre;
            rueda.transform.parent = objetoCoche.transform;
            rueda.transform.localPosition = posicion;
            rueda.transform.localScale = new Vector3(radioRueda * 2, anchoRueda, radioRueda * 2);
            rueda.transform.Rotate(0, 0, 90); // Orientar como rueda

            Material mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = colorRuedas;
            rueda.GetComponent<Renderer>().material = mat;

            Collider col = rueda.GetComponent<Collider>();
            if (col != null)
#if UNITY_EDITOR
                UnityEditor.Undo.DestroyObjectImmediate(col);
#else
                DestroyImmediate(col);
#endif
        }
    }
}
