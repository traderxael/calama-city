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
        [Header("Movimiento")]
        [Tooltip("Fuerza máxima de aceleración.")]
        public float fuerzaMotor = 2000f;
        [Tooltip("Fuerza de frenado.")]
        public float fuerzaFreno = 5000f;
        [Tooltip("Fuerza de giro (dirección).")]
        public float fuerzaGiro = 100f;
        [Tooltip("Velocidad máxima.")]
        public float velocidadMaxima = 40f;

        private Rigidbody rb;
        private float entradaAcelerar;
        private float entradaGirar;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0, -0.5f, 0);
        }

        void Update()
        {
            entradaAcelerar = Input.GetAxis("Vertical");
            entradaGirar = Input.GetAxis("Horizontal");
        }

        void FixedUpdate()
        {
            // Acelerar / frenar
            Vector3 fuerzaAdelante = transform.forward * entradaAcelerar * fuerzaMotor * Time.fixedDeltaTime;
            rb.AddForce(fuerzaAdelante);

            // Limitar velocidad máxima
            if (rb.velocity.magnitude > velocidadMaxima)
                rb.velocity = rb.velocity.normalized * velocidadMaxima;

            // Girar (solo si hay velocidad)
            float giro = entradaGirar * fuerzaGiro * Time.fixedDeltaTime * (rb.velocity.magnitude / velocidadMaxima);
            Quaternion giroRotacion = Quaternion.Euler(0f, giro, 0f);
            rb.MoveRotation(rb.rotation * giroRotacion);
        }
    }
}
