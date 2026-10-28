using UnityEngine;

namespace CalamaCity.Core
{
    /// <summary>
    /// Gestor principal del juego: inicializa sistemas y coordina estado global.
    /// Fase 2 del roadmap.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Referencias")]
        public PersonajeController personaje;
        public Camera camaraPersonaje;
        public Camera camaraVehiculo;

        [Header("Estado")]
        public bool enVehiculo => personaje != null && personaje.dentroDelVehiculo;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            if (personaje == null)
                personaje = FindFirstObjectByType<PersonajeController>();

            if (camaraPersonaje == null)
                camaraPersonaje = Camera.main;

            Debug.Log("Calama City iniciado. Fase 2: Conducción y entrada/salida de vehículo.");
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                // Pausa simple
                Time.timeScale = Time.timeScale == 0 ? 1 : 0;
            }
        }
    }
}
