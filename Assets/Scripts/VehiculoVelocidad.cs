using UnityEngine;

namespace CalamaCity.Vehiculo
{
    /// <summary>
    /// Extensión de VehiculoController: expone la velocidad actual en km/h.
    /// </summary>
    public partial class VehiculoController
    {
        public float ObtenerVelocidadKmh()
        {
            if (rb == null) return 0f;
            return ConvertirAKmh(rb.linearVelocity.magnitude);
        }

        public static float ConvertirAKmh(float metrosPorSegundo)
        {
            return metrosPorSegundo * 3.6f;
        }
    }
}
