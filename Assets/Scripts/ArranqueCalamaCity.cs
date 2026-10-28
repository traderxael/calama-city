using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;
using CalamaCity.Camaras;
using CalamaCity.Ciudad;
using CalamaCity.Player;
using CalamaCity.UI;
using CalamaCity.Vehiculo;

namespace CalamaCity.Core
{
    /// <summary>
    /// Construye el juego completo en runtime: ciudad, jugador, coche, cámara y HUD.
    /// La escena generada solo contiene este componente.
    /// </summary>
    public class ArranqueCalamaCity : MonoBehaviour
    {
        [Header("Configuración")]
        public int semilla = 20261028;
        public Vector3 posicionJugador = new Vector3(0f, 0.2f, 26f);
        public Vector3 posicionCoche = new Vector3(3.5f, 0.05f, 33f);

        private bool construido;
        private static Font fuente;
        private static Sprite spriteBlanco;

        void Awake()
        {
            Construir();
        }

        public void Construir()
        {
            if (construido) return;
            construido = true;

            ConfigurarRender();
            CrearEntorno();
            CiudadManager ciudad = CrearCiudad();
            GameObject jugador = CrearJugador();
            GameObject coche = CrearCoche();
            CamaraTerceraPersona camara = CrearCamara(jugador.transform);

            GestorVehiculo gestor = jugador.GetComponent<GestorVehiculo>();
            gestor.camara = camara;

            GameObject panelPausa = CrearHUD(coche.GetComponent<VehiculoController>(), jugador.transform);

            GameObject sistemas = new GameObject("Sistemas");
            GameManager gameManager = sistemas.AddComponent<GameManager>();
            gameManager.personaje = jugador.GetComponent<PersonajeController>();
            gameManager.panelPausa = panelPausa;

            ciudad.generarAlIniciar = true;
            ciudad.semilla = semilla;
        }

        void ConfigurarRender()
        {
            QualitySettings.SetQualityLevel(1, true);
            QualitySettings.shadows = ShadowQuality.Disable;
            QualitySettings.shadowDistance = 30f;
            QualitySettings.vSyncCount = 1;

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.58f, 0.62f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(0.75f, 0.82f, 0.9f);
            RenderSettings.fogStartDistance = 120f;
            RenderSettings.fogEndDistance = 450f;

            GameObject solGO = new GameObject("Sol");
            Light sol = solGO.AddComponent<Light>();
            sol.type = LightType.Directional;
            sol.color = new Color(1f, 0.96f, 0.9f);
            sol.intensity = 1.1f;
            sol.shadows = LightShadows.None;
            solGO.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
        }

        void CrearEntorno()
        {
            GameObject entorno = new GameObject("Entorno");

            CrearCaja("SueloDesierto", entorno.transform, new Vector3(0f, -0.5f, 100f),
                new Vector3(600f, 1f, 600f), new Color(0.76f, 0.68f, 0.55f), Quaternion.identity, true);

            for (int i = 0; i < 10; i++)
            {
                float angulo = i * 36f * Mathf.Deg2Rad;
                float radio = 330f + (i % 3) * 25f;
                float altura = 45f + (i % 4) * 12f;
                Vector3 posicion = new Vector3(
                    Mathf.Cos(angulo) * radio,
                    altura / 2f - 4f,
                    100f + Mathf.Sin(angulo) * radio);

                CrearCaja($"Cordillera_{i}", entorno.transform, posicion,
                    new Vector3(110f + (i % 2) * 40f, altura, 90f),
                    new Color(0.42f, 0.36f, 0.32f),
                    Quaternion.Euler(0f, i * 36f + 20f, 0f), false);
            }
        }

        CiudadManager CrearCiudad()
        {
            GameObject raiz = new GameObject("Ciudad");

            GeneradorPlaza23DeMarzo plaza = AgregarGenerador<GeneradorPlaza23DeMarzo>(raiz.transform, "Plaza23DeMarzo", Vector3.zero);
            GeneradorCalles calles = AgregarGenerador<GeneradorCalles>(raiz.transform, "CallePrincipal", new Vector3(0f, 0f, 135f));
            GeneradorEdificios manzanaIzquierda = AgregarGenerador<GeneradorEdificios>(raiz.transform, "ManzanaIzquierda", new Vector3(-30f, 0f, 135f));
            GeneradorEdificios manzanaDerecha = AgregarGenerador<GeneradorEdificios>(raiz.transform, "ManzanaDerecha", new Vector3(30f, 0f, 135f));

            manzanaIzquierda.edificiosEnX = 2;
            manzanaIzquierda.edificiosEnZ = 5;
            manzanaDerecha.edificiosEnX = 2;
            manzanaDerecha.edificiosEnZ = 5;

            GameObject sistemas = new GameObject("SistemasCiudad");
            CiudadManager ciudad = sistemas.AddComponent<CiudadManager>();
            ciudad.generadorPlaza = plaza;
            ciudad.generadorCalles = calles;
            ciudad.generadoresEdificios = new[] { manzanaIzquierda, manzanaDerecha };
            return ciudad;
        }

        T AgregarGenerador<T>(Transform padre, string nombre, Vector3 posicion) where T : Component
        {
            GameObject go = new GameObject(nombre);
            go.transform.SetParent(padre, false);
            go.transform.localPosition = posicion;
            T generador = go.AddComponent<T>();

            if (generador is GeneradorPlaza23DeMarzo plaza)
                plaza.autoGenerar = false;
            else if (generador is GeneradorCalles calles)
                calles.autoGenerar = false;
            else if (generador is GeneradorEdificios edificios)
                edificios.autoGenerar = false;

            return generador;
        }

        GameObject CrearJugador()
        {
            GameObject jugador = new GameObject("Jugador");
            jugador.transform.position = posicionJugador;

            CharacterController controlador = jugador.AddComponent<CharacterController>();
            controlador.height = 2f;
            controlador.radius = 0.45f;
            controlador.center = new Vector3(0f, 1f, 0f);
            controlador.slopeLimit = 45f;
            controlador.stepOffset = 0.35f;

            jugador.AddComponent<PersonajeController>();
            jugador.AddComponent<GestorVehiculo>();

            GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "Visual";
            visual.transform.SetParent(jugador.transform, false);
            visual.transform.localPosition = new Vector3(0f, 1f, 0f);
            visual.transform.localScale = new Vector3(0.9f, 1f, 0.9f);

            Renderer renderer = visual.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(new Color(0.2f, 0.45f, 0.85f));

            Utilidades.Destruir(visual.GetComponent<Collider>());
            return jugador;
        }

        GameObject CrearCoche()
        {
            GameObject coche = new GameObject("Coche");
            coche.transform.position = posicionCoche;
            coche.AddComponent<GeneradorCocheSimple>();
            return coche;
        }

        CamaraTerceraPersona CrearCamara(Transform jugador)
        {
            GameObject camaraGO = new GameObject("CamaraPrincipal");
            camaraGO.tag = "MainCamera";
            camaraGO.transform.position = jugador.position - jugador.forward * 6f + Vector3.up * 2.5f;

            Camera camara = camaraGO.AddComponent<Camera>();
            camara.clearFlags = CameraClearFlags.SolidColor;
            camara.backgroundColor = new Color(0.55f, 0.75f, 0.92f);
            camara.nearClipPlane = 0.1f;
            camara.farClipPlane = 900f;
            camaraGO.AddComponent<AudioListener>();

            CamaraTerceraPersona seguimiento = camaraGO.AddComponent<CamaraTerceraPersona>();
            seguimiento.objetivo = jugador;
            seguimiento.distancia = 6f;
            seguimiento.altura = 2.5f;
            return seguimiento;
        }

        GameObject CrearHUD(VehiculoController vehiculo, Transform jugador)
        {
            GameObject canvasGO = new GameObject("HUD");
            Canvas canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            CanvasScaler scaler = canvasGO.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;

            Text titulo = CrearTexto(canvasGO.transform, "Titulo", "CALAMA CITY", 26, TextAnchor.UpperCenter);
            Anclar(titulo.rectTransform, new Vector2(0.5f, 1f), new Vector2(0.5f, 1f), new Vector2(0f, -26f), new Vector2(500f, 32f));
            titulo.color = new Color(1f, 1f, 1f, 0.65f);

            Text vidaEtiqueta = CrearTexto(canvasGO.transform, "VidaEtiqueta", "VIDA", 22, TextAnchor.MiddleLeft);
            Anclar(vidaEtiqueta.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(36f, -30f), new Vector2(240f, 26f));

            Image vidaFondo = CrearImagen(canvasGO.transform, "VidaFondo", new Color(0.08f, 0.08f, 0.08f, 0.8f));
            Anclar(vidaFondo.rectTransform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(36f, -60f), new Vector2(240f, 18f));

            Image vidaRelleno = CrearImagen(vidaFondo.transform, "VidaRelleno", new Color(0.35f, 0.85f, 0.4f, 1f));
            RectTransform rellenoRT = vidaRelleno.rectTransform;
            rellenoRT.anchorMin = Vector2.zero;
            rellenoRT.anchorMax = Vector2.one;
            rellenoRT.offsetMin = new Vector2(2f, 2f);
            rellenoRT.offsetMax = new Vector2(-2f, -2f);
            vidaRelleno.type = Image.Type.Filled;
            vidaRelleno.fillMethod = Image.FillMethod.Horizontal;
            vidaRelleno.fillOrigin = 0;
            vidaRelleno.fillAmount = 1f;

            Text velocidad = CrearTexto(canvasGO.transform, "Velocidad", "0 KM/H", 44, TextAnchor.LowerRight);
            Anclar(velocidad.rectTransform, new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-36f, 30f), new Vector2(420f, 60f));

            Text ayuda = CrearTexto(canvasGO.transform, "Ayuda",
                "WASD mover · Shift correr · Espacio saltar · E coche · Esc pausa", 20, TextAnchor.LowerLeft);
            Anclar(ayuda.rectTransform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(36f, 30f), new Vector2(900f, 26f));
            ayuda.color = new Color(1f, 1f, 1f, 0.75f);

            Image mapaFondo = CrearImagen(canvasGO.transform, "Minimapa", new Color(0f, 0f, 0f, 0.55f));
            Anclar(mapaFondo.rectTransform, new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-36f, -36f), new Vector2(200f, 200f));

            Image icono = CrearImagen(mapaFondo.transform, "IconoJugador", new Color(1f, 0.85f, 0.2f, 1f));
            Anclar(icono.rectTransform, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(12f, 12f));

            Minimapa minimapa = mapaFondo.gameObject.AddComponent<Minimapa>();
            minimapa.fondoMinimapa = mapaFondo;
            minimapa.iconoJugador = icono;
            minimapa.jugador = jugador;
            minimapa.tamañoPantalla = 200f;

            HUDVehiculo hud = canvasGO.AddComponent<HUDVehiculo>();
            hud.textoVelocidad = velocidad;
            hud.barraVida = vidaRelleno;
            hud.vehiculo = vehiculo;

            Image pausaFondo = CrearImagen(canvasGO.transform, "PanelPausa", new Color(0f, 0f, 0f, 0.7f));
            RectTransform pausaRT = pausaFondo.rectTransform;
            pausaRT.anchorMin = Vector2.zero;
            pausaRT.anchorMax = Vector2.one;
            pausaRT.offsetMin = Vector2.zero;
            pausaRT.offsetMax = Vector2.zero;

            Text pausaTexto = CrearTexto(pausaFondo.transform, "TextoPausa", "PAUSA\nESC para continuar", 60, TextAnchor.MiddleCenter);
            RectTransform pausaTextoRT = pausaTexto.rectTransform;
            pausaTextoRT.anchorMin = Vector2.zero;
            pausaTextoRT.anchorMax = Vector2.one;
            pausaTextoRT.offsetMin = Vector2.zero;
            pausaTextoRT.offsetMax = Vector2.zero;

            pausaFondo.gameObject.SetActive(false);
            return pausaFondo.gameObject;
        }

        void CrearCaja(string nombre, Transform padre, Vector3 posicion, Vector3 escala, Color color, Quaternion rotacion, bool conCollider)
        {
            GameObject caja = GameObject.CreatePrimitive(PrimitiveType.Cube);
            caja.name = nombre;
            caja.transform.SetParent(padre, false);
            caja.transform.position = posicion;
            caja.transform.localScale = escala;
            caja.transform.rotation = rotacion;

            Renderer renderer = caja.GetComponent<Renderer>();
            if (renderer != null)
                renderer.sharedMaterial = Materiales.Crear(color);

            if (!conCollider)
                Utilidades.Destruir(caja.GetComponent<Collider>());
        }

        static Text CrearTexto(Transform padre, string nombre, string contenido, int tamaño, TextAnchor alineacion)
        {
            GameObject go = new GameObject(nombre);
            go.transform.SetParent(padre, false);

            Text texto = go.AddComponent<Text>();
            texto.font = ObtenerFuente();
            texto.text = contenido;
            texto.fontSize = tamaño;
            texto.alignment = alineacion;
            texto.color = Color.white;
            texto.horizontalOverflow = HorizontalWrapMode.Overflow;
            texto.verticalOverflow = VerticalWrapMode.Overflow;
            return texto;
        }

        static Image CrearImagen(Transform padre, string nombre, Color color)
        {
            GameObject go = new GameObject(nombre);
            go.transform.SetParent(padre, false);

            Image imagen = go.AddComponent<Image>();
            imagen.sprite = ObtenerSpriteBlanco();
            imagen.color = color;
            return imagen;
        }

        static void Anclar(RectTransform rect, Vector2 anclaMin, Vector2 anclaMax, Vector2 posicion, Vector2 tamaño)
        {
            rect.anchorMin = anclaMin;
            rect.anchorMax = anclaMax;
            rect.pivot = anclaMin;
            rect.anchoredPosition = posicion;
            rect.sizeDelta = tamaño;
        }

        static Font ObtenerFuente()
        {
            if (fuente != null) return fuente;

            fuente = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            if (fuente == null)
                fuente = Font.CreateDynamicFontFromOSFont("Arial", 16);
            return fuente;
        }

        static Sprite ObtenerSpriteBlanco()
        {
            if (spriteBlanco != null) return spriteBlanco;

            Texture2D textura = new Texture2D(1, 1, TextureFormat.RGBA32, false);
            textura.SetPixel(0, 0, Color.white);
            textura.Apply();
            textura.hideFlags = HideFlags.HideAndDontSave;

            spriteBlanco = Sprite.Create(textura, new Rect(0f, 0f, 1f, 1f), new Vector2(0.5f, 0.5f), 100f);
            return spriteBlanco;
        }
    }
}
