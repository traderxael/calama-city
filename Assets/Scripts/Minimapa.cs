using UnityEngine;
using UnityEngine.UI;

namespace CalamaCity.UI
{
    /// <summary>
    /// Minimapa simple que muestra la posición del jugador.
    /// </summary>
    public class Minimapa : MonoBehaviour
    {
        [Header("Referencias")]
        [Tooltip("Imagen que sirve como fondo del minimapa.")]
        public Image fondoMinimapa;
        [Tooltip("Icono que representa al jugador.")]
        public Image iconoJugador;
        [Tooltip("Transform del jugador a seguir.")]
        public Transform jugador;
        [Tooltip("Radio del área mostrada en el minimapa (unidades de juego).")]
        public float radioVista = 100f;

        [Header("Configuración")]
        [Tooltip("Tamaño del minimapa en píxeles.")]
        public float tamañoPantalla = 200f;
        [Tooltip("Actualizar rotación del icono según la dirección del jugador.")]
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

            iconoJugador.rectTransform.anchoredPosition = CalcularPosicion(jugador.position, radioVista, tamañoPantalla);

            if (rotarIcono)
            {
                float angulo = Mathf.Atan2(jugador.forward.x, jugador.forward.z) * Mathf.Rad2Deg;
                iconoJugador.rectTransform.localRotation = Quaternion.Euler(0, 0, -angulo);
            }
        }

        public static Vector2 CalcularPosicion(Vector3 posicion, float radio, float tamaño)
        {
            if (radio <= 0f) radio = 1f;

            float x = Mathf.Clamp(posicion.x / radio, -1f, 1f);
            float z = Mathf.Clamp(posicion.z / radio, -1f, 1f);
            return new Vector2(x, z) * (tamaño / 2f);
        }
    }
}
