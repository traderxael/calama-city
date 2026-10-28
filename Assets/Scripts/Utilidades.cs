using UnityEngine;

namespace CalamaCity.Core
{
    public static class Utilidades
    {
        /// <summary>
        /// Destruye un objeto inmediatamente; válido tanto en Play como en tests EditMode.
        /// </summary>
        public static void Destruir(Object objeto)
        {
            if (objeto == null) return;
            Object.DestroyImmediate(objeto);
        }
    }
}
