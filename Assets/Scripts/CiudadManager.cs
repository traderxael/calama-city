using UnityEngine;

namespace CalamaCity.Core
{
    /// <summary>
    /// Coordinador del escenario de Calama City.
    /// Instancia los generadores de ciudad: calles, edificios y plaza.
    /// Fase 3 del roadmap.
    /// </summary>
    public class CiudadManager : MonoBehaviour
    {
        public static CiudadManager Instance { get; private set; }

        [Header("Generadores")]
        public GeneradorCalles generadorCalles;
        public GeneradorEdificios generadorEdificios;
        public GeneradorPlaza23DeMarzo generadorPlaza;

        [Header("Configuración")]
        public bool generarAlIniciar = true;

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
            if (!generarAlIniciar) return;

            if (generadorPlaza != null)
                generadorPlaza.enabled = true;

            if (generadorCalles != null)
                generadorCalles.enabled = true;

            if (generadorEdificios != null)
                generadorEdificios.enabled = true;

            Debug.Log("Calama City - CiudadManager: escenario generado.");
        }
    }
}
