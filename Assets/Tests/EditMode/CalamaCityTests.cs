using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using CalamaCity.Ciudad;
using CalamaCity.Core;
using CalamaCity.UI;
using CalamaCity.Vehiculo;

namespace CalamaCity.Tests
{
    public class CalamaCityTests
    {
        private readonly List<GameObject> creados = new List<GameObject>();

        private GameObject Nuevo(string nombre)
        {
            GameObject go = new GameObject(nombre);
            creados.Add(go);
            return go;
        }

        [TearDown]
        public void Limpiar()
        {
            foreach (GameObject go in creados)
            {
                if (go != null)
                    Object.DestroyImmediate(go);
            }
            creados.Clear();
        }

        [Test]
        public void Velocidad_ConvierteMetrosPorSegundoAKmh()
        {
            Assert.AreEqual(36f, VehiculoController.ConvertirAKmh(10f), 0.001f);
            Assert.AreEqual(0f, VehiculoController.ConvertirAKmh(0f), 0.001f);
            Assert.AreEqual(79.2f, VehiculoController.ConvertirAKmh(22f), 0.01f);
        }

        [Test]
        public void Minimapa_ClampeaFueraDelRadio()
        {
            Vector2 dentro = Minimapa.CalcularPosicion(new Vector3(50f, 0f, -50f), 100f, 200f);
            Assert.AreEqual(50f, dentro.x, 0.001f);
            Assert.AreEqual(-50f, dentro.y, 0.001f);

            Vector2 fuera = Minimapa.CalcularPosicion(new Vector3(1000f, 0f, -1000f), 100f, 200f);
            Assert.AreEqual(100f, fuera.x, 0.001f);
            Assert.AreEqual(-100f, fuera.y, 0.001f);
        }

        [Test]
        public void Calles_GeneranAsfaltoConColliderEIdempotente()
        {
            GameObject go = Nuevo("CallesTest");
            GeneradorCalles calles = go.AddComponent<GeneradorCalles>();
            calles.autoGenerar = false;

            calles.GenerarTodo();
            int hijos = go.transform.childCount;

            Transform asfalto = go.transform.Find("CallePrincipal/Asfalto");
            Assert.IsNotNull(asfalto, "No se generó el asfalto.");
            BoxCollider collider = asfalto.GetComponent<BoxCollider>();
            Assert.IsNotNull(collider, "El asfalto no tiene collider.");
            Assert.IsFalse(collider.isTrigger, "El collider del asfalto no debe ser trigger.");

            calles.GenerarTodo();
            Assert.AreEqual(hijos, go.transform.childCount, "GenerarTodo debe ser idempotente.");
        }

        [Test]
        public void Coche_TieneCuatroWheelCollidersYChasisElevado()
        {
            GameObject go = Nuevo("CocheTest");
            GeneradorCocheSimple generador = go.AddComponent<GeneradorCocheSimple>();

            generador.Generar();
            generador.Generar();

            VehiculoController controlador = go.GetComponent<VehiculoController>();
            Assert.IsNotNull(controlador, "Falta VehiculoController.");
            Assert.AreEqual(1, go.GetComponents<Rigidbody>().Length, "Debe haber un único Rigidbody.");
            Assert.AreEqual(1, go.GetComponents<BoxCollider>().Length, "Debe haber un único BoxCollider raíz.");
            Assert.AreEqual(4, go.GetComponentsInChildren<WheelCollider>().Length, "Deben existir 4 WheelColliders.");

            Assert.IsNotNull(controlador.ruedaDelIzq);
            Assert.IsNotNull(controlador.ruedaDelDer);
            Assert.IsNotNull(controlador.ruedaTraIzq);
            Assert.IsNotNull(controlador.ruedaTraDer);
            Assert.IsNotNull(controlador.visualDelIzq);
            Assert.IsNotNull(controlador.visualDelDer);
            Assert.IsNotNull(controlador.visualTraIzq);
            Assert.IsNotNull(controlador.visualTraDer);

            Assert.AreEqual(0.45f, controlador.ruedaDelIzq.radius, 0.001f);
            Assert.Greater(controlador.ruedaDelIzq.suspensionDistance, 0f, "La suspensión debe tener recorrido.");

            BoxCollider collider = go.GetComponent<BoxCollider>();
            Assert.Greater(collider.size.z, collider.size.x, "El eje largo del coche debe ser Z (morro +Z).");
            Assert.Greater(collider.center.y - collider.size.y / 2f, 0f, "El chasis no debe tocar el suelo.");
            Assert.IsNotNull(controlador.puntoSalida, "Falta el punto de salida.");
            Assert.IsNotNull(go.transform.Find("Chasis"), "No se generó el chasis.");
        }

        [Test]
        public void Direccion_ReduceAnguloAlAumentarVelocidad()
        {
            float lento = VehiculoController.CalcularAnguloGiro(1f, 0f, 32f, 22f, 0.55f);
            float rapido = VehiculoController.CalcularAnguloGiro(1f, 22f, 32f, 22f, 0.55f);
            float sinEntrada = VehiculoController.CalcularAnguloGiro(0f, 10f, 32f, 22f, 0.55f);

            Assert.AreEqual(32f, lento, 0.01f);
            Assert.Less(rapido, lento, "El ángulo debe reducirse a alta velocidad.");
            Assert.AreEqual(32f * 0.45f, rapido, 0.01f);
            Assert.AreEqual(0f, sinEntrada, 0.001f);
        }

        [Test]
        public void Materiales_UsanShadersBuiltInYExisteMaterialBase()
        {
            Material baseMaterial = Resources.Load<Material>("Materiales/Base");
            Assert.IsNotNull(baseMaterial, "Falta Assets/Resources/Materiales/Base.mat.");

            Material material = Materiales.Crear(new Color(0.1f, 0.2f, 0.3f));
            Assert.IsNotNull(material);
            Assert.IsNotNull(material.shader);
            Assert.AreNotEqual("Hidden/InternalErrorShader", material.shader.name);
            Assert.AreEqual("Standard", material.shader.name);
        }
    }
}
