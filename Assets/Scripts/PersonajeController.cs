using UnityEngine;

namespace CalamaCity.Player
{
    /// <summary>
    /// Controlador básico del personaje: caminar, correr, saltar.
    /// Fase 1 del roadmap.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PersonajeController : MonoBehaviour
    {
        [Header("Movimiento")]
        [Tooltip("Velocidad de caminar en unidades por segundo.")]
        public float velocidadCaminar = 3.5f;
        [Tooltip("Velocidad de correr en unidades por segundo.")]
        public float velocidadCorrer = 6.0f;
        [Tooltip("Fuerza del salto.")]
        public float fuerzaSalto = 8.0f;
        [Tooltip("Gravedad aplicada al personaje.")]
        public float gravedad = -20.0f;

        [Header("Vehículo")]
        [Tooltip("Referencia al vehículo en el que está el personaje (null si anda a pie).")]
        public VehiculoController vehiculoActual;
        [Tooltip("Posición relativa dentro del vehículo (asiento del conductor).")]
        public Vector3 posicionDentroDelVehiculo = new Vector3(0, 0.8f, 0.5f);

        private CharacterController controlador;
        private Vector3 velocidadVertical;
        private bool enSuelo;
        private bool dentroDelVehiculo;

        void Awake()
        {
            controlador = GetComponent<CharacterController>();
            dentroDelVehiculo = false;
            vehiculoActual = null;
        }

        void Update()
        {
            // Si está dentro de un vehículo, no procesar movimiento a pie
            if (dentroDelVehiculo && vehiculoActual != null)
            {
                // Sincronizar posición con el vehículo
                transform.position = vehiculoActual.transform.TransformPoint(posicionDentroDelVehiculo);
                transform.rotation = vehiculoActual.transform.rotation;

                // Tecla para salir
                if (Input.GetKeyDown(KeyCode.E))
                    SalirDelVehiculo();

                return;
            }

            enSuelo = controlador.isGrounded;

            if (enSuelo && velocidadVertical.y < 0)
                velocidadVertical.y = -2f;

            float horizontal = Input.GetAxis("Horizontal");
            float vertical = Input.GetAxis("Vertical");
            bool correr = Input.GetKey(KeyCode.LeftShift);

            float velocidadActual = correr ? velocidadCorrer : velocidadCaminar;
            Vector3 movimiento = transform.right * horizontal + transform.forward * vertical;
            movimiento = movimiento.normalized * velocidadActual * Time.deltaTime;

            controlador.Move(movimiento);

            if (Input.GetButtonDown("Jump") && enSuelo)
                velocidadVertical.y = Mathf.Sqrt(fuerzaSalto * -2f * gravedad);

            velocidadVertical.y += gravedad * Time.deltaTime;
            controlador.Move(velocidadVertical * Time.deltaTime);

            // Tecla para entrar en vehículo cercano
            if (Input.GetKeyDown(KeyCode.E))
                IntentarEntrarVehiculo();
        }

        void IntentarEntrarVehiculo()
        {
            Collider[] colisiones = Physics.OverlapSphere(transform.position, 3.0f);
            foreach (var col in colisiones)
            {
                var vehiculo = col.GetComponentInParent<VehiculoController>();
                if (vehiculo != null)
                {
                    EntrarVehiculo(vehiculo);
                    return;
                }
            }
        }

        public void EntrarVehiculo(VehiculoController vehiculo)
        {
            dentroDelVehiculo = true;
            vehiculoActual = vehiculo;
            controlador.enabled = false; // Desactivar CharacterController mientras está en el coche

            // Posicionar dentro del vehículo
            transform.position = vehiculo.transform.TransformPoint(posicionDentroDelVehiculo);
            transform.rotation = vehiculo.transform.rotation;

            Debug.Log("Entraste al vehículo. Presiona E para salir.");
        }

        public void SalirDelVehiculo()
        {
            dentroDelVehiculo = false;
            controlador.enabled = true;

            // Posicionar al lado del vehículo
            if (vehiculoActual != null)
            {
                Vector3 salida = vehiculoActual.transform.position + Vector3.right * 2.5f;
                transform.position = salida;
                transform.rotation = vehiculoActual.transform.rotation;
                vehiculoActual = null;
            }

            Debug.Log("Saliste del vehículo.");
        }
    }
}
