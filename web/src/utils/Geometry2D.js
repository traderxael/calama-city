/**
 * Utilidades geométricas 2D sobre plano (x, z) con triangulación ear-clipping
 * y soporte de huecos interiores (bridgeHoles) para edificios con patio y estadios.
 */

export function polygonAreaSigned(flatPoints) {
  const n = Math.floor(flatPoints.length / 2);
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += flatPoints[2 * i] * flatPoints[2 * j + 1] - flatPoints[2 * j] * flatPoints[2 * i + 1];
  }
  return sum * 0.5;
}

export function closestPointOnSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = 0;
  if (lenSq > 1e-10) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
  }
  const x = ax + t * dx;
  const z = az + t * dz;
  const ex = px - x;
  const ez = pz - z;
  return { x, z, distSq: ex * ex + ez * ez, t };
}

export function pointInPolygon(px, pz, flatPoints) {
  const n = Math.floor(flatPoints.length / 2);
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flatPoints[2 * i], zi = flatPoints[2 * i + 1];
    const xj = flatPoints[2 * j], zj = flatPoints[2 * j + 1];
    const intersect = ((zi > pz) !== (zj > pz)) &&
      (px < ((xj - xi) * (pz - zi)) / ((zj - zi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function ensureWinding(pts, ccw) {
  const out = Array.from(pts);
  const area = polygonAreaSigned(out);
  if ((ccw && area < 0) || (!ccw && area > 0)) {
    const rev = [];
    for (let i = out.length - 2; i >= 0; i -= 2) {
      rev.push(out[i], out[i + 1]);
    }
    return rev;
  }
  return out;
}

function pointInTriangle(px, pz, ax, az, bx, bz, cx, cz) {
  const v0x = cx - ax, v0z = cz - az;
  const v1x = bx - ax, v1z = bz - az;
  const v2x = px - ax, v2z = pz - az;

  const dot00 = v0x * v0x + v0z * v0z;
  const dot01 = v0x * v1x + v0z * v1z;
  const dot02 = v0x * v2x + v0z * v2z;
  const dot11 = v1x * v1x + v1z * v1z;
  const dot12 = v1x * v2x + v1z * v2z;

  const denom = dot00 * dot11 - dot01 * dot01;
  if (Math.abs(denom) < 1e-12) return false;
  const inv = 1 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= -1e-7 && v >= -1e-7 && (u + v) <= 1 + 1e-7;
}

function segmentsProperlyIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const cross = (ux, uz, vx, vz) => ux * vz - uz * vx;
  const d1 = cross(bx - ax, bz - az, cx - ax, cz - az);
  const d2 = cross(bx - ax, bz - az, dx - ax, dz - az);
  const d3 = cross(dx - cx, dz - cz, ax - cx, az - cz);
  const d4 = cross(dx - cx, dz - cz, bx - cx, bz - cz);
  return ((d1 > 1e-7 && d2 < -1e-7) || (d1 < -1e-7 && d2 > 1e-7)) &&
         ((d3 > 1e-7 && d4 < -1e-7) || (d3 < -1e-7 && d4 > 1e-7));
}

function bridgeHoleIntoOuter(outerFlat, holeFlat) {
  const nOuter = outerFlat.length / 2;
  const nHole = holeFlat.length / 2;

  // Buscar el vértice más a la derecha (+X) del hueco
  let hIdx = 0;
  for (let i = 1; i < nHole; i++) {
    if (holeFlat[2 * i] > holeFlat[2 * hIdx]) hIdx = i;
  }
  const hx = holeFlat[2 * hIdx];
  const hz = holeFlat[2 * hIdx + 1];

  // Elegir el vértice visible más cercano del anillo exterior sin cruzar aristas
  let bestO = 0;
  let bestDist = Infinity;
  for (let i = 0; i < nOuter; i++) {
    const ox = outerFlat[2 * i];
    const oz = outerFlat[2 * i + 1];
    const d = Math.hypot(ox - hx, oz - hz);
    if (d >= bestDist) continue;

    let blocked = false;
    for (let e = 0; e < nOuter; e++) {
      const eNext = (e + 1) % nOuter;
      if (e === i || eNext === i) continue;
      if (segmentsProperlyIntersect(
        hx, hz, ox, oz,
        outerFlat[2 * e], outerFlat[2 * e + 1],
        outerFlat[2 * eNext], outerFlat[2 * eNext + 1]
      )) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      bestDist = d;
      bestO = i;
    }
  }

  const combined = [];
  for (let i = 0; i <= bestO; i++) {
    combined.push(outerFlat[2 * i], outerFlat[2 * i + 1]);
  }
  for (let k = 0; k <= nHole; k++) {
    const idx = (hIdx + k) % nHole;
    combined.push(holeFlat[2 * idx], holeFlat[2 * idx + 1]);
  }
  for (let i = bestO; i < nOuter; i++) {
    combined.push(outerFlat[2 * i], outerFlat[2 * i + 1]);
  }
  return combined;
}

/**
 * Triangula un polígono 2D plano [x0, z0, x1, z1, ...].
 * Si returnObject === true, devuelve { vertices, indices }; de lo contrario devuelve indices[].
 */
export function earcut2D(flatPoints, holesFlat = [], returnObject = false) {
  let working = ensureWinding(flatPoints, true);

  if (holesFlat && holesFlat.length > 0) {
    // Ordenar huecos por su X máxima descendente para puentear de derecha a izquierda
    const sortedHoles = holesFlat
      .filter((h) => h && h.length >= 6)
      .map((h) => ensureWinding(h, false))
      .sort((a, b) => {
        let maxA = -Infinity, maxB = -Infinity;
        for (let i = 0; i < a.length; i += 2) if (a[i] > maxA) maxA = a[i];
        for (let i = 0; i < b.length; i += 2) if (b[i] > maxB) maxB = b[i];
        return maxB - maxA;
      });

    for (const hole of sortedHoles) {
      working = bridgeHoleIntoOuter(working, hole);
    }
  }

  const n = Math.floor(working.length / 2);
  if (n < 3) return returnObject ? { vertices: working, indices: [] } : [];

  const V = [];
  for (let i = 0; i < n; i++) V.push(i);

  const indices = [];
  let guard = 0;
  const maxIter = n * n * 2 + 32;

  while (V.length > 3 && guard < maxIter) {
    guard++;
    let earFound = false;

    for (let i = 0; i < V.length; i++) {
      const i0 = V[(i + V.length - 1) % V.length];
      const i1 = V[i];
      const i2 = V[(i + 1) % V.length];

      const ax = working[2 * i0], az = working[2 * i0 + 1];
      const bx = working[2 * i1], bz = working[2 * i1 + 1];
      const cx = working[2 * i2], cz = working[2 * i2 + 1];

      const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
      if (cross <= 1e-8) continue;

      let hasPointInside = false;
      for (let j = 0; j < V.length; j++) {
        const vi = V[j];
        if (vi === i0 || vi === i1 || vi === i2) continue;
        const px = working[2 * vi], pz = working[2 * vi + 1];
        if (px === ax && pz === az) continue;
        if (px === bx && pz === bz) continue;
        if (px === cx && pz === cz) continue;
        if (pointInTriangle(px, pz, ax, az, bx, bz, cx, cz)) {
          hasPointInside = true;
          break;
        }
      }

      if (!hasPointInside) {
        indices.push(i0, i1, i2);
        V.splice(i, 1);
        earFound = true;
        break;
      }
    }

    if (!earFound) {
      // Relajar colinealidad si hay puente degenerado
      let forced = false;
      for (let i = 0; i < V.length; i++) {
        const i0 = V[(i + V.length - 1) % V.length];
        const i1 = V[i];
        const i2 = V[(i + 1) % V.length];
        const ax = working[2 * i0], az = working[2 * i0 + 1];
        const bx = working[2 * i1], bz = working[2 * i1 + 1];
        const cx = working[2 * i2], cz = working[2 * i2 + 1];
        const cross = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
        if (cross >= -1e-5) {
          if (cross > 1e-8) indices.push(i0, i1, i2);
          V.splice(i, 1);
          forced = true;
          break;
        }
      }
      if (!forced) break;
    }
  }

  if (V.length === 3) {
    indices.push(V[0], V[1], V[2]);
  }

  return returnObject ? { vertices: working, indices } : indices;
}
