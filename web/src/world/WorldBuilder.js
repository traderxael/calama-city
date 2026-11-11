import { earcut2D } from '../utils/Geometry2D.js';
import { SpatialGrid } from '../physics/SpatialGrid.js';
import { createCityTextures } from './ProceduralTextures.js';
import { buildRoadMeshes } from './RoadNetworkMesh.js';
import { buildChunkedBuildings } from './BuildingMesh.js';
import { buildStreetProps } from './StreetProps.js';

/**
 * Ensamblador principal del mundo 3D de Calama:
 * - Suelo del Desierto de Atacama + Cordillera de los Andes y cerros de Chuquicamata
 * - Parques, plazas, Río Loa (oasis) y línea férrea FCAB
 * - Red vial exacta, edificios por chunks, mobiliario/semáforos y colisiones SpatialGrid
 */

function buildFlatPolygonsMesh(THREE, items, y, colorHex, name, texture = null, uvScale = 0.08) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let k = 0; k < items.length; k++) {
    const pts = items[k].p;
    if (!pts || pts.length < 6) continue;
    const { vertices, indices: tri } = earcut2D(pts, items[k].holes || [], true);
    if (!tri.length) continue;

    const base = positions.length / 3;
    const n = vertices.length / 2;
    const yCur = y + (k % 5) * 0.0004;
    for (let i = 0; i < n; i++) {
      const vx = vertices[2 * i];
      const vz = vertices[2 * i + 1];
      positions.push(vx, yCur, vz);
      normals.push(0, 1, 0);
      uvs.push(vx * uvScale, vz * uvScale);
    }
    for (let i = 0; i < tri.length; i += 3) {
      indices.push(base + tri[i], base + tri[i + 2], base + tri[i + 1]);
    }
  }

  if (!positions.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mat = new THREE.MeshLambertMaterial({
    color: colorHex,
    map: texture || null,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = name;
  return mesh;
}

function buildLinearStripsMesh(THREE, lines, defaultWidth, y, colorHex, name) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let l = 0; l < lines.length; l++) {
    const pts = lines[l].p;
    if (!pts || pts.length < 4) continue;
    const half = (lines[l].w || defaultWidth) * 0.5;
    const n = Math.floor(pts.length / 2);
    const yCur = y + (l % 6) * 0.0004;

    for (let i = 0; i < n - 1; i++) {
      const ax = pts[2 * i], az = pts[2 * i + 1];
      const bx = pts[2 * (i + 1)], bz = pts[2 * (i + 1) + 1];
      const dx = bx - ax, dz = bz - az;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) continue;
      const nx = (-dz / len) * half;
      const nz = (dx / len) * half;

      const base = positions.length / 3;
      positions.push(
        ax + nx, yCur, az + nz,
        ax - nx, yCur, az - nz,
        bx - nx, yCur, bz - nz,
        bx + nx, yCur, bz + nz
      );
      for (let k = 0; k < 4; k++) normals.push(0, 1, 0);
      const crossY = (-2 * nz) * (bx - ax) - (-2 * nx) * (bz - az);
      if (crossY < 0) {
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      } else {
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }

  if (!positions.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colorHex }));
  mesh.name = name;
  return mesh;
}

function buildAtacamaSurroundings(THREE) {
  const env = new THREE.Group();
  env.name = 'EntornoAtacamaYCordillera';

  // Suelo desértico caliche de Calama
  const groundGeo = new THREE.PlaneGeometry(14000, 14000);
  groundGeo.rotateX(-Math.PI * 0.5);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xcab596 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.02;
  ground.name = 'SueloDesiertoAtacama';
  env.add(ground);

  // Cordillera de los Andes al Este (+X) y cerros mineros de Chuquicamata al Norte (-Z) en 1 sola malla combinada
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  const addPeak = (cx, cz, radiusX, radiusZ, height, rBase, gBase, bBase, snowCap = false) => {
    const segs = 7;
    const topIdx = positions.length / 3;
    positions.push(cx, height, cz);
    normals.push(0, 1, 0);
    if (snowCap) {
      colors.push(0.95, 0.96, 0.98);
    } else {
      colors.push(rBase * 1.12, gBase * 1.08, bBase * 1.04);
    }

    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const jitter = 0.85 + ((i * 17) % 5) * 0.07;
      const px = cx + Math.cos(a) * radiusX * jitter;
      const pz = cz + Math.sin(a) * radiusZ * jitter;
      positions.push(px, -4, pz);
      normals.push(Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6);
      colors.push(rBase * 0.82, gBase * 0.8, bBase * 0.78);
    }

    for (let i = 1; i <= segs; i++) {
      indices.push(topIdx, topIdx + i + 1, topIdx + i);
    }
  };

  // Volcanes y cumbres andinas al Este y Noreste (San Pedro / Licancabur lejano)
  for (let i = 0; i < 14; i++) {
    const ang = -1.1 + (i / 13) * 2.2; // arco Este (+X)
    const dist = 4600 + (i % 3) * 450;
    const h = 420 + (i % 4) * 145;
    addPeak(
      Math.cos(ang) * dist,
      Math.sin(ang) * dist,
      780,
      720,
      h,
      0.55, 0.45, 0.40,
      h > 620
    );
  }

  // Cerros cobrizos de Chuquicamata / Montecristo al Norte (-Z) y Oeste (-X)
  for (let i = 0; i < 12; i++) {
    const ang = Math.PI + (-0.9 + (i / 11) * 1.9);
    const dist = 3900 + (i % 3) * 320;
    const h = 210 + (i % 3) * 85;
    addPeak(
      Math.cos(ang) * dist,
      -Math.abs(Math.sin(ang)) * dist - 900,
      680,
      560,
      h,
      0.66, 0.48, 0.36,
      false
    );
  }

  const ridgeGeo = new THREE.BufferGeometry();
  ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  ridgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  ridgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  ridgeGeo.setIndex(indices);
  ridgeGeo.computeVertexNormals();
  ridgeGeo.computeBoundingSphere();

  const ridgeMesh = new THREE.Mesh(ridgeGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  ridgeMesh.name = 'CordilleraYCerrosMineros';
  env.add(ridgeMesh);

  return env;
}

export function buildWorld(THREE, mapData, options = {}) {
  const chunkSize = options.chunkSize || 550;
  const textures = options.textures || createCityTextures(THREE, options.doc);
  const root = new THREE.Group();
  root.name = 'MundoCalama';

  const colliderGrid = new SpatialGrid(32);

  // 1. Entorno desértico y cordillera
  root.add(buildAtacamaSurroundings(THREE));

  // 2. Áreas verdes, oasis del Río Loa, plazas y vía férrea FCAB
  const parksMesh = buildFlatPolygonsMesh(THREE, mapData.parks || [], 0.018, 0x4f7d3b, 'ParquesVerdes');
  if (parksMesh) root.add(parksMesh);

  const plazasMesh = buildFlatPolygonsMesh(THREE, mapData.plazas || [], 0.032, 0xffffff, 'PlazasUrbanas', textures.plazaTile, 0.14);
  if (plazasMesh) root.add(plazasMesh);

  const waterPolyMesh = buildFlatPolygonsMesh(THREE, mapData.waterPolys || [], 0.024, 0x2b6f8a, 'EspejosAguaLoa');
  if (waterPolyMesh) root.add(waterPolyMesh);

  const waterRibbon = buildLinearStripsMesh(THREE, mapData.waterLines || [], 14, 0.025, 0x2b728e, 'RioLoaYCanales');
  if (waterRibbon) root.add(waterRibbon);

  // Ribera verde del Río Loa
  const riparianLines = (mapData.waterLines || []).map((w) => ({ w: (w.w || 10) + 14, p: w.p }));
  const riparianRibbon = buildLinearStripsMesh(THREE, riparianLines, 24, 0.012, 0x5c7c42, 'RiberaVerdeRioLoa');
  if (riparianRibbon) root.add(riparianRibbon);

  const railBallast = buildLinearStripsMesh(THREE, mapData.railways || [], 4.4, 0.036, 0x5d4f43, 'BalastoFerrocarrilFCAB');
  if (railBallast) root.add(railBallast);
  const railSteel = buildLinearStripsMesh(THREE, mapData.railways || [], 1.5, 0.058, 0x8d949c, 'RielesFCAB');
  if (railSteel) root.add(railSteel);

  // 3. Red vial y colisión/consulta de calles en SpatialGrid
  const roadsGroup = buildRoadMeshes(THREE, mapData, textures);
  root.add(roadsGroup);

  const roads = mapData.roads || [];
  for (let i = 0; i < roads.length; i++) {
    const rd = roads[i];
    const pts = rd.p;
    for (let j = 0; j + 3 < pts.length; j += 2) {
      colliderGrid.addRoadSegment(pts[j], pts[j + 1], pts[j + 2], pts[j + 3], rd);
    }
  }

  // 4. Edificios agrupados por chunks + registro de colisiones 2.5D
  const buildings = mapData.buildings || [];
  const bRes = buildChunkedBuildings(THREE, buildings, textures, chunkSize);
  root.add(bRes.group);

  for (let i = 0; i < buildings.length; i++) {
    colliderGrid.addPolygon(buildings[i].p, { kind: 'building', h: buildings[i].h });
  }

  // 5. Mobiliario urbano y semáforos reales (InstancedMesh)
  const propsCtrl = buildStreetProps(THREE, mapData);
  root.add(propsCtrl.group);

  let staticMeshCount = 0;
  root.traverse((o) => {
    if (o.isMesh || o.isInstancedMesh) staticMeshCount++;
  });

  return {
    root,
    textures,
    colliderGrid,
    propsCtrl,
    buildingMaterials: bRes.materials,
    stats: {
      drawCallsStatic: staticMeshCount,
      buildingCount: buildings.length,
      roadCount: roads.length,
    },
  };
}
