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

            Vector3 velocidad = rb.linearVelocity;
            return ConvertirAKmh(new Vector2(velocidad.x, velocidad.z).magnitude);
        }

        public static float ConvertirAKmh(float metrosPorSegundo)
        {
            return metrosPorSegundo * 3.6f;
        }
    }
}
