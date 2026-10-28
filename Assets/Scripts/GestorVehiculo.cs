using UnityEngine;
using CalamaCity.Camaras;
using CalamaCity.Vehiculo;

namespace CalamaCity.Player
{
    /// <summary>
    /// Coordina entrar y salir de vehículos. Es el único dueño de la tecla E.
    /// </summary>
    public class GestorVehiculo : MonoBehaviour
    {
        [Header("Referencias")]
        [Tooltip("Cámara en tercera persona que cambia de objetivo.")]
        public CamaraTerceraPersona camara;
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
            if (Time.timeScale == 0f) return;
            if (!Input.GetKeyDown(KeyCode.E)) return;

            if (!personaje.dentroDelVehiculo)
                IntentarEntrar();
            else
                SalirDelVehiculo();
        }

        void IntentarEntrar()
        {
            Collider[] colisiones = Physics.OverlapSphere(transform.position, distanciaMaximaEntrada);
            foreach (var col in colisiones)
            {
                var vehiculo = col.GetComponentInParent<VehiculoController>();
                if (vehiculo == null) continue;

                vehiculo.Activar();
                personaje.EntrarVehiculo(vehiculo);
                vehiculoCercano = vehiculo;

                if (camara != null)
                    camara.Seguir(vehiculo.transform);
                return;
            }
        }

        void SalirDelVehiculo()
        {
            if (vehiculoCercano == null) return;

            vehiculoCercano.Desactivar();
            personaje.SalirDelVehiculo();
            vehiculoCercano = null;

            if (camara != null)
                camara.Seguir(personaje.transform);
        }
    }
}
