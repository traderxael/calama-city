import { closestPointOnSegment, pointInPolygon } from '../utils/Geometry2D.js';

/**
 * Grilla espacial 2D para colisiones rápidas de jugador/vehículos contra los 6.400+
 * edificios e hitos de Calama, y consulta instantánea del nombre de calle actual.
 */
export class SpatialGrid {
  constructor(cellSize = 32) {
    this.cellSize = cellSize;
    this.polyCells = new Map();
    this.roadCells = new Map();
    this.polys = [];
  }

  _key(cx, cz) {
    return `${cx},${cz}`;
  }

  addPolygon(flatPoints, meta = {}) {
    if (!flatPoints || flatPoints.length < 6) return;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < flatPoints.length; i += 2) {
      const x = flatPoints[i];
      const z = flatPoints[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const polyObj = {
      id: this.polys.length,
      pts: flatPoints,
      minX,
      minZ,
      maxX,
      maxZ,
      meta,
    };
    this.polys.push(polyObj);

    const c0x = Math.floor(minX / this.cellSize);
    const c1x = Math.floor(maxX / this.cellSize);
    const c0z = Math.floor(minZ / this.cellSize);
    const c1z = Math.floor(maxZ / this.cellSize);

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const k = this._key(cx, cz);
        let bucket = this.polyCells.get(k);
        if (!bucket) {
          bucket = [];
          this.polyCells.set(k, bucket);
        }
        bucket.push(polyObj);
      }
    }
  }

  addRoadSegment(ax, az, bx, bz, roadMeta) {
    const pad = (roadMeta?.w || 8) * 0.5 + 4;
    const minX = Math.min(ax, bx) - pad;
    const maxX = Math.max(ax, bx) + pad;
    const minZ = Math.min(az, bz) - pad;
    const maxZ = Math.max(az, bz) + pad;

    const seg = { ax, az, bx, bz, meta: roadMeta };
    const c0x = Math.floor(minX / this.cellSize);
    const c1x = Math.floor(maxX / this.cellSize);
    const c0z = Math.floor(minZ / this.cellSize);
    const c1z = Math.floor(maxZ / this.cellSize);

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const k = this._key(cx, cz);
        let bucket = this.roadCells.get(k);
        if (!bucket) {
          bucket = [];
          this.roadCells.set(k, bucket);
        }
        bucket.push(seg);
      }
    }
  }

  _gatherPolys(minX, minZ, maxX, maxZ) {
    const c0x = Math.floor(minX / this.cellSize);
    const c1x = Math.floor(maxX / this.cellSize);
    const c0z = Math.floor(minZ / this.cellSize);
    const c1z = Math.floor(maxZ / this.cellSize);
    const seen = new Set();
    const out = [];

    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cz = c0z; cz <= c1z; cz++) {
        const bucket = this.polyCells.get(this._key(cx, cz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const p = bucket[i];
          if (!seen.has(p.id)) {
            seen.add(p.id);
            out.push(p);
          }
        }
      }
    }
    return out;
  }

  resolveCircle(x, z, radius) {
    let curX = x;
    let curZ = z;
    let hit = false;
    let normalX = 0;
    let normalZ = 0;

    for (let iter = 0; iter < 3; iter++) {
      const candidates = this._gatherPolys(
        curX - radius - 0.5,
        curZ - radius - 0.5,
        curX + radius + 0.5,
        curZ + radius + 0.5
      );
      let iterHit = false;

      for (let pIdx = 0; pIdx < candidates.length; pIdx++) {
        const poly = candidates[pIdx];
        if (
          curX + radius < poly.minX ||
          curX - radius > poly.maxX ||
          curZ + radius < poly.minZ ||
          curZ - radius > poly.maxZ
        ) {
          continue;
        }

        const pts = poly.pts;
        const n = pts.length / 2;
        const inside = pointInPolygon(curX, curZ, pts);

        let bestDistSq = Infinity;
        let bestCx = curX;
        let bestCz = curZ;

        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const cp = closestPointOnSegment(
            curX, curZ,
            pts[2 * i], pts[2 * i + 1],
            pts[2 * j], pts[2 * j + 1]
          );
          if (cp.distSq < bestDistSq) {
            bestDistSq = cp.distSq;
            bestCx = cp.x;
            bestCz = cp.z;
          }
        }

        const dist = Math.sqrt(bestDistSq);
        if (inside) {
          // Centro dentro del polígono: empujar hacia afuera pasando por la arista más cercana + radio
          let nx = bestCx - curX;
          let nz = bestCz - curZ;
          const len = Math.hypot(nx, nz);
          if (len > 1e-6) {
            nx /= len;
            nz /= len;
          } else {
            nx = -1;
            nz = 0;
          }
          curX = bestCx + nx * (radius + 0.02);
          curZ = bestCz + nz * (radius + 0.02);
          normalX = nx;
          normalZ = nz;
          hit = true;
          iterHit = true;
        } else if (dist < radius) {
          let nx = curX - bestCx;
          let nz = curZ - bestCz;
          if (dist > 1e-6) {
            nx /= dist;
            nz /= dist;
          } else {
            nx = 1;
            nz = 0;
          }
          const push = radius - dist + 0.005;
          curX += nx * push;
          curZ += nz * push;
          normalX = nx;
          normalZ = nz;
          hit = true;
          iterHit = true;
        }
      }

      if (!iterHit) break;
    }

    return { x: curX, z: curZ, hit, normalX, normalZ };
  }

  /**
   * Resuelve movimiento continuo desde (x0, z0) hasta (x1, z1) subdividiendo en sub-pasos
   * menores al radio para impedir tunneling a alta velocidad y deslizando tangencialmente.
   */
  resolveSweptCircle(x0, z0, x1, z1, radius) {
    const totalDx = x1 - x0;
    const totalDz = z1 - z0;
    const totalDist = Math.hypot(totalDx, totalDz);
    const maxStep = Math.max(0.35, radius * 0.65);
    const steps = Math.max(1, Math.ceil(totalDist / maxStep));

    let cx = x0;
    let cz = z0;
    let anyHit = false;
    let lastNx = 0;
    let lastNz = 0;

    const stepDx = totalDx / steps;
    const stepDz = totalDz / steps;

    for (let s = 0; s < steps; s++) {
      const targetX = cx + stepDx;
      const targetZ = cz + stepDz;
      const res = this.resolveCircle(targetX, targetZ, radius);
      cx = res.x;
      cz = res.z;
      if (res.hit) {
        anyHit = true;
        lastNx = res.normalX;
        lastNz = res.normalZ;
      }
    }

    return { x: cx, z: cz, hit: anyHit, normalX: lastNx, normalZ: lastNz };
  }

  findNearestRoad(x, z, maxDist = 45) {
    const rCells = Math.ceil(maxDist / this.cellSize);
    const gx = Math.floor(x / this.cellSize);
    const gz = Math.floor(z / this.cellSize);

    let bestDistSq = maxDist * maxDist;
    let bestMeta = null;

    for (let dx = -rCells; dx <= rCells; dx++) {
      for (let dz = -rCells; dz <= rCells; dz++) {
        const bucket = this.roadCells.get(this._key(gx + dx, gz + dz));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const seg = bucket[i];
          const cp = closestPointOnSegment(x, z, seg.ax, seg.az, seg.bx, seg.bz);
          // Priorizar vías con nombre real cuando están casi a la misma distancia
          const bonus = seg.meta?.n ? 0.85 : 1.15;
          const weighted = cp.distSq * bonus;
          if (weighted < bestDistSq) {
            bestDistSq = weighted;
            bestMeta = seg.meta;
          }
        }
      }
    }

    return bestMeta;
  }
}
