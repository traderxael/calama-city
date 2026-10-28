using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Controlador básico de vehículo: acelerar, frenar, girar, reversa.
    /// Fase 2 del roadmap.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class VehiculoController : MonoBehaviour
    {
        [Header("Referencias")]
        [Tooltip("Cámara que sigue al vehículo cuando está activo.")]
        public Camera camaraVehiculo;
        [Tooltip("Cámara que sigue al personaje cuando anda a pie.")]
        public Camera camaraPersonaje;

        [Header("Movimiento")]
        [Tooltip("Fuerza máxima de aceleración.")]
        public float fuerzaMotor = 2500f;
        [Tooltip("Fuerza de frenado.")]
        public float fuerzaFreno = 6000f;
        [Tooltip("Fuerza de giro (dirección).")]
        public float fuerzaGiro = 120f;
        [Tooltip("Velocidad máxima en km/h aproximada.")]
        public float velocidadMaxima = 50f;

        [Header("Entrada/Salida")]
        [Tooltip("Punto donde aparece el personaje al salir del coche.")]
        public Transform puntoSalida;

        private Rigidbody rb;
        private float entradaAcelerar;
        private float entradaGirar;
        private bool activo;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0, -0.6f, 0);
            rb.freezeRotation = true; // El Rigidbody no rota físicamente, lo hacemos por código

            activo = false;
            if (camaraVehiculo != null)
                camaraVehiculo.gameObject.SetActive(false);
        }

        void Update()
        {
            if (!activo) return;

            entradaAcelerar = Input.GetAxis("Vertical");
            entradaGirar = Input.GetAxis("Horizontal");
        }

        void FixedUpdate()
        {
            if (!activo) return;

            // Acelerar / frenar
            Vector3 fuerzaAdelante = transform.forward * entradaAcelerar * fuerzaMotor * Time.fixedDeltaTime;
            rb.AddForce(fuerzaAdelante);

            // Limitar velocidad máxima
            if (rb.velocity.magnitude > velocidadMaxima)
                rb.velocity = rb.velocity.normalized * velocidadMaxima;

            // Girar (solo si hay velocidad)
            float factorVelocidad = Mathf.Clamp01(rb.velocity.magnitude / velocidadMaxima);
            float giro = entradaGirar * fuerzaGiro * Time.fixedDeltaTime * factorVelocidad;
            Quaternion giroRotacion = Quaternion.Euler(0f, giro, 0f);
            rb.MoveRotation(rb.rotation * giroRotacion);
        }

        /// <summary>
        /// Activa el control del vehículo (llamado por GestorVehiculo).
        /// </summary>
        public void Activar()
        {
            activo = true;
            if (camaraVehiculo != null)
                camaraVehiculo.gameObject.SetActive(true);
            if (camaraPersonaje != null)
                camaraPersonaje.gameObject.SetActive(false);
        }

        /// <summary>
        /// Desactiva el control del vehículo (llamado por GestorVehiculo).
        /// </summary>
        public void Desactivar()
        {
            activo = false;
            entradaAcelerar = 0;
            entradaGirar = 0;
            if (camaraVehiculo != null)
                camaraVehiculo.gameObject.SetActive(false);
            if (camaraPersonaje != null)
                camaraPersonaje.gameObject.SetActive(true);
        }

        public Transform GetPuntoSalida()
        {
            return puntoSalida != null ? puntoSalida : transform;
        }
    }
}
