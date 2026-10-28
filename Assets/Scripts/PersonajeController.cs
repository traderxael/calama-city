using UnityEngine;
using CalamaCity.Vehiculo;

namespace CalamaCity.Player
{
    /// <summary>
    /// Controlador básico del personaje: caminar, correr, saltar y ocupar un vehículo.
    /// La entrada/salida del coche la coordina GestorVehiculo (único dueño de la tecla E).
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
        [Tooltip("Vehículo en el que está el personaje (null si anda a pie).")]
        public VehiculoController vehiculoActual;
        [Tooltip("Posición relativa dentro del vehículo (asiento del conductor).")]
        public Vector3 posicionDentroDelVehiculo = new Vector3(0, 0.8f, 0.5f);

        private CharacterController controlador;
        private Vector3 velocidadVertical;
        private bool enSuelo;

        public bool dentroDelVehiculo { get; private set; }

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
                transform.position = vehiculoActual.transform.TransformPoint(posicionDentroDelVehiculo);
                transform.rotation = vehiculoActual.transform.rotation;
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
        }

        public void EntrarVehiculo(VehiculoController vehiculo)
        {
            dentroDelVehiculo = true;
            vehiculoActual = vehiculo;
            velocidadVertical = Vector3.zero;
            controlador.enabled = false;

            transform.position = vehiculo.transform.TransformPoint(posicionDentroDelVehiculo);
            transform.rotation = vehiculo.transform.rotation;
        }

        public void SalirDelVehiculo()
        {
            dentroDelVehiculo = false;

            if (vehiculoActual != null)
            {
                Transform salida = vehiculoActual.GetPuntoSalida();
                transform.position = salida.position;
                transform.rotation = vehiculoActual.transform.rotation;
                vehiculoActual = null;
            }

            velocidadVertical = Vector3.zero;
            controlador.enabled = true;
        }
    }
}
