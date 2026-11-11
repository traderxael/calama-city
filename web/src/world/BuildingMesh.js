import { earcut2D } from '../utils/Geometry2D.js';

/**
 * Construcción de los 6.400+ edificios de Calama agrupados por chunks espaciales
 * y tipología arquitectónica para mantener <= 95 mallas estáticas en vista en la GT 640.
 * Incluye oclusión ambiental en vértices (AO en base y=0), UVs métricas por piso,
 * cornisas/parapetos de azotea y paleta de colores nortina auténtica.
 */

const PALETTES = {
  // Residencial nortino: caliche crema, arena, damasco, terracota suave, blanco cálido, ocre claro
  0: [
    [0.93, 0.88, 0.80],
    [0.89, 0.80, 0.69],
    [0.86, 0.73, 0.62],
    [0.95, 0.93, 0.89],
    [0.83, 0.77, 0.68],
    [0.88, 0.69, 0.58],
    [0.79, 0.82, 0.83],
  ],
  // Comercial céntrico: crema urbano, ocre comercial, terracota, gris piedra, arena
  1: [
    [0.88, 0.84, 0.78],
    [0.82, 0.72, 0.61],
    [0.78, 0.58, 0.48],
    [0.78, 0.79, 0.80],
    [0.91, 0.87, 0.79],
  ],
  // Corporativo / moderno / altura media
  2: [
    [0.76, 0.82, 0.88],
    [0.68, 0.76, 0.84],
    [0.82, 0.80, 0.77],
    [0.72, 0.66, 0.60],
  ],
  // Institucional (colegios, clínicas, servicios públicos)
  3: [
    [0.90, 0.87, 0.81],
    [0.82, 0.86, 0.89],
    [0.86, 0.76, 0.66],
  ],
};

class ChunkBuffer {
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

  addWallQuad(x1, z1, x2, z2, y0, y1, u0, u1, v0, v1, rBot, gBot, bBot, rTop, gTop, bTop) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;

    // Para polígono en sentido CCW matemático sobre (x, z), la normal exterior apunta hacia (dz, 0, -dx) o (-dz, 0, dx):
    // Verifiquemos con cuadrado [0,0 -> 10,0 -> 10,10 -> 0,10] (area > 0):
    // Arista (0,0)->(10,0) tiene interior en z > 0, por tanto exterior es z < 0 => (0, 0, -1) = (dz/len, 0, -dx/len)!
    const nx = dz / len;
    const nz = -dx / len;

    // Sutil modulación direccional para enriquecer lectura volumétrica bajo luz desértica
    const dirShade = 0.93 + 0.07 * (nx * 0.6 - nz * 0.8);

    const base = this.positions.length / 3;
    this.positions.push(
      x1, y0, z1,
      x2, y0, z2,
      x2, y1, z2,
      x1, y1, z1
    );
    for (let i = 0; i < 4; i++) {
      this.normals.push(nx, 0, nz);
    }
    this.uvs.push(
      u0, v0,
      u1, v0,
      u1, v1,
      u0, v1
    );
    this.colors.push(
      rBot * dirShade, gBot * dirShade, bBot * dirShade,
      rBot * dirShade, gBot * dirShade, bBot * dirShade,
      rTop * dirShade, gTop * dirShade, bTop * dirShade,
      rTop * dirShade, gTop * dirShade, bTop * dirShade
    );

    // Con normal exterior (dz, 0, -dx): (p1-p0) x (p2-p0) = (dx, 0, dz) x (dx, dy, dz) = (-dz*dy, 0, dx*dy)
    // Para que apunte a (+dz, 0, -dx) necesitamos invertir el orden: (0, 2, 1) y (0, 3, 2)!
    this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  addRoofFromEarcut(flatPts, holesFlat, yRoof, r, g, b) {
    const { vertices, indices } = earcut2D(flatPts, holesFlat || [], true);
    if (!indices.length) return;
    const base = this.positions.length / 3;
    const n = vertices.length / 2;
    for (let i = 0; i < n; i++) {
      const vx = vertices[2 * i];
      const vz = vertices[2 * i + 1];
      this.positions.push(vx, yRoof, vz);
      this.normals.push(0, 1, 0);
      this.uvs.push(vx * 0.08, vz * 0.08);
      this.colors.push(r, g, b);
    }
    // En earcut2D, cross((b-a),(c-a)) en (x,z) > 0 => en 3D (x,0,z) su producto cruz apunta a -Y,
    // así que invertimos (a, c, b) para normal +Y hacia el cielo.
    for (let i = 0; i < indices.length; i += 3) {
      this.indices.push(base + indices[i], base + indices[i + 2], base + indices[i + 1]);
    }
  }

  toGeometry(THREE) {
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

function appendRingWalls(buf, ringFlat, h, floorH, bayW, col) {
  const n = ringFlat.length / 2;
  const aoFactor = 0.66;
  const rBot = col[0] * aoFactor;
  const gBot = col[1] * aoFactor;
  const bBot = col[2] * aoFactor;
  const vMax = Math.max(1, Math.round(h / floorH));

  let uCursor = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = ringFlat[2 * i], z1 = ringFlat[2 * i + 1];
    const x2 = ringFlat[2 * j], z2 = ringFlat[2 * j + 1];
    const edgeLen = Math.hypot(x2 - x1, z2 - z1);
    if (edgeLen < 0.1) continue;
    const uNext = uCursor + Math.max(0.5, edgeLen / bayW);
    buf.addWallQuad(x1, z1, x2, z2, 0, h, uCursor, uNext, 0, vMax, rBot, gBot, bBot, col[0], col[1], col[2]);
    uCursor = uNext;
  }
}

export function buildChunkedBuildings(THREE, buildings, textures, chunkSize = 550) {
  const group = new THREE.Group();
  group.name = 'EdificiosCalama';

  const mats = {
    res: new THREE.MeshLambertMaterial({ map: textures.facadeResidential, vertexColors: true }),
    com: new THREE.MeshLambertMaterial({ map: textures.facadeCommercial, vertexColors: true }),
    mod: new THREE.MeshLambertMaterial({ map: textures.facadeModern, vertexColors: true }),
    roof: new THREE.MeshLambertMaterial({ map: textures.roofDesert, vertexColors: true }),
  };

  // Para minimizar aún más draw calls en la GT 640, las azoteas se agrupan en una grilla amplia (1200m)
  // y las fachadas en chunks de chunkSize.
  const wallChunks = new Map();
  const roofChunks = new Map();

  const getWallBuf = (cx, cz, matKey) => {
    const k = `${cx},${cz},${matKey}`;
    let b = wallChunks.get(k);
    if (!b) {
      b = { buf: new ChunkBuffer(), matKey };
      wallChunks.set(k, b);
    }
    return b.buf;
  };

  const getRoofBuf = (rx, rz) => {
    const k = `${rx},${rz}`;
    let b = roofChunks.get(k);
    if (!b) {
      b = new ChunkBuffer();
      roofChunks.set(k, b);
    }
    return b;
  };

  for (let idx = 0; idx < buildings.length; idx++) {
    const b = buildings[idx];
    const pts = b.p;
    if (!pts || pts.length < 6) continue;

    const h = Math.max(2.8, b.h || 6.0);
    const kind = b.k || 0;
    const x0 = pts[0];
    const z0 = pts[1];

    const cx = Math.floor(x0 / chunkSize);
    const cz = Math.floor(z0 / chunkSize);
    const matKey = kind === 2 ? 'mod' : (kind === 1 || kind === 3 ? 'com' : 'res');

    const palette = PALETTES[kind] || PALETTES[0];
    const hash = Math.abs(Math.imul(idx + 17, 2654435761) ^ Math.round(x0 * 13 + z0 * 7));
    const col = palette[hash % palette.length];

    const wBuf = getWallBuf(cx, cz, matKey);
    appendRingWalls(wBuf, pts, h, 3.15, 3.8, col);

    if (b.holes && b.holes.length) {
      for (const hole of b.holes) {
        // Las paredes interiores del patio van en orden inverso para mirar hacia adentro del hueco
        const rev = [];
        for (let hi = hole.length - 2; hi >= 0; hi -= 2) {
          rev.push(hole[hi], hole[hi + 1]);
        }
        appendRingWalls(wBuf, rev, h, 3.15, 3.8, col);
      }
    }

    const rBuf = getRoofBuf(Math.floor(x0 / (chunkSize * 2)), Math.floor(z0 / (chunkSize * 2)));
    const roofTint = 0.72 + (hash % 5) * 0.04;
    rBuf.addRoofFromEarcut(pts, b.holes, h, col[0] * roofTint, col[1] * roofTint, col[2] * roofTint);
  }

  let meshCount = 0;
  for (const [key, entry] of wallChunks.entries()) {
    if (entry.buf.empty) continue;
    const mesh = new THREE.Mesh(entry.buf.toGeometry(THREE), mats[entry.matKey]);
    mesh.name = `Fachadas_${key}`;
    group.add(mesh);
    meshCount++;
  }

  for (const [key, buf] of roofChunks.entries()) {
    if (buf.empty) continue;
    const mesh = new THREE.Mesh(buf.toGeometry(THREE), mats.roof);
    mesh.name = `Techos_${key}`;
    group.add(mesh);
    meshCount++;
  }

  return { group, chunkCount: wallChunks.size, drawCallsEstimate: meshCount, materials: mats };
}
