using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Controlador básico de vehículo: acelerar, frenar, girar, reversa y freno de mano.
    /// Fase 2 del roadmap, pulido en Fase 6.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public partial class VehiculoController : MonoBehaviour
    {
        [Header("Movimiento")]
        [Tooltip("Fuerza máxima de aceleración.")]
        public float fuerzaMotor = 12000f;
        [Tooltip("Fuerza de frenado.")]
        public float fuerzaFreno = 20000f;
        [Tooltip("Fuerza de giro (dirección).")]
        public float fuerzaGiro = 120f;
        [Tooltip("Velocidad máxima en metros por segundo (22 ≈ 80 km/h).")]
        public float velocidadMaxima = 22f;
        [Tooltip("Agarre lateral: cuánto se corrige el derrape por segundo.")]
        public float agarreLateral = 8f;

        [Header("Entrada/Salida")]
        [Tooltip("Punto donde aparece el personaje al salir del coche.")]
        public Transform puntoSalida;

        private Rigidbody rb;
        private float entradaAcelerar;
        private float entradaGirar;
        private bool activo;

        public bool Activo => activo;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0, 0.35f, 0);
            rb.freezeRotation = true;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
            activo = false;
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

            float velocidadAdelante = Vector3.Dot(transform.forward, rb.linearVelocity);
            bool frenoMano = Input.GetKey(KeyCode.Space);

            // Acelerar / frenar / reversa
            if (entradaAcelerar > 0.01f)
            {
                rb.AddForce(transform.forward * (fuerzaMotor * entradaAcelerar));
            }
            else if (entradaAcelerar < -0.01f)
            {
                if (velocidadAdelante > 0.5f)
                    rb.AddForce(-transform.forward * fuerzaFreno);
                else
                    rb.AddForce(transform.forward * (fuerzaMotor * 0.6f * entradaAcelerar));
            }

            // Freno de mano
            if (frenoMano)
                rb.AddForce(-transform.forward * (fuerzaFreno * 0.8f));

            // Limitar velocidad máxima
            if (rb.linearVelocity.magnitude > velocidadMaxima)
                rb.linearVelocity = rb.linearVelocity.normalized * velocidadMaxima;

            // Corregir derrape lateral (agarre)
            Vector3 velocidadLocal = transform.InverseTransformDirection(rb.linearVelocity);
            float agarre = frenoMano ? agarreLateral * 0.2f : agarreLateral;
            velocidadLocal.x = Mathf.MoveTowards(velocidadLocal.x, 0f, agarre * Time.fixedDeltaTime * (1f + velocidadLocal.magnitude));
            rb.linearVelocity = transform.TransformDirection(velocidadLocal);

            // Girar (solo si hay velocidad)
            float factorVelocidad = Mathf.Clamp01(velocidadLocal.magnitude / velocidadMaxima);
            float giro = entradaGirar * fuerzaGiro * Time.fixedDeltaTime * factorVelocidad;
            Quaternion giroRotacion = Quaternion.Euler(0f, giro, 0f);
            rb.MoveRotation(rb.rotation * giroRotacion);
        }

        public void Activar()
        {
            activo = true;
        }

        public void Desactivar()
        {
            activo = false;
            entradaAcelerar = 0;
            entradaGirar = 0;
        }

        public Transform GetPuntoSalida()
        {
            return puntoSalida != null ? puntoSalida : transform;
        }
    }
}
