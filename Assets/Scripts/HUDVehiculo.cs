using UnityEngine;
using UnityEngine.UI;
using CalamaCity.Vehiculo;

namespace CalamaCity.UI
{
    /// <summary>
    /// Velocímetro y barra de vida mostrados en la pantalla.
    /// El velocímetro solo aparece cuando el jugador conduce.
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
            if (textoVelocidad != null)
            {
                bool conduciendo = vehiculo != null && vehiculo.Activo;
                textoVelocidad.enabled = conduciendo;

                if (conduciendo)
                    textoVelocidad.text = $"{(int)vehiculo.ObtenerVelocidadKmh()} KM/H";
            }

            if (barraVida != null)
                barraVida.fillAmount = Mathf.Clamp01(vidaJugador / 100f);
        }

        public void RecibirDaño(float cantidad)
        {
            vidaJugador = Mathf.Max(0, vidaJugador - cantidad);
        }

        public void Curar(float cantidad)
        {
            vidaJugador = Mathf.Min(100, vidaJugador + cantidad);
        }
    }
}
