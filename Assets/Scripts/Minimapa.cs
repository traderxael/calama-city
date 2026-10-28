using UnityEngine;
using UnityEngine.UI;

namespace CalamaCity.UI
{
    /// <summary>
    /// Minimapa simple que muestra la posición del jugador y vehículos cercanos.
    /// Fase 4 del roadmap.
    /// </summary>
    public class Minimapa : MonoBehaviour
    {
        [Header("Referencias")]
        [Tooltip="Imagen que sirve como fondo del minimapa.")]
        public Image fondoMinimapa;
        [Tooltip="Icono que representa al jugador.")]
        public Image iconoJugador;
        [Tooltip="Transform del jugador a seguir.")]
        public Transform jugador;
        [Tooltip="Radio del área mostrada en el minimapa (unidades de juego).")]
        public float radioVista = 100f;

        [Header("Configuración")]
        [Tooltip="Tamaño del minimapa en píxeles.")]
        public float tamañoPantalla = 200f;
        [Tooltip="Actualizar rotación del icono según la dirección del jugador.")]
        public bool rotarIcono = true;

        RectTransform rectTransform;

        void Awake()
        {
            rectTransform = GetComponent<RectTransform>();
            if (rectTransform != null)
                rectTransform.sizeDelta = new Vector2(tamañoPantalla, tamañoPantalla);
        }

        void LateUpdate()
        {
            if (jugador == null || iconoJugador == null) return;

            // Calcular posición relativa del jugador en el minimapa
            Vector3 posicionJugador = jugador.position;
            float xNormalizado = posicionJugador.x / radioVista;
            float zNormalizado = posicionJugador.z / radioVista;

            // Limitar al radio de vista
            xNormalizado = Mathf.Clamp(xNormalizado, -1f, 1f);
            zNormalizado = Mathf.Clamp(zNormalizado, -1f, 1f);

            // Posicionar en el canvas del minimapa
            Vector2 posicionMinimapa = new Vector2(xNormalizado, zNormalizado) * (tamañoPantalla / 2f);
            iconoJugador.rectTransform.anchoredPosition = posicionMinimapa;

            // Rotar icono según dirección del jugador
            if (rotarIcono)
            {
                float angulo = Mathf.Atan2(jugador.forward.x, jugador.forward.z) * Mathf.Rad2Deg;
                iconoJugador.rectTransform.localRotation = Quaternion.Euler(0, 0, -angulo);
            }
        }
    }
}
