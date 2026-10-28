using UnityEngine;
using CalamaCity.Ciudad;

namespace CalamaCity.Core
{
    /// <summary>
    /// Coordinador del escenario de Calama City.
    /// Instancia los generadores en orden y con semilla fija para una ciudad reproducible.
    /// </summary>
    public class CiudadManager : MonoBehaviour
    {
        public static CiudadManager Instance { get; private set; }

        [Header("Generadores")]
        public GeneradorCalles generadorCalles;
        public GeneradorEdificios[] generadoresEdificios;
        public GeneradorPlaza23DeMarzo generadorPlaza;

        [Header("Configuración")]
        public bool generarAlIniciar = true;
        public int semilla = 20261028;

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
            if (!generarAlIniciar) return;

            Random.InitState(semilla);

            if (generadorPlaza != null)
                generadorPlaza.GenerarTodo();

            if (generadorCalles != null)
                generadorCalles.GenerarTodo();

            if (generadoresEdificios != null)
            {
                foreach (GeneradorEdificios generador in generadoresEdificios)
                {
                    if (generador != null)
                        generador.GenerarTodo();
                }
            }

            Debug.Log("Calama City - CiudadManager: escenario generado.");
        }
    }
}
