import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { buildWorld } from './world/WorldBuilder.js';
import { PlayerController } from './entities/PlayerController.js';
import { VehicleController } from './entities/VehicleController.js';
import { TrafficAndPeds } from './entities/TrafficAndPeds.js';
import { ThirdPersonCamera } from './entities/ThirdPersonCamera.js';
import { MapGPSController } from './ui/MapGPS.js';
import { HUDController } from './ui/HUD.js';

const TIME_PRESETS = [
  {
    key: 'day',
    label: 'Día Atacama',
    sky: 0x72b4eb,
    fog: 0xd9cbb5,
    fogNear: 280,
    fogFar: 2800,
    hemiSky: 0x9fd0ff,
    hemiGround: 0xc2a882,
    hemiInt: 0.78,
    sunColor: 0xfff6e5,
    sunInt: 1.25,
    sunPos: [260, 420, 180],
    lampHex: 0xcfc8b8,
  },
  {
    key: 'sunset',
    label: 'Atardecer Calameño',
    sky: 0xd97543,
    fog: 0xd47d50,
    fogNear: 190,
    fogFar: 2200,
    hemiSky: 0xff9e6d,
    hemiGround: 0x5c3c33,
    hemiInt: 0.68,
    sunColor: 0xff8547,
    sunInt: 1.35,
    sunPos: [-420, 95, 160],
    lampHex: 0xffe49e,
  },
  {
    key: 'night',
    label: 'Noche Urbana',
    sky: 0x0b1322,
    fog: 0x10192b,
    fogNear: 140,
    fogFar: 1750,
    hemiSky: 0x2a436e,
    hemiGround: 0x1a1816,
    hemiInt: 0.42,
    sunColor: 0x6b8ec2,
    sunInt: 0.35,
    sunPos: [-150, 280, -200],
    lampHex: 0xfff0b5,
  },
];

async function initCalamaCity() {
  const loadingEl = document.getElementById('loading-overlay');
  const loadingStatusEl = document.getElementById('loading-status');

  try {
    if (loadingStatusEl) loadingStatusEl.textContent = 'Cargando cartografía real de Calama (OSM)...';
    const resp = await fetch('./data/calama_map.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status} al cargar calama_map.json`);
    const mapData = await resp.json();

    if (loadingStatusEl) loadingStatusEl.textContent = 'Construyendo edificios, red vial e hitos 3D...';
    const canvas = document.getElementById('game-canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 5500);

    const hemiLight = new THREE.HemisphereLight(0x9fd0ff, 0xc2a882, 0.78);
    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.25);
    scene.add(hemiLight, sunLight);

    const gltfLoader = new GLTFLoader();
    const world = buildWorld(THREE, mapData, {
      chunkSize: 550,
      doc: document,
      gltfLoader,
    });
    scene.add(world.root);

    // Iluminación inicial del desierto de Atacama
    let timeIdx = 0;
    const applyTimePreset = (idx) => {
      timeIdx = ((idx % TIME_PRESETS.length) + TIME_PRESETS.length) % TIME_PRESETS.length;
      const p = TIME_PRESETS[timeIdx];
      scene.background = new THREE.Color(p.sky);
      scene.fog = new THREE.Fog(p.fog, p.fogNear, p.fogFar);
      hemiLight.color.setHex(p.hemiSky);
      hemiLight.groundColor.setHex(p.hemiGround);
      hemiLight.intensity = p.hemiInt;
      sunLight.color.setHex(p.sunColor);
      sunLight.intensity = p.sunInt;
      sunLight.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
      if (world.propsCtrl?.lampHeadMat) {
        world.propsCtrl.lampHeadMat.color.setHex(p.lampHex);
      }
      return p.label;
    };
    applyTimePreset(0);

    // Posición inicial en el borde sur de la Plaza 23 de Marzo mirando hacia la Catedral y el Odeón
    const startPos = world.colliderGrid.resolveCircle(-22.0, 14.0, 0.8);
    const player = new PlayerController(THREE, {
      x: startPos.x,
      z: startPos.z,
      yaw: 0.42,
    });
    scene.add(player.mesh);

    // Vehículos iniciales estacionados junto a la Plaza 23 de Marzo listos para conducir
    const pickupPos = world.colliderGrid.resolveCircle(-26.5, 16.5, 1.5);
    const heroPickup = new VehicleController(THREE, {
      variant: 'pickup_minera',
      x: pickupPos.x,
      z: pickupPos.z,
      yaw: 0.0,
    });
    const colectivoPos = world.colliderGrid.resolveCircle(-6.0, 25.0, 1.5);
    const heroColectivo = new VehicleController(THREE, {
      variant: 'colectivo',
      x: colectivoPos.x,
      z: colectivoPos.z,
      yaw: Math.PI * 0.5,
    });
    scene.add(heroPickup.mesh, heroColectivo.mesh);
    const parkedVehicles = [heroPickup, heroColectivo];

    // Tránsito IA sobre el grafo vial real y peatones cercanos
    const traffic = new TrafficAndPeds(THREE, mapData, world.propsCtrl, {
      maxCars: 18,
      maxPeds: 22,
    });
    scene.add(traffic.group);

    const camCtrl = new ThirdPersonCamera(camera);
    camCtrl.yaw = player.yaw;

    const gpsCtrl = new MapGPSController(mapData, { useOnlineTiles: false });

    const applyQuality = (level) => {
      if (level === 'low') {
        renderer.setPixelRatio(1.0);
        camera.far = 2600;
        traffic.group.visible = true;
      } else if (level === 'high') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
        camera.far = 6000;
      } else {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        camera.far = 4800;
      }
      camera.updateProjectionMatrix();
    };

    const getActiveFocus = () => {
      if (player.inVehicle) {
        return {
          x: player.inVehicle.x,
          y: 0,
          z: player.inVehicle.z,
          yaw: player.inVehicle.yaw,
          speed: player.inVehicle.speed,
          speedKmh: player.inVehicle.speedKmh,
          inVehicle: true,
          vehicle: player.inVehicle,
        };
      }
      return {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        speed: player.currentSpeed,
        speedKmh: player.currentSpeed * 3.6,
        inVehicle: false,
        vehicle: null,
      };
    };

    const hud = new HUDController(document, mapData, gpsCtrl, {
      onCycleTime: () => applyTimePreset(timeIdx + 1),
      onCycleCamera: () => camCtrl.cyclePreset(),
      onChangeQuality: (q) => applyQuality(q),
      getPlayerState: () => getActiveFocus(),
      onTeleport: (tx, tz) => {
        // Desplazar ligeramente hacia la calle más cercana si el centroide del hito es sólido
        const safe = world.colliderGrid.resolveCircle(tx, tz + 16, 1.6);
        player.teleportTo(safe.x, safe.z, world.colliderGrid);
      },
    });

    // Controles de teclado, ratón y botones táctiles
    const keys = new Set();
    const touchInput = { forward: 0, right: 0, sprint: false, jump: false };

    const tryToggleVehicle = () => {
      if (player.inVehicle) {
        player.exitVehicle(world.colliderGrid);
        return;
      }
      const near = traffic.findClosestEnterableVehicle(player.x, player.z, 4.6, parkedVehicles);
      if (near) {
        player.enterVehicle(near);
      }
    };

    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        if (e.code === 'Escape') hud.toggleMap(false);
        return;
      }
      keys.add(e.code);

      if (e.code === 'KeyE' || e.code === 'KeyF') {
        tryToggleVehicle();
      } else if (e.code === 'KeyM') {
        hud.toggleMap();
      } else if (e.code === 'KeyC') {
        camCtrl.cyclePreset();
      } else if (e.code === 'KeyT') {
        const lbl = applyTimePreset(timeIdx + 1);
        const btn = document.getElementById('btn-time');
        if (btn) btn.textContent = `Luz: ${lbl}`;
      } else if (e.code === 'Escape') {
        if (hud.mapOpen) hud.toggleMap(false);
        else hud.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      keys.delete(e.code);
    });

    // Rotación orbital suave arrastrando con el ratón sobre el canvas 3D
    let draggingLook = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      draggingLook = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!draggingLook || hud.mapOpen || hud.paused) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      camCtrl.rotateBy(dx * 0.0055, dy * 0.004);
    });
    window.addEventListener('mouseup', () => {
      draggingLook = false;
    });

    // Botones táctiles en móvil
    const bindHoldBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (ev) => { ev.preventDefault(); onDown(); };
      const end = (ev) => { ev.preventDefault(); onUp(); };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mouseup', onUp);
    };
    bindHoldBtn('touch-up', () => { touchInput.forward = 1; }, () => { touchInput.forward = 0; });
    bindHoldBtn('touch-down', () => { touchInput.forward = -1; }, () => { touchInput.forward = 0; });
    bindHoldBtn('touch-left', () => { touchInput.right = -1; }, () => { touchInput.right = 0; });
    bindHoldBtn('touch-right', () => { touchInput.right = 1; }, () => { touchInput.right = 0; });
    document.getElementById('touch-car')?.addEventListener('click', () => tryToggleVehicle());

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    if (loadingEl) loadingEl.hidden = true;

    // Bucle principal de simulación y renderizado
    let lastTime = performance.now();
    let elapsedSec = 0;
    let fpsFrames = 0;
    let fpsAccum = 0;
    let currentStreet = 'Plaza 23 de Marzo';
    let streetTimer = 0;
    let perfText = '';

    // Exponer handle de inspección para verificación y depuración
    window.__CALAMA_GAME__ = {
      scene,
      camera,
      renderer,
      world,
      player,
      heroPickup,
      heroColectivo,
      traffic,
      gpsCtrl,
      hud,
      applyTimePreset,
      tryToggleVehicle,
      getStats: () => ({
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        x: getActiveFocus().x,
        z: getActiveFocus().z,
        street: currentStreet,
        inVehicle: Boolean(player.inVehicle),
      }),
    };

    const animate = (now) => {
      requestAnimationFrame(animate);
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      if (!hud.paused) {
        elapsedSec += dt;

        const fwd = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
                  - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)
                  + touchInput.forward;
        const right = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0)
                    - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
                    + touchInput.right;
        const space = keys.has('Space');
        const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');

        if (player.inVehicle) {
          player.inVehicle.update(dt, {
            throttle: Math.max(-1, Math.min(1, fwd)),
            steer: Math.max(-1, Math.min(1, right)),
            handbrake: space,
          }, world.colliderGrid);
          player.update(dt, {}, camCtrl.yaw, world.colliderGrid);
        } else {
          player.update(dt, {
            forward: Math.max(-1, Math.min(1, fwd)),
            right: Math.max(-1, Math.min(1, right)),
            sprint,
            jump: space,
          }, camCtrl.yaw, world.colliderGrid);
        }

        // Actualizar vehículos estacionados si tenían inercia residual
        for (const pv of parkedVehicles) {
          if (!pv.isPlayerDriven && Math.abs(pv.speed) > 0.02) {
            pv.update(dt, { throttle: 0, steer: 0, handbrake: true }, world.colliderGrid);
          }
        }

        const focus = getActiveFocus();
        world.propsCtrl.updateSignalPhase(elapsedSec);
        traffic.update(dt, focus.x, focus.z, elapsedSec, world.colliderGrid);
        camCtrl.update(dt, focus);

        streetTimer -= dt;
        if (streetTimer <= 0) {
          streetTimer = 0.35;
          const nearRd = world.colliderGrid.findNearestRoad(focus.x, focus.z, 42);
          if (Math.hypot(focus.x + 17.7, focus.z + 2.1) < 42) {
            currentStreet = 'Plaza 23 de Marzo';
          } else if (nearRd?.n) {
            currentStreet = nearRd.n;
          } else {
            currentStreet = 'Sector Urbano de Calama';
          }
        }

        const nearbyVehicle = player.inVehicle
          ? null
          : traffic.findClosestEnterableVehicle(player.x, player.z, 4.6, parkedVehicles);

        fpsFrames++;
        fpsAccum += dt;
        if (fpsAccum >= 0.5) {
          const fps = Math.round(fpsFrames / fpsAccum);
          perfText = `${fps} FPS · ${renderer.info.render.calls} draws`;
          fpsFrames = 0;
          fpsAccum = 0;
        }

        hud.update({
          ...focus,
          streetName: currentStreet,
          nearbyVehicle,
          perfText,
        });
      }

      renderer.render(scene, camera);
    };

    requestAnimationFrame(animate);
  } catch (err) {
    console.error('Error iniciando Calama City Web:', err);
    if (loadingStatusEl) {
      loadingStatusEl.textContent = `Error al iniciar: ${err.message}`;
    }
  }
}

initCalamaCity();
