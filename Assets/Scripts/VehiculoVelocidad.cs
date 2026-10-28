using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Extensión de VehiculoController: expone la velocidad actual en km/h.
    /// </summary>
    public partial class VehiculoController
    {
        /// <summary>
        /// Devuelve la velocidad actual en km/h (aproximada).
        /// </summary>
        public float ObtenerVelocidadKmh()
        {
            if (rb == null) return 0f;
            // Convertir unidades/segundo a km/h aproximado (factor arbitrario para juego)
            return rb.velocity.magnitude * 18f;
        }
    }
}
