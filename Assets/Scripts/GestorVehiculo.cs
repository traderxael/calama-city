using UnityEngine;

namespace CalamaCity.Player
{
    /// <summary>
    /// Gestiona entrar y salir de vehículos, y el cambio de control entre personaje y coche.
    /// Fase 2 del roadmap.
    /// </summary>
    public class GestorVehiculo : MonoBehaviour
    {
        [Header("Referencias")]
        [Tooltip("Cámara en tercera persona del personaje.")]
        public Camera camaraPersonaje;
        [Tooltip("Distancia máxima para detectar un vehículo cercano.")]
        public float distanciaMaximaEntrada = 4.0f;

        private VehiculoController vehiculoCercano;
        private PersonajeController personaje;

        void Awake()
        {
            personaje = GetComponent<PersonajeController>();
        }

        void Update()
        {
            if (personaje == null) return;

            if (Input.GetKeyDown(KeyCode.E))
            {
                if (!personaje.dentroDelVehiculo)
                    IntentarEntrar();
                else
                    SalirDelVehiculo();
            }
        }

        void IntentarEntrar()
        {
            Collider[] colisiones = Physics.OverlapSphere(transform.position, distanciaMaximaEntrada);
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

        void EntrarVehiculo(VehiculoController vehiculo)
        {
            // Desactivar cámaras del personaje
            if (camaraPersonaje != null)
                camaraPersonaje.gameObject.SetActive(false);

            // Activar vehículo
            vehiculo.Activar();

            // Delegar al personaje
            personaje.EntrarVehiculo(vehiculo);
            vehiculoCercano = vehiculo;
        }

        void SalirDelVehiculo()
        {
            if (vehiculoCercano == null) return;

            // Desactivar vehículo
            vehiculoCercano.Desactivar();

            // Reactivar cámaras del personaje
            if (camaraPersonaje != null)
                camaraPersonaje.gameObject.SetActive(true);

            // Delegar al personaje
            personaje.SalirDelVehiculo();
            vehiculoCercano = null;
        }
    }
}
