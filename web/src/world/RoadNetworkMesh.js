/**
 * Construcción de la red vial 3D de Calama:
 * - Calzadas asfaltadas con discos de empalme en intersecciones (cero huecos en esquinas)
 * - Calles peatonales adoquinadas (Paseo Eleuterio Ramírez y pasajes)
 * - Veredas / soleras elevadas en el casco urbano
 * - Demarcación vial blanca: ejes segmentados y los 651 pasos de cebra reales de OSM
 */

class GeoBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.uvs = [];
    this.colors = [];
    this.indices = [];
  }

  get empty() {
    return this.positions.length === 0;
  }

  addQuad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, uMax = 1, vMax = 1, r = 1, g = 1, b = 1, nx = 0, ny = 1, nz = 0) {
    const base = this.positions.length / 3;
    this.positions.push(
      ax, ay, az,
      bx, by, bz,
      cx, cy, cz,
      dx, dy, dz
    );
    for (let i = 0; i < 4; i++) {
      this.normals.push(nx, ny, nz);
      this.colors.push(r, g, b);
    }
    this.uvs.push(0, 0, uMax, 0, uMax, vMax, 0, vMax);
    // En sistema mano derecha con +Y arriba: (a=izq0, b=der0, c=der1, d=izq1)
    // Si avanzamos hacia adelante, normal +Y requiere sentido antihorario visto desde +Y
    const e1x = bx - ax, e1z = bz - az;
    const e2x = dx - ax, e2z = dz - az;
    // cross_y = e1z * e2x - e1x * e2z
    const crossY = e1z * e2x - e1x * e2z;
    if (ny >= 0 && crossY < 0) {
      this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  addDisc(cx, y, cz, radius, segments = 8, r = 1, g = 1, b = 1) {
    const centerIdx = this.positions.length / 3;
    this.positions.push(cx, y, cz);
    this.normals.push(0, 1, 0);
    this.uvs.push(0.5, 0.5);
    this.colors.push(r, g, b);

    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const px = cx + Math.cos(ang) * radius;
      const pz = cz + Math.sin(ang) * radius;
      this.positions.push(px, y, pz);
      this.normals.push(0, 1, 0);
      this.uvs.push(0.5 + Math.cos(ang) * 0.5, 0.5 + Math.sin(ang) * 0.5);
      this.colors.push(r, g, b);
    }

    for (let i = 1; i <= segments; i++) {
      this.indices.push(centerIdx, centerIdx + i + 1, centerIdx + i);
    }
  }

  toBufferGeometry(THREE) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geo.setIndex(this.indices);
    geo.computeBoundingSphere();
    return geo;
  }
}

function addRibbon(builder, pts, width, y, uScale = 0.2, r = 1, g = 1, b = 1, withCaps = true) {
  const n = Math.floor(pts.length / 2);
  if (n < 2) return;
  const half = width * 0.5;

  const leftX = new Float32Array(n);
  const leftZ = new Float32Array(n);
  const rightX = new Float32Array(n);
  const rightZ = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const x = pts[2 * i];
    const z = pts[2 * i + 1];
    let dx = 0, dz = 0;

    if (i === 0) {
      dx = pts[2] - x;
      dz = pts[3] - z;
    } else if (i === n - 1) {
      dx = x - pts[2 * (i - 1)];
      dz = z - pts[2 * (i - 1) + 1];
    } else {
      let d1x = x - pts[2 * (i - 1)];
      let d1z = z - pts[2 * (i - 1) + 1];
      const l1 = Math.hypot(d1x, d1z) || 1;
      d1x /= l1; d1z /= l1;

      let d2x = pts[2 * (i + 1)] - x;
      let d2z = pts[2 * (i + 1) + 1] - z;
      const l2 = Math.hypot(d2x, d2z) || 1;
      d2x /= l2; d2z /= l2;

      dx = d1x + d2x;
      dz = d1z + d2z;
      if (dx * dx + dz * dz < 1e-4) {
        dx = d2x;
        dz = d2z;
      }
    }

    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;

    const nx = -dz;
    const nz = dx;
    leftX[i] = x + nx * half;
    leftZ[i] = z + nz * half;
    rightX[i] = x - nx * half;
    rightZ[i] = z - nz * half;
  }

  let distAcc = 0;
  for (let i = 0; i < n - 1; i++) {
    const segLen = Math.hypot(pts[2 * (i + 1)] - pts[2 * i], pts[2 * (i + 1) + 1] - pts[2 * i + 1]);
    if (segLen < 0.05) continue;
    builder.addQuad(
      leftX[i], y, leftZ[i],
      rightX[i], y, rightZ[i],
      rightX[i + 1], y, rightZ[i + 1],
      leftX[i + 1], y, leftZ[i + 1],
      width * uScale,
      segLen * uScale,
      r, g, b
    );
    distAcc += segLen;
  }

  if (withCaps && width >= 4.0) {
    builder.addDisc(pts[0], y, pts[1], half * 0.98, 8, r, g, b);
    builder.addDisc(pts[2 * (n - 1)], y, pts[2 * (n - 1) + 1], half * 0.98, 8, r, g, b);
  }
}

export function buildRoadMeshes(THREE, mapData, textures) {
  const group = new THREE.Group();
  group.name = 'RedVialCalama';

  const asphaltGeo = new GeoBuilder();
  const pedestrianGeo = new GeoBuilder();
  const sidewalkGeo = new GeoBuilder();
  const markingsGeo = new GeoBuilder();

  const roads = mapData.roads || [];
  for (let i = 0; i < roads.length; i++) {
    const rd = roads[i];
    const pts = rd.p;
    if (!pts || pts.length < 4) continue;

    const htype = rd.t;
    const isPed = htype === 'pedestrian' || htype === 'footway' || htype === 'path' || htype === 'steps' || rd.s === 'paving_stones';
    const micro = (i % 9) * 0.0005;

    if (isPed) {
      const isRamirez = (rd.n || '').toLowerCase().includes('ram');
      const cr = isRamirez ? 1.04 : 0.92;
      const cg = isRamirez ? 0.96 : 0.89;
      const cb = isRamirez ? 0.88 : 0.84;
      addRibbon(pedestrianGeo, pts, Math.max(2.2, rd.w), 0.055 + micro, 0.25, cr, cg, cb, htype === 'pedestrian');
      continue;
    }

    const isMajor = htype === 'motorway' || htype === 'trunk' || htype === 'primary' || htype === 'secondary';
    const yRoad = (isMajor ? 0.052 : 0.045) + micro;
    const shade = isMajor ? 0.92 : 1.0;
    addRibbon(asphaltGeo, pts, Math.max(3.5, rd.w), yRoad, 0.14, shade, shade, shade * 1.03, true);

    // Solera/vereda suave bajo calles urbanas del casco consolidado
    if (Math.hypot(pts[0], pts[1]) < 1850 && rd.w >= 6.5 && htype !== 'motorway' && htype !== 'trunk') {
      addRibbon(sidewalkGeo, pts, rd.w + 3.4, 0.028 + micro * 0.5, 0.2, 0.82, 0.78, 0.72, false);
    }

    // Líneas centrales discontinuas para avenidas y calles principales/secundarias/terciarias
    if (rd.w >= 9.5) {
      const n = Math.floor(pts.length / 2);
      for (let s = 0; s < n - 1; s++) {
        const ax = pts[2 * s], az = pts[2 * s + 1];
        const bx = pts[2 * (s + 1)], bz = pts[2 * (s + 1) + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        if (segLen < 7) continue;
        const ux = (bx - ax) / segLen;
        const uz = (bz - az) / segLen;
        const nx = -uz * 0.11;
        const nz = ux * 0.11;
        const isYellow = rd.o === 0 && isMajor;
        const mr = 0.96, mg = isYellow ? 0.82 : 0.96, mb = isYellow ? 0.24 : 0.94;

        for (let d = 3.0; d + 3.0 < segLen - 2.0; d += 8.0) {
          const x0 = ax + ux * d, z0 = az + uz * d;
          const x1 = ax + ux * (d + 3.2), z1 = az + uz * (d + 3.2);
          markingsGeo.addQuad(
            x0 + nx, yRoad + 0.012, z0 + nz,
            x0 - nx, yRoad + 0.012, z0 - nz,
            x1 - nx, yRoad + 0.012, z1 - nz,
            x1 + nx, yRoad + 0.012, z1 + nz,
            1, 1, mr, mg, mb
          );
        }
      }
    }
  }

  // 651 pasos de cebra reales orientados según su vía en OSM
  const crossings = mapData.crossings || [];
  for (let i = 0; i + 2 < crossings.length; i += 3) {
    const cx = crossings[i];
    const cz = crossings[i + 1];
    const ang = crossings[i + 2];
    const ux = Math.cos(ang);
    const uz = Math.sin(ang);
    const nx = -uz;
    const nz = ux;
    const y = 0.068;

    // 5 franjas blancas de paso de cebra
    for (let b = -2; b <= 2; b++) {
      const offAcross = b * 1.05;
      const sx = cx + nx * offAcross;
      const sz = cz + nz * offAcross;
      const halfLen = 1.65;
      const halfWid = 0.26;
      markingsGeo.addQuad(
        sx - ux * halfLen + nx * halfWid, y, sz - uz * halfLen + nz * halfWid,
        sx - ux * halfLen - nx * halfWid, y, sz - uz * halfLen - nz * halfWid,
        sx + ux * halfLen - nx * halfWid, y, sz + uz * halfLen - nz * halfWid,
        sx + ux * halfLen + nx * halfWid, y, sz + uz * halfLen + nz * halfWid,
        1, 1, 0.95, 0.95, 0.95
      );
    }
  }

  if (!sidewalkGeo.empty) {
    const mat = new THREE.MeshLambertMaterial({
      color: 0xd8cfc2,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const m = new THREE.Mesh(sidewalkGeo.toBufferGeometry(THREE), mat);
    m.name = 'VeredasUrbanas';
    group.add(m);
  }

  if (!asphaltGeo.empty) {
    const mat = new THREE.MeshLambertMaterial({
      map: textures.asphalt,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const m = new THREE.Mesh(asphaltGeo.toBufferGeometry(THREE), mat);
    m.name = 'CalzadasAsfalto';
    group.add(m);
  }

  if (!pedestrianGeo.empty) {
    const mat = new THREE.MeshLambertMaterial({
      map: textures.cobbleRamirez,
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    const m = new THREE.Mesh(pedestrianGeo.toBufferGeometry(THREE), mat);
    m.name = 'PaseosPeatonales';
    group.add(m);
  }

  if (!markingsGeo.empty) {
    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    const m = new THREE.Mesh(markingsGeo.toBufferGeometry(THREE), mat);
    m.name = 'DemarcacionVialYPasosCebra';
    group.add(m);
  }

  return group;
}
