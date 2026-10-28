using UnityEngine;
using CalamaCity.Player;

namespace CalamaCity.Core
{
    /// <summary>
    /// Gestor principal del juego: estado global y pausa.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Referencias")]
        public PersonajeController personaje;

        [Header("Pausa")]
        public GameObject panelPausa;

        public bool enVehiculo => personaje != null && personaje.dentroDelVehiculo;
        public bool EstaPausado => Time.timeScale == 0f;

        void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        void Start()
        {
            if (personaje == null)
                personaje = FindAnyObjectByType<PersonajeController>();

            Time.timeScale = 1f;
            if (panelPausa != null)
                panelPausa.SetActive(false);

            Debug.Log("Calama City iniciado. Fase 6: MVP jugable.");
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
                AlternarPausa();
        }

        public void AlternarPausa()
        {
            bool pausar = Time.timeScale > 0f;
            Time.timeScale = pausar ? 0f : 1f;

            if (panelPausa != null)
                panelPausa.SetActive(pausar);
        }
    }
}
