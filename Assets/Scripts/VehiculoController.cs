using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Conducción con WheelCollider: suspensión, dirección, torque y freno de mano.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public partial class VehiculoController : MonoBehaviour
    {
        [Header("Motor")]
        [Tooltip("Torque máximo por rueda motriz (Nm).")]
        public float torqueMotor = 1400f;
        [Tooltip("Torque máximo en reversa por rueda motriz (Nm).")]
        public float torqueReversa = 900f;
        [Tooltip("Velocidad máxima en metros por segundo (22 ≈ 80 km/h).")]
        public float velocidadMaxima = 22f;
        [Tooltip("Torque de frenado por rueda (Nm).")]
        public float fuerzaFrenado = 2500f;
        [Tooltip("Torque del freno de mano en las ruedas traseras (Nm).")]
        public float fuerzaFrenoMano = 6000f;

        [Header("Dirección")]
        [Tooltip("Ángulo máximo de las ruedas delanteras (grados).")]
        public float anguloMaximoGiro = 32f;
        [Tooltip("Velocidad de giro del volante (grados por segundo).")]
        public float velocidadGiro = 140f;
        [Tooltip("Cuánto se reduce el ángulo de giro a alta velocidad (0-1).")]
        [Range(0f, 0.9f)] public float sensibilidadVelocidad = 0.55f;

        [Header("Suspensión")]
        public float radioRueda = 0.45f;
        public float distanciaSuspension = 0.25f;
        [Range(0f, 1f)] public float posicionObjetivoSuspension = 0.5f;
        public float rigidezSuspension = 45000f;
        public float amortiguacionSuspension = 4500f;
        public float masaRueda = 25f;
        public float fuerzaBarraEstabilizadora = 15000f;
        public float fuerzaDownforce = 6f;

        [Header("Agarre")]
        [Tooltip("Rigidez lateral de las ruedas delanteras.")]
        public float agarreLateralDelantero = 2.2f;
        [Tooltip("Rigidez lateral de las ruedas traseras.")]
        public float agarreLateralTrasero = 1.9f;
        [Tooltip("Rigidez lateral trasera con freno de mano (derrape).")]
        public float agarreLateralFrenoMano = 0.6f;

        [Header("Ruedas")]
        public WheelCollider ruedaDelIzq;
        public WheelCollider ruedaDelDer;
        public WheelCollider ruedaTraIzq;
        public WheelCollider ruedaTraDer;
        public Transform visualDelIzq;
        public Transform visualDelDer;
        public Transform visualTraIzq;
        public Transform visualTraDer;

        [Header("Entrada/Salida")]
        [Tooltip("Punto donde aparece el personaje al salir del coche.")]
        public Transform puntoSalida;

        [Header("Control externo")]
        [Tooltip("Si está activo, ignora el teclado (tests o IA).")]
        public bool usarEntradaExterna;

        private Rigidbody rb;
        private float entradaAcelerar;
        private float entradaGirar;
        private bool entradaFrenoMano;
        private float anguloGiroActual;
        private bool activo;

        public bool Activo => activo;

        void Awake()
        {
            rb = GetComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0f, 0.2f, 0f);
            rb.freezeRotation = false;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.Continuous;
            rb.linearDamping = 0.02f;
            rb.angularDamping = 0.4f;
            activo = false;
        }

        void Update()
        {
            if (!activo) return;

            if (!usarEntradaExterna)
            {
                entradaAcelerar = Input.GetAxis("Vertical");
                entradaGirar = Input.GetAxis("Horizontal");
                entradaFrenoMano = Input.GetKey(KeyCode.Space);
            }
        }

        void LateUpdate()
        {
            ActualizarVisual(ruedaDelIzq, visualDelIzq);
            ActualizarVisual(ruedaDelDer, visualDelDer);
            ActualizarVisual(ruedaTraIzq, visualTraIzq);
            ActualizarVisual(ruedaTraDer, visualTraDer);
        }

        void FixedUpdate()
        {
            if (!activo) return;

            float velocidadAdelante = Vector3.Dot(transform.forward, rb.linearVelocity);
            float velocidad = rb.linearVelocity.magnitude;
            float velocidadPlana = new Vector2(rb.linearVelocity.x, rb.linearVelocity.z).magnitude;

            float anguloObjetivo = CalcularAnguloGiro(entradaGirar, velocidadPlana, anguloMaximoGiro, velocidadMaxima, sensibilidadVelocidad);
            anguloGiroActual = Mathf.MoveTowards(anguloGiroActual, anguloObjetivo, velocidadGiro * Time.fixedDeltaTime);

            if (ruedaDelIzq != null) ruedaDelIzq.steerAngle = anguloGiroActual;
            if (ruedaDelDer != null) ruedaDelDer.steerAngle = anguloGiroActual;

            float torque = 0f;
            float freno = 0f;

            if (entradaAcelerar > 0.01f)
            {
                if (velocidadAdelante < velocidadMaxima)
                    torque = torqueMotor * entradaAcelerar;
            }
            else if (entradaAcelerar < -0.01f)
            {
                if (velocidadAdelante > 0.5f)
                    freno = fuerzaFrenado;
                else if (velocidadAdelante > -velocidadMaxima * 0.4f)
                    torque = torqueReversa * entradaAcelerar;
            }

            AplicarTorque(torque);
            AplicarFrenos(freno, entradaFrenoMano);
            AplicarAgarreLateral(entradaFrenoMano);

            // Downforce: más carga aerodinámica a mayor velocidad
            if (velocidad > 1f)
                rb.AddForce(-transform.up * (fuerzaDownforce * velocidad * velocidad));

            AplicarBarraEstabilizadora(ruedaDelIzq, ruedaDelDer);
            AplicarBarraEstabilizadora(ruedaTraIzq, ruedaTraDer);

            LimitarVelocidad();
        }

        public static float CalcularAnguloGiro(float entrada, float velocidad, float anguloMaximo, float velocidadMaxima, float sensibilidad)
        {
            float factor = velocidadMaxima > 0f ? Mathf.Clamp01(velocidad / velocidadMaxima) : 0f;
            float factorAngulo = Mathf.Lerp(1f, 1f - sensibilidad, factor);
            return entrada * anguloMaximo * factorAngulo;
        }

        public void ConfigurarRuedas()
        {
            ConfigurarRueda(ruedaDelIzq);
            ConfigurarRueda(ruedaDelDer);
            ConfigurarRueda(ruedaTraIzq);
            ConfigurarRueda(ruedaTraDer);

            Debug.Log($"Coche configurado con 4 WheelColliders (radio {radioRueda:0.00} m, suspensión {distanciaSuspension:0.00} m).");
        }

        private void ConfigurarRueda(WheelCollider rueda)
        {
            if (rueda == null) return;

            rueda.radius = radioRueda;
            rueda.mass = masaRueda;
            rueda.suspensionDistance = distanciaSuspension;
            rueda.forceAppPointDistance = 0.05f;

            JointSpring suspension = rueda.suspensionSpring;
            suspension.spring = rigidezSuspension;
            suspension.damper = amortiguacionSuspension;
            suspension.targetPosition = posicionObjetivoSuspension;
            rueda.suspensionSpring = suspension;

            WheelFrictionCurve avance = rueda.forwardFriction;
            avance.stiffness = 1.2f;
            rueda.forwardFriction = avance;
        }

        private void AplicarTorque(float torque)
        {
            if (ruedaTraIzq != null) ruedaTraIzq.motorTorque = torque;
            if (ruedaTraDer != null) ruedaTraDer.motorTorque = torque;
        }

        private void AplicarFrenos(float freno, bool frenoMano)
        {
            float frenoTrasero = frenoMano ? Mathf.Max(freno, fuerzaFrenoMano) : freno;

            if (ruedaDelIzq != null) ruedaDelIzq.brakeTorque = freno;
            if (ruedaDelDer != null) ruedaDelDer.brakeTorque = freno;
            if (ruedaTraIzq != null) ruedaTraIzq.brakeTorque = frenoTrasero;
            if (ruedaTraDer != null) ruedaTraDer.brakeTorque = frenoTrasero;
        }

        private void AplicarAgarreLateral(bool frenoMano)
        {
            if (ruedaDelIzq != null) AplicarFriccionLateral(ruedaDelIzq, agarreLateralDelantero);
            if (ruedaDelDer != null) AplicarFriccionLateral(ruedaDelDer, agarreLateralDelantero);

            float agarreTrasero = frenoMano ? agarreLateralFrenoMano : agarreLateralTrasero;
            if (ruedaTraIzq != null) AplicarFriccionLateral(ruedaTraIzq, agarreTrasero);
            if (ruedaTraDer != null) AplicarFriccionLateral(ruedaTraDer, agarreTrasero);
        }

        private static void AplicarFriccionLateral(WheelCollider rueda, float rigidez)
        {
            WheelFrictionCurve lateral = rueda.sidewaysFriction;
            lateral.stiffness = rigidez;
            rueda.sidewaysFriction = lateral;
        }

        private void AplicarBarraEstabilizadora(WheelCollider izquierda, WheelCollider derecha)
        {
            if (izquierda == null || derecha == null || rb == null) return;

            bool tocaIzq = izquierda.GetGroundHit(out WheelHit hitIzq);
            bool tocaDer = derecha.GetGroundHit(out WheelHit hitDer);

            float recorridoIzq = 1f;
            float recorridoDer = 1f;

            if (tocaIzq)
                recorridoIzq = (-izquierda.transform.InverseTransformPoint(hitIzq.point).y - izquierda.radius) / Mathf.Max(0.01f, izquierda.suspensionDistance);

            if (tocaDer)
                recorridoDer = (-derecha.transform.InverseTransformPoint(hitDer.point).y - derecha.radius) / Mathf.Max(0.01f, derecha.suspensionDistance);

            float fuerza = (recorridoIzq - recorridoDer) * fuerzaBarraEstabilizadora;

            if (tocaIzq)
                rb.AddForceAtPosition(izquierda.transform.up * -fuerza, izquierda.transform.position);

            if (tocaDer)
                rb.AddForceAtPosition(derecha.transform.up * fuerza, derecha.transform.position);
        }

        private void LimitarVelocidad()
        {
            Vector3 velocidad = rb.linearVelocity;
            Vector3 plana = new Vector3(velocidad.x, 0f, velocidad.z);

            if (plana.magnitude <= velocidadMaxima) return;

            Vector3 limitada = plana.normalized * velocidadMaxima;
            rb.linearVelocity = new Vector3(limitada.x, velocidad.y, limitada.z);
        }

        private void ActualizarVisual(WheelCollider rueda, Transform visual)
        {
            if (rueda == null || visual == null) return;

            rueda.GetWorldPose(out Vector3 posicion, out Quaternion rotacion);
            visual.SetPositionAndRotation(posicion, rotacion * Quaternion.Euler(0f, 0f, 90f));
        }

        public void AplicarEntrada(float acelerar, float girar, bool frenoMano = false)
        {
            usarEntradaExterna = true;
            entradaAcelerar = Mathf.Clamp(acelerar, -1f, 1f);
            entradaGirar = Mathf.Clamp(girar, -1f, 1f);
            entradaFrenoMano = frenoMano;
        }

        public void Activar()
        {
            activo = true;
            anguloGiroActual = 0f;
            entradaAcelerar = 0f;
            entradaGirar = 0f;
            entradaFrenoMano = false;

            if (ruedaDelIzq != null) ruedaDelIzq.brakeTorque = 0f;
            if (ruedaDelDer != null) ruedaDelDer.brakeTorque = 0f;
            if (ruedaTraIzq != null) ruedaTraIzq.brakeTorque = 0f;
            if (ruedaTraDer != null) ruedaTraDer.brakeTorque = 0f;
        }

        public void Desactivar()
        {
            activo = false;
            entradaAcelerar = 0f;
            entradaGirar = 0f;
            entradaFrenoMano = false;

            AplicarTorque(0f);
            AplicarFrenos(1500f, false);
            AplicarAgarreLateral(false);

            if (ruedaDelIzq != null) ruedaDelIzq.steerAngle = 0f;
            if (ruedaDelDer != null) ruedaDelDer.steerAngle = 0f;
        }

        public Transform GetPuntoSalida()
        {
            return puntoSalida != null ? puntoSalida : transform;
        }
    }
}
