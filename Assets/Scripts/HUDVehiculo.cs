using UnityEngine;
using UnityEngine.UI;

namespace CalamaCity.UI
{
    /// <summary>
    /// Velocímetro y barra de vida mostrados en la pantalla.
    /// Fase 4 del roadmap.
    /// </summary>
    public class HUDVehiculo : MonoBehaviour
    {
        [Header("Referencias UI")]
        [Tooltip("Texto que muestra la velocidad actual.")]
        public Text textoVelocidad;
        [Tooltip("Imagen de relleno de la barra de vida.")]
        public Image barraVida;

        [Header("Vehículo")]
        [Tooltip("Controlador del vehículo para leer la velocidad.")]
        public VehiculoController vehiculo;

        [Header("Vida del jugador")]
        [Tooltip("Vida actual del jugador (0-100).")]
        public float vidaJugador = 100f;

        void Update()
        {
            // Actualizar velocímetro
            if (textoVelocidad != null && vehiculo != null)
            {
                float velocidadKmh = vehiculo.ObtenerVelocidadKmh();
                textoVelocidad.text = $"{(int)velocidadKmh} KM/H";
            }

            // Actualizar barra de vida
            if (barraVida != null)
            {
                float vidaNormalizada = vidaJugador / 100f;
                barraVida.fillAmount = Mathf.Clamp01(vidaNormalizada);
            }
        }

        /// <summary>
        /// Reduce la vida del jugador (llamado por sistema de daño).
        /// </summary>
        public void RecibirDaño(float cantidad)
        {
            vidaJugador = Mathf.Max(0, vidaJugador - cantidad);
        }

        /// <summary>
        /// Cura la vida del jugador.
        /// </summary>
        public void Curar(float cantidad)
        {
            vidaJugador = Mathf.Min(100, vidaJugador + cantidad);
        }
    }
}
