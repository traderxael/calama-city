/**
 * Sistema cartográfico y GPS de alta precisión para Calama City:
 * - Proyección exacta metros <-> (lat, lon) <-> teselas Web Mercator (OpenStreetMap)
 * - Buscador insensible a tildes sobre hitos, calles reales y 309 POIs
 * - Ruteo A* sobre el grafo vial real para trazar rutas GPS en minimapa y mapa completo
 * - Renderizador vectorial Canvas 2D con degradación limpia sin internet (offline-first)
 */

export const ORIGIN_LAT = -22.4624;
export const ORIGIN_LON = -68.9272;
const M_PER_DEG_LAT = 110574.0;
const M_PER_DEG_LON = 111320.0 * Math.cos((ORIGIN_LAT * Math.PI) / 180);

export function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function worldToLatLon(x, z, originLat = ORIGIN_LAT, originLon = ORIGIN_LON) {
  const lon = originLon + x / M_PER_DEG_LON;
  const lat = originLat - z / M_PER_DEG_LAT;
  return { lat, lon };
}

export function latLonToWorld(lat, lon, originLat = ORIGIN_LAT, originLon = ORIGIN_LON) {
  const x = (lon - originLon) * M_PER_DEG_LON;
  const z = -(lat - originLat) * M_PER_DEG_LAT;
  return { x, z };
}

export function worldToTile(x, z, zoom = 16, originLat = ORIGIN_LAT, originLon = ORIGIN_LON) {
  const { lat, lon } = worldToLatLon(x, z, originLat, originLon);
  const n = Math.pow(2, zoom);
  const latRad = (lat * Math.PI) / 180;
  const xFloat = ((lon + 180) / 360) * n;
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xFloat);
  const ty = Math.floor(yFloat);
  const px = (xFloat - tx) * 256;
  const py = (yFloat - ty) * 256;
  return { tx, ty, px, py, zoom };
}

export function tileToWorldTopLeft(tx, ty, zoom = 16, originLat = ORIGIN_LAT, originLon = ORIGIN_LON) {
  const n = Math.pow(2, zoom);
  const lon = (tx / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)));
  const lat = (latRad * 180) / Math.PI;
  return latLonToWorld(lat, lon, originLat, originLon);
}

export function searchMap(mapData, query, limit = 16) {
  const q = normalizeText(query);
  if (!q) {
    // Sin texto: devolver los principales hitos de Calama para acceso rápido
    const seen = new Set();
    const defaults = [];
    for (const lm of mapData.landmarks || []) {
      if (seen.has(lm.name)) continue;
      seen.add(lm.name);
      defaults.push({ label: lm.name, kind: 'landmark', sub: 'Hito de Calama', x: lm.cx, z: lm.cz });
    }
    return defaults.slice(0, limit);
  }

  const results = [];
  const seenLabels = new Set();

  // 1. Hitos emblemáticos
  for (const lm of mapData.landmarks || []) {
    const norm = normalizeText(lm.name);
    if (norm.includes(q) || normalizeText(lm.kind).includes(q)) {
      const key = `lm:${norm}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        results.push({ label: lm.name, kind: 'landmark', sub: 'Hito 3D', x: lm.cx, z: lm.cz });
      }
    }
  }

  // 2. Calles con nombre real (escoger el tramo más cercano a Plaza 23 de Marzo)
  const bestStreetByNorm = new Map();
  for (const rd of mapData.roads || []) {
    if (!rd.n) continue;
    const norm = normalizeText(rd.n);
    if (!norm.includes(q)) continue;
    const midIdx = Math.floor(rd.p.length / 4) * 2;
    const mx = rd.p[midIdx], mz = rd.p[midIdx + 1];
    const dist = Math.hypot(mx, mz);
    const prev = bestStreetByNorm.get(norm);
    if (!prev || dist < prev.dist) {
      bestStreetByNorm.set(norm, { label: rd.n, kind: 'street', sub: 'Calle / Avenida', x: mx, z: mz, dist });
    }
  }
  for (const st of bestStreetByNorm.values()) {
    results.push({ label: st.label, kind: st.kind, sub: st.sub, x: st.x, z: st.z });
  }

  // 3. POIs comerciales y servicios reales
  for (const poi of mapData.pois || []) {
    const norm = normalizeText(poi.n);
    if (norm.includes(q) || normalizeText(poi.c).includes(q)) {
      const key = `poi:${norm}:${Math.round(poi.x / 30)}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        results.push({ label: poi.n, kind: 'poi', sub: poi.c, x: poi.x, z: poi.z });
      }
    }
    if (results.length >= limit * 2) break;
  }

  return results.slice(0, limit);
}

/**
 * Calcula la polilínea GPS más corta sobre el grafo vial real usando A*.
 * Permite aristas inversas con penalización suave (x2.2) para garantizar conectividad total
 * incluso si el destino queda junto a un pasaje o calle de sentido único.
 */
export function computeRoutePolyline(graph, fromX, fromZ, toX, toZ) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  const nCount = Math.floor(nodes.length / 2);
  if (nCount < 2 || !edges.length) {
    return [[fromX, fromZ], [toX, toZ]];
  }

  let startNode = 0;
  let goalNode = 0;
  let bestStartD = Infinity;
  let bestGoalD = Infinity;

  for (let i = 0; i < nCount; i++) {
    const nx = nodes[2 * i], nz = nodes[2 * i + 1];
    const ds = (nx - fromX) * (nx - fromX) + (nz - fromZ) * (nz - fromZ);
    if (ds < bestStartD) {
      bestStartD = ds;
      startNode = i;
    }
    const dg = (nx - toX) * (nx - toX) + (nz - toZ) * (nz - toZ);
    if (dg < bestGoalD) {
      bestGoalD = dg;
      goalNode = i;
    }
  }

  if (startNode === goalNode) {
    return [[nodes[2 * startNode], nodes[2 * startNode + 1]], [toX, toZ]];
  }

  const adj = Array.from({ length: nCount }, () => []);
  for (let i = 0; i < edges.length; i++) {
    const [u, v] = edges[i];
    const len = Math.hypot(nodes[2 * v] - nodes[2 * u], nodes[2 * v + 1] - nodes[2 * u + 1]);
    adj[u].push({ to: v, cost: len });
    adj[v].push({ to: u, cost: len * 2.2 });
  }

  const gScore = new Float64Array(nCount).fill(Infinity);
  const fScore = new Float64Array(nCount).fill(Infinity);
  const cameFrom = new Int32Array(nCount).fill(-1);
  const closed = new Uint8Array(nCount);

  const gx = nodes[2 * goalNode], gz = nodes[2 * goalNode + 1];
  gScore[startNode] = 0;
  fScore[startNode] = Math.hypot(nodes[2 * startNode] - gx, nodes[2 * startNode + 1] - gz);

  // Cola abierta simple (nCount ~4.294 => rapidísimo en < 3 ms)
  const open = [startNode];

  while (open.length > 0) {
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < fScore[open[bestIdx]]) bestIdx = i;
    }
    const current = open[bestIdx];
    open[bestIdx] = open[open.length - 1];
    open.pop();

    if (current === goalNode) break;
    if (closed[current]) continue;
    closed[current] = 1;

    const neighbors = adj[current];
    for (let i = 0; i < neighbors.length; i++) {
      const { to, cost } = neighbors[i];
      if (closed[to]) continue;
      const tentative = gScore[current] + cost;
      if (tentative < gScore[to]) {
        cameFrom[to] = current;
        gScore[to] = tentative;
        fScore[to] = tentative + Math.hypot(nodes[2 * to] - gx, nodes[2 * to + 1] - gz);
        open.push(to);
      }
    }
  }

  if (cameFrom[goalNode] === -1) {
    return [[fromX, fromZ], [toX, toZ]];
  }

  const path = [];
  let cur = goalNode;
  while (cur !== -1) {
    path.push([nodes[2 * cur], nodes[2 * cur + 1]]);
    cur = cameFrom[cur];
  }
  path.reverse();
  path.push([toX, toZ]);
  return path;
}

export class MapGPSController {
  constructor(mapData, opts = {}) {
    this.mapData = mapData;
    this.useOnlineTiles = Boolean(opts.useOnlineTiles);
    this.tileFallbackActive = false;
    this.tileCache = new Map();
    this.route = null;
    this.destination = null;

    // Pan/zoom del mapa pantalla completa
    this.centerX = 0;
    this.centerZ = 0;
    this.metersPerPixel = 2.6;

    this.imageLoader = opts.imageLoader || ((url, onLoad, onError) => {
      if (typeof Image === 'undefined') {
        onError(new Error('No Image constructor'));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => onLoad(img);
      img.onerror = (err) => onError(err);
      img.src = url;
    });
  }

  setDestination(x, z, label = 'Destino marcado', fromX = 0, fromZ = 0) {
    this.destination = { x, z, label };
    this.route = computeRoutePolyline(this.mapData.graph, fromX, fromZ, x, z);
    return this.route;
  }

  clearDestination() {
    this.destination = null;
    this.route = null;
  }

  requestTile(tx, ty, zoom = 15) {
    const key = `${zoom}/${tx}/${ty}`;
    if (this.tileCache.has(key)) return this.tileCache.get(key);

    const record = { status: 'loading', img: null };
    this.tileCache.set(key, record);
    const url = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;

    try {
      this.imageLoader(
        url,
        (img) => {
          record.status = 'ready';
          record.img = img;
        },
        () => {
          record.status = 'error';
          this.tileFallbackActive = true;
        }
      );
    } catch {
      record.status = 'error';
      this.tileFallbackActive = true;
    }

    return record;
  }

  /**
   * Renderiza el mapa vectorial preciso de Calama (y teselas OSM si están activas) en un <canvas>.
   */
  renderToCanvas(ctx, width, height, viewOpts = {}) {
    if (!ctx) return;
    const cx = viewOpts.centerX ?? this.centerX;
    const cz = viewOpts.centerZ ?? this.centerZ;
    const mpp = viewOpts.metersPerPixel ?? this.metersPerPixel;
    const playerX = viewOpts.playerX ?? 0;
    const playerZ = viewOpts.playerZ ?? 0;
    const playerYaw = viewOpts.playerYaw ?? 0;
    const showBuildings = viewOpts.showBuildings !== false && mpp < 4.5;
    const showLabels = viewOpts.showLabels !== false;

    const toScreen = (wx, wz) => [
      width * 0.5 + (wx - cx) / mpp,
      height * 0.5 + (wz - cz) / mpp,
    ];

    // Fondo tierra árida del Loa
    ctx.fillStyle = '#1b2028';
    ctx.fillRect(0, 0, width, height);

    // Superposición opcional de teselas reales OpenStreetMap si el usuario la activa
    if (this.useOnlineTiles && viewOpts.allowTiles) {
      const zoom = mpp < 1.5 ? 17 : (mpp < 3.5 ? 16 : 15);
      const centerTile = worldToTile(cx, cz, zoom);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const tx = centerTile.tx + dx;
          const ty = centerTile.ty + dy;
          const rec = this.requestTile(tx, ty, zoom);
          if (rec.status === 'ready' && rec.img) {
            const tl = tileToWorldTopLeft(tx, ty, zoom);
            const br = tileToWorldTopLeft(tx + 1, ty + 1, zoom);
            const [sx0, sy0] = toScreen(tl.x, tl.z);
            const [sx1, sy1] = toScreen(br.x, br.z);
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.drawImage(rec.img, sx0, sy0, sx1 - sx0, sy1 - sy0);
            ctx.restore();
          }
        }
      }
    }

    const halfW = (width * 0.55) * mpp;
    const halfH = (height * 0.55) * mpp;
    const minVX = cx - halfW - 60;
    const maxVX = cx + halfW + 60;
    const minVZ = cz - halfH - 60;
    const maxVZ = cz + halfH + 60;
    const inBounds = (x, z) => x >= minVX && x <= maxVX && z >= minVZ && z <= maxVZ;
    const polyInView = (pts) => {
      let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const px = pts[i], pz = pts[i + 1];
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (pz < z0) z0 = pz;
        if (pz > z1) z1 = pz;
      }
      return x1 >= minVX && x0 <= maxVX && z1 >= minVZ && z0 <= maxVZ;
    };

    // Parques y plazas
    ctx.fillStyle = 'rgba(66, 122, 62, 0.55)';
    for (const pk of this.mapData.parks || []) {
      const p = pk.p;
      if (!p || p.length < 6 || !polyInView(p)) continue;
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const [sx, sy] = toScreen(p[i], p[i + 1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(218, 198, 162, 0.65)';
    for (const pl of this.mapData.plazas || []) {
      const p = pl.p;
      if (!p || p.length < 6 || !polyInView(p)) continue;
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const [sx, sy] = toScreen(p[i], p[i + 1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Río Loa
    ctx.strokeStyle = '#2d8db5';
    ctx.lineCap = 'round';
    for (const wl of this.mapData.waterLines || []) {
      const p = wl.p;
      if (!p || p.length < 4 || !polyInView(p)) continue;
      ctx.lineWidth = Math.max(2, (wl.w || 10) / mpp);
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const [sx, sy] = toScreen(p[i], p[i + 1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Huellas de edificios (OSM reales en tono cálido más vivo, infill más sutil)
    if (showBuildings) {
      for (const b of this.mapData.buildings || []) {
        const p = b.p;
        if (!p || p.length < 6 || !polyInView(p)) continue;
        ctx.fillStyle = b.r === 1 ? 'rgba(210, 168, 128, 0.48)' : 'rgba(130, 140, 152, 0.28)';
        ctx.beginPath();
        for (let i = 0; i < p.length; i += 2) {
          const [sx, sy] = toScreen(p[i], p[i + 1]);
          if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Red vial por jerarquía
    for (const rd of this.mapData.roads || []) {
      const p = rd.p;
      if (!p || p.length < 4 || !polyInView(p)) continue;
      const isMain = rd.t === 'primary' || rd.t === 'trunk' || rd.t === 'motorway' || rd.t === 'secondary';
      const isPed = rd.t === 'pedestrian';
      if (mpp > 5.5 && !isMain && rd.t !== 'tertiary') continue;

      ctx.strokeStyle = isPed ? '#d9a46c' : (isMain ? '#e0b354' : '#6f7b8a');
      ctx.lineWidth = Math.max(isMain ? 1.8 : 1.0, (rd.w || 7) / mpp);
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) {
        const [sx, sy] = toScreen(p[i], p[i + 1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Ruta GPS activa
    if (this.route && this.route.length >= 2) {
      ctx.strokeStyle = '#36d6ff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let i = 0; i < this.route.length; i++) {
        const [sx, sy] = toScreen(this.route[i][0], this.route[i][1]);
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Marcadores de hitos emblemáticos
    if (showLabels) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const seenNames = new Set();
      for (const lm of this.mapData.landmarks || []) {
        if (seenNames.has(lm.name) || !inBounds(lm.cx, lm.cz)) continue;
        seenNames.add(lm.name);
        const [sx, sy] = toScreen(lm.cx, lm.cz);
        ctx.fillStyle = '#f48c42';
        ctx.beginPath();
        ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#101419';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (mpp <= 5.5) {
          ctx.fillStyle = '#f5efe6';
          ctx.fillText(lm.name, sx + 7, sy);
        }
      }
    }

    // Pin de destino
    if (this.destination) {
      const [dx, dy] = toScreen(this.destination.x, this.destination.z);
      ctx.fillStyle = '#36d6ff';
      ctx.beginPath();
      ctx.arc(dx, dy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Flecha del jugador orientada según su rumbo real
    const [px, py] = toScreen(playerX, playerZ);
    ctx.save();
    ctx.translate(px, py);
    // yaw=0 mira al Norte (-Z, arriba en el canvas => -Y)
    ctx.rotate(-playerYaw);
    ctx.fillStyle = '#ffdf38';
    ctx.strokeStyle = '#111318';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
