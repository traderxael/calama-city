using UnityEngine;

namespace CalamaCity.Player
{
    /// <summary>
    /// Gestiona entrar y salir de vehículos.
    /// Fase 2 del roadmap.
    /// </summary>
    public class GestorVehiculo : MonoBehaviour
    {
        [Header("Referencias")]
        public KeyCode teclaEntrarSalir = KeyCode.E;
        public float distanciaMaximaEntrada = 3.0f;

        private VehiculoController vehiculoCercano;
        private bool dentroDelVehiculo;

        void Update()
        {
            if (Input.GetKeyDown(teclaEntrarSalir))
            {
                if (!dentroDelVehiculo)
                    IntentarEntrar();
                else
                    SalirDelVehiculo();
            }
        }

        void IntentarEntrar()
        {
            // Buscar vehículo cercano (simplificado para Fase 2)
            Collider[] colisiones = Physics.OverlapSphere(transform.position, distanciaMaximaEntrada);
            foreach (var col in colisiones)
            {
                var vehiculo = col.GetComponentInParent<VehiculoController>();
                if (vehiculo != null)
                {
                    vehiculoCercano = vehiculo;
                    break;
                }
            }

            if (vehiculoCercano != null)
            {
                dentroDelVehiculo = true;
                gameObject.SetActive(false); // Ocultar personaje
                // TODO: Posicionar personaje dentro del coche y activar control del vehículo
            }
        }

        void SalirDelVehiculo()
        {
            dentroDelVehiculo = false;
            gameObject.SetActive(true);
            // TODO: Posicionar personaje fuera del coche y reactivar control del personaje
            vehiculoCercano = null;
        }
    }
}
