import { searchMap } from './MapGPS.js';

/**
 * Controlador de interfaz de usuario (HUD urbano, velocímetro, avisos contextuales,
 * panel de mapa GPS interactivo con buscador/viaje rápido y menú de pausa/créditos).
 */

const VARIANT_LABELS = {
  pickup_minera: 'Camioneta Minera 4x4',
  colectivo: 'Colectivo Urbano Calama',
  sedan: 'Automóvil Urbano',
};

function compassLabel(yaw) {
  // yaw = 0 => Norte (-Z), yaw = -pi/2 => Este (+X), yaw = pi => Sur (+Z), yaw = +pi/2 => Oeste (-X)
  const deg = (((-yaw * 180) / Math.PI) % 360 + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8];
}

export class HUDController {
  constructor(doc, mapData, gpsCtrl, callbacks = {}) {
    this.doc = doc;
    this.mapData = mapData;
    this.gps = gpsCtrl;
    this.callbacks = callbacks;

    this.streetEl = doc.getElementById('hud-street');
    this.compassEl = doc.getElementById('hud-compass');
    this.gpsBannerEl = doc.getElementById('hud-gps-banner');
    this.speedValEl = doc.getElementById('hud-speed-val');
    this.modeBadgeEl = doc.getElementById('hud-mode-badge');
    this.promptEl = doc.getElementById('hud-prompt');
    this.fpsEl = doc.getElementById('hud-perf');

    this.minimapCanvas = doc.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    this.mapModalEl = doc.getElementById('map-modal');
    this.fullMapCanvas = doc.getElementById('fullmap-canvas');
    this.fullMapCtx = this.fullMapCanvas ? this.fullMapCanvas.getContext('2d') : null;
    this.searchInputEl = doc.getElementById('map-search-input');
    this.searchResultsEl = doc.getElementById('map-search-results');
    this.tilesToggleBtn = doc.getElementById('btn-toggle-tiles');
    this.clearRouteBtn = doc.getElementById('btn-clear-route');

    this.pauseModalEl = doc.getElementById('pause-modal');
    this.timeBtn = doc.getElementById('btn-time');
    this.camBtn = doc.getElementById('btn-camera');
    this.mapOpenBtn = doc.getElementById('btn-open-map');
    this.qualitySelect = doc.getElementById('select-quality');

    this.mapOpen = false;
    this.paused = false;
    this._draggingMap = false;
    this._dragStart = { x: 0, y: 0, cx: 0, cz: 0 };

    this._bindEvents();
    this._populateSearchResults('');
  }

  _bindEvents() {
    const d = this.doc;

    this.mapOpenBtn?.addEventListener('click', () => this.toggleMap());
    this.minimapCanvas?.addEventListener('click', () => this.toggleMap());
    d.getElementById('btn-close-map')?.addEventListener('click', () => this.toggleMap(false));

    this.timeBtn?.addEventListener('click', () => {
      const label = this.callbacks.onCycleTime?.();
      if (label && this.timeBtn) this.timeBtn.textContent = `Luz: ${label}`;
    });

    this.camBtn?.addEventListener('click', () => {
      this.callbacks.onCycleCamera?.();
    });

    this.qualitySelect?.addEventListener('change', (e) => {
      this.callbacks.onChangeQuality?.(e.target.value);
    });

    d.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause(false));

    this.searchInputEl?.addEventListener('input', (e) => {
      this._populateSearchResults(e.target.value);
    });

    this.tilesToggleBtn?.addEventListener('click', () => {
      this.gps.useOnlineTiles = !this.gps.useOnlineTiles;
      this.tilesToggleBtn.setAttribute('aria-pressed', String(this.gps.useOnlineTiles));
      this.tilesToggleBtn.textContent = this.gps.useOnlineTiles ? 'Teselas OSM: Activas' : 'Teselas OSM: Offline';
      this.renderFullMap();
    });

    this.clearRouteBtn?.addEventListener('click', () => {
      this.gps.clearDestination();
      this.renderFullMap();
    });

    d.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.gps.metersPerPixel = Math.max(0.6, this.gps.metersPerPixel * 0.72);
      this.renderFullMap();
    });

    d.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.gps.metersPerPixel = Math.min(11.0, this.gps.metersPerPixel * 1.38);
      this.renderFullMap();
    });

    if (this.fullMapCanvas) {
      this.fullMapCanvas.addEventListener('mousedown', (e) => {
        this._draggingMap = true;
        this._movedDuringDrag = false;
        this._dragStart = { x: e.clientX, y: e.clientY, cx: this.gps.centerX, cz: this.gps.centerZ };
      });

      window.addEventListener('mousemove', (e) => {
        if (!this._draggingMap) return;
        const dx = e.clientX - this._dragStart.x;
        const dy = e.clientY - this._dragStart.y;
        if (Math.hypot(dx, dy) > 4) this._movedDuringDrag = true;
        this.gps.centerX = this._dragStart.cx - dx * this.gps.metersPerPixel;
        this.gps.centerZ = this._dragStart.cz - dy * this.gps.metersPerPixel;
        this.renderFullMap();
      });

      window.addEventListener('mouseup', (e) => {
        if (!this._draggingMap) return;
        this._draggingMap = false;
        if (!this._movedDuringDrag) {
          // Clic simple en el mapa: marcar ruta GPS al punto clicado
          const rect = this.fullMapCanvas.getBoundingClientRect();
          const sx = ((e.clientX - rect.left) / rect.width) * this.fullMapCanvas.width;
          const sy = ((e.clientY - rect.top) / rect.height) * this.fullMapCanvas.height;
          const wx = this.gps.centerX + (sx - this.fullMapCanvas.width * 0.5) * this.gps.metersPerPixel;
          const wz = this.gps.centerZ + (sy - this.fullMapCanvas.height * 0.5) * this.gps.metersPerPixel;
          const pState = this.callbacks.getPlayerState?.() || { x: 0, z: 0 };
          this.gps.setDestination(wx, wz, 'Punto marcado en mapa', pState.x, pState.z);
          this.renderFullMap();
        }
      });

      this.fullMapCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.18 : 0.84;
        this.gps.metersPerPixel = Math.max(0.55, Math.min(12.0, this.gps.metersPerPixel * factor));
        this.renderFullMap();
      }, { passive: false });
    }
  }

  _populateSearchResults(query) {
    if (!this.searchResultsEl) return;
    const matches = searchMap(this.mapData, query, 12);
    this.searchResultsEl.innerHTML = '';

    for (const item of matches) {
      const row = this.doc.createElement('div');
      row.className = 'search-item';

      const info = this.doc.createElement('div');
      info.className = 'search-item-info';
      const title = this.doc.createElement('span');
      title.className = 'search-item-title';
      title.textContent = item.label;
      const sub = this.doc.createElement('span');
      sub.className = 'search-item-sub';
      sub.textContent = item.sub;
      info.append(title, sub);

      const actions = this.doc.createElement('div');
      actions.className = 'search-item-actions';

      const routeBtn = this.doc.createElement('button');
      routeBtn.type = 'button';
      routeBtn.className = 'btn-mini';
      routeBtn.textContent = 'Ruta GPS';
      routeBtn.addEventListener('click', () => {
        const pState = this.callbacks.getPlayerState?.() || { x: 0, z: 0 };
        this.gps.setDestination(item.x, item.z, item.label, pState.x, pState.z);
        this.gps.centerX = item.x;
        this.gps.centerZ = item.z;
        this.renderFullMap();
      });

      const goBtn = this.doc.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'btn-mini btn-accent';
      goBtn.textContent = 'Ir ahora';
      goBtn.addEventListener('click', () => {
        this.callbacks.onTeleport?.(item.x, item.z, item.label);
        this.toggleMap(false);
      });

      actions.append(routeBtn, goBtn);
      row.append(info, actions);
      this.searchResultsEl.appendChild(row);
    }
  }

  toggleMap(forceState = null) {
    this.mapOpen = forceState !== null ? forceState : !this.mapOpen;
    if (this.mapModalEl) {
      this.mapModalEl.hidden = !this.mapOpen;
    }
    if (this.mapOpen) {
      const pState = this.callbacks.getPlayerState?.() || { x: 0, z: 0 };
      this.gps.centerX = pState.x;
      this.gps.centerZ = pState.z;
      this._resizeFullMapCanvas();
      this.renderFullMap();
    }
  }

  togglePause(forceState = null) {
    this.paused = forceState !== null ? forceState : !this.paused;
    if (this.pauseModalEl) {
      this.pauseModalEl.hidden = !this.paused;
    }
    return this.paused;
  }

  _resizeFullMapCanvas() {
    if (!this.fullMapCanvas) return;
    const rect = this.fullMapCanvas.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) {
      this.fullMapCanvas.width = Math.round(rect.width);
      this.fullMapCanvas.height = Math.round(rect.height);
    }
  }

  renderFullMap() {
    if (!this.mapOpen || !this.fullMapCtx || !this.fullMapCanvas) return;
    const pState = this.callbacks.getPlayerState?.() || { x: 0, z: 0, yaw: 0 };
    this.gps.renderToCanvas(this.fullMapCtx, this.fullMapCanvas.width, this.fullMapCanvas.height, {
      centerX: this.gps.centerX,
      centerZ: this.gps.centerZ,
      metersPerPixel: this.gps.metersPerPixel,
      playerX: pState.x,
      playerZ: pState.z,
      playerYaw: pState.yaw,
      showBuildings: true,
      showLabels: true,
      allowTiles: true,
    });
  }

  update(state) {
    if (this.streetEl) {
      this.streetEl.textContent = state.streetName || 'Centro de Calama';
    }
    if (this.compassEl) {
      this.compassEl.textContent = compassLabel(state.yaw || 0);
    }

    if (this.gpsBannerEl) {
      if (this.gps.destination) {
        const dist = Math.round(Math.hypot(this.gps.destination.x - state.x, this.gps.destination.z - state.z));
        if (dist < 18) {
          this.gps.clearDestination();
          this.gpsBannerEl.hidden = true;
        } else {
          this.gpsBannerEl.hidden = false;
          this.gpsBannerEl.textContent = `GPS → ${this.gps.destination.label} (${dist} m)`;
        }
      } else {
        this.gpsBannerEl.hidden = true;
      }
    }

    if (this.speedValEl) {
      const kmh = Math.round(state.speedKmh || 0);
      this.speedValEl.textContent = String(kmh);
    }

    if (this.modeBadgeEl) {
      this.modeBadgeEl.textContent = state.vehicle
        ? (VARIANT_LABELS[state.vehicle.variant] || 'Vehículo')
        : 'Explorando a pie';
    }

    if (this.promptEl) {
      if (!state.vehicle && state.nearbyVehicle) {
        const vName = VARIANT_LABELS[state.nearbyVehicle.variant] || 'vehículo';
        this.promptEl.hidden = false;
        this.promptEl.textContent = `Presiona E para conducir ${vName}`;
      } else {
        this.promptEl.hidden = true;
      }
    }

    if (this.fpsEl && state.perfText) {
      this.fpsEl.textContent = state.perfText;
    }

    // Actualizar minimapa en esquina
    if (this.minimapCtx && this.minimapCanvas) {
      const mpp = state.vehicle ? 2.4 : 1.55;
      this.gps.renderToCanvas(this.minimapCtx, this.minimapCanvas.width, this.minimapCanvas.height, {
        centerX: state.x,
        centerZ: state.z,
        metersPerPixel: mpp,
        playerX: state.x,
        playerZ: state.z,
        playerYaw: state.yaw,
        showBuildings: true,
        showLabels: false,
        allowTiles: false,
      });
    }

    if (this.mapOpen) {
      this.renderFullMap();
    }
  }
}
