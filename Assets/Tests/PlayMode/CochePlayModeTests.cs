using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using CalamaCity.Vehiculo;

namespace CalamaCity.Tests.PlayMode
{
    public class CochePlayModeTests
    {
        private GameObject suelo;
        private GameObject coche;

        [TearDown]
        public void Limpiar()
        {
            if (coche != null) Object.Destroy(coche);
            if (suelo != null) Object.Destroy(suelo);
            coche = null;
            suelo = null;
        }

        [UnityTest]
        public IEnumerator Coche_SeApoyaEnRuedasYAvanzaConTorque()
        {
            suelo = GameObject.CreatePrimitive(PrimitiveType.Cube);
            suelo.name = "SueloTest";
            suelo.transform.position = new Vector3(0f, -0.5f, 0f);
            suelo.transform.localScale = new Vector3(200f, 1f, 200f);
            Physics.SyncTransforms();

            coche = new GameObject("CocheTest");
            coche.transform.position = new Vector3(0f, 0.4f, 0f);
            coche.AddComponent<GeneradorCocheSimple>();

            VehiculoController controlador = coche.GetComponent<VehiculoController>();
            Assert.IsNotNull(controlador, "El coche no se generó.");
            Assert.AreEqual(4, coche.GetComponentsInChildren<WheelCollider>().Length, "Faltan WheelColliders.");

            for (int i = 0; i < 120; i++)
                yield return new WaitForFixedUpdate();

            Assert.That(coche.transform.position.y, Is.InRange(-0.2f, 1.2f), "El coche no se asentó sobre las ruedas.");

            Vector3 inicio = coche.transform.position;
            controlador.Activar();
            controlador.AplicarEntrada(1f, 0f);

            for (int i = 0; i < 150; i++)
                yield return new WaitForFixedUpdate();

            float desplazamiento = Vector3.Distance(inicio, coche.transform.position);
            Assert.Greater(desplazamiento, 2f, "El coche no avanzó con torque en las ruedas.");
            Assert.Greater(controlador.ObtenerVelocidadKmh(), 5f, "La velocidad leída es demasiado baja.");
        }
    }
}
