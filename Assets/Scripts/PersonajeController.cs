using UnityEngine;

namespace CalamaCity.Player
{
    /// <summary>
    /// Controlador básico del personaje: caminar, correr, saltar.
    /// Fase 1 del roadmap.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PersonajeController : MonoBehaviour
    {
        [Header("Movimiento")]
        [Tooltip("Velocidad de caminar en unidades por segundo.")]
        public float velocidadCaminar = 3.5f;
        [Tooltip("Velocidad de correr en unidades por segundo.")]
        public float velocidadCorrer = 6.0f;
        [Tooltip("Fuerza del salto.")]
        public float fuerzaSalto = 8.0f;
        [Tooltip("Gravedad aplicada al personaje.")]
        public float gravedad = -20.0f;

        private CharacterController controlador;
        private Vector3 velocidadVertical;
        private bool enSuelo;

        void Awake()
        {
            controlador = GetComponent<CharacterController>();
        }

        void Update()
        {
            enSuelo = controlador.isGrounded;

            if (enSuelo && velocidadVertical.y < 0)
                velocidadVertical.y = -2f;

            float horizontal = Input.GetAxis("Horizontal");
            float vertical = Input.GetAxis("Vertical");
            bool correr = Input.GetKey(KeyCode.LeftShift);

            float velocidadActual = correr ? velocidadCorrer : velocidadCaminar;
            Vector3 movimiento = transform.right * horizontal + transform.forward * vertical;
            movimiento = movimiento.normalized * velocidadActual * Time.deltaTime;

            controlador.Move(movimiento);

            if (Input.GetButtonDown("Jump") && enSuelo)
                velocidadVertical.y = Mathf.Sqrt(fuerzaSalto * -2f * gravedad);

            velocidadVertical.y += gravedad * Time.deltaTime;
            controlador.Move(velocidadVertical * Time.deltaTime);
        }
    }
}
