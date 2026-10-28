using UnityEngine;

namespace CalamaCity.Camera
{
    /// <summary>
    /// Cámara en tercera persona que sigue al objetivo con suavizado.
    /// Fase 1 del roadmap.
    /// </summary>
    public class CamaraTerceraPersona : MonoBehaviour
    {
        [Header("Objetivo")]
        [Tooltip("Transform a seguir (personaje o vehículo).")]
        public Transform objetivo;

        [Header("Posicionamiento")]
        [Tooltip("Distancia desde el objetivo.")]
        public float distancia = 5.0f;
        [Tooltip("Altura sobre el objetivo.")]
        public float altura = 2.0f;
        [Tooltip("Suavizado del seguimiento.")]
        public float suavizado = 5.0f;

        void LateUpdate()
        {
            if (objetivo == null) return;

            Vector3 posicionDeseada = objetivo.position - objetivo.forward * distancia + Vector3.up * altura;
            transform.position = Vector3.Lerp(transform.position, posicionDeseada, suavizado * Time.deltaTime);
            transform.LookAt(objetivo.position + Vector3.up * 1.0f);
        }
    }
}
