import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.js';

/**
 * Mobiliario urbano y vegetación calameña mediante InstancedMesh (mínimos draw calls):
 * - Los 209 semáforos reales de OpenStreetMap con cambio dinámico Verde / Rojo
 * - Farolas urbanas a lo largo de las avenidas y calles del centro
 * - Pimientos nortinos (tronco inferior blanqueado con cal + copa frondosa) en plazas y parques
 */

function mergeParts(THREE, geos) {
  return BufferGeometryUtils.mergeGeometries(geos, false);
}

export function buildStreetProps(THREE, mapData) {
  const group = new THREE.Group();
  group.name = 'MobiliarioUrbanoYVegetacion';

  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();

  // 1. 209 SEMÁFOROS REALES DE CALAMA
  const signals = mapData.signals || [];
  const sigCount = Math.floor(signals.length / 2);

  let lensGreenMesh = null;
  let lensRedMesh = null;
  const sigPositions = [];

  if (sigCount > 0) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6);
    poleGeo.translate(0, 2.3, 0);
    const armGeo = new THREE.BoxGeometry(1.5, 0.1, 0.1);
    armGeo.translate(0.65, 4.4, 0);
    const headGeo = new THREE.BoxGeometry(0.34, 0.95, 0.28);
    headGeo.translate(1.25, 4.25, 0);
    const bodyGeo = mergeParts(THREE, [poleGeo, armGeo, headGeo]);

    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x26292e });
    const bodyInst = new THREE.InstancedMesh(bodyGeo, bodyMat, sigCount);
    bodyInst.name = 'SemaforosPostes';

    const lensGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const greenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    lensGreenMesh = new THREE.InstancedMesh(lensGeo, greenMat, sigCount);
    lensRedMesh = new THREE.InstancedMesh(lensGeo, redMat, sigCount);
    lensGreenMesh.name = 'SemaforosLuzVerde';
    lensRedMesh.name = 'SemaforosLuzRoja';

    for (let i = 0; i < sigCount; i++) {
      const sx = signals[2 * i];
      const sz = signals[2 * i + 1];
      const axis = i % 2 === 0 ? 'ns' : 'ew';
      const yaw = axis === 'ns' ? 0 : Math.PI * 0.5;
      sigPositions.push({ x: sx, z: sz, axis, idx: i });

      dummy.position.set(sx, 0, sz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bodyInst.setMatrixAt(i, dummy.matrix);

      // Lente verde abajo, roja arriba en el cabezal
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const lx = sx + cos * 1.25;
      const lz = sz - sin * 1.25;

      dummy.position.set(lx, 4.02, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      lensGreenMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lx, 4.48, lz);
      dummy.updateMatrix();
      lensRedMesh.setMatrixAt(i, dummy.matrix);
    }

    bodyInst.instanceMatrix.needsUpdate = true;
    lensGreenMesh.instanceMatrix.needsUpdate = true;
    lensRedMesh.instanceMatrix.needsUpdate = true;

    group.add(bodyInst, lensGreenMesh, lensRedMesh);
  }

  // 2. PIMIENTOS CALAMEÑOS (en parques, Plaza 23 de Marzo y veredas céntricas)
  const treeCoords = [];
  const parks = [...(mapData.plazas || []), ...(mapData.parks || [])];
  for (let p = 0; p < parks.length; p++) {
    const pts = parks[p].p;
    if (!pts || pts.length < 6) continue;
    let cx = 0, cz = 0;
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      cx += pts[2 * i];
      cz += pts[2 * i + 1];
    }
    cx /= n; cz /= n;
    // Árboles perimetrales y centrales
    const step = Math.max(1, Math.floor(n / 6));
    for (let i = 0; i < n && treeCoords.length < 850; i += step) {
      const tx = pts[2 * i] * 0.78 + cx * 0.22;
      const tz = pts[2 * i + 1] * 0.78 + cz * 0.22;
      const sc = 0.85 + ((i * 19 + p * 7) % 5) * 0.11;
      treeCoords.push([tx, tz, sc]);
    }
  }

  // Árboles urbanos en calles peatonales / residenciales céntricas
  const roads = mapData.roads || [];
  for (let r = 0; r < roads.length && treeCoords.length < 1200; r += 3) {
    const rd = roads[r];
    if (rd.t !== 'pedestrian' && rd.t !== 'secondary' && rd.t !== 'primary') continue;
    const pts = rd.p;
    if (!pts || pts.length < 4) continue;
    if (Math.hypot(pts[0], pts[1]) > 1100) continue;
    const ax = pts[0], az = pts[1], bx = pts[2], bz = pts[3];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 22) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    const nx = -uz, nz = ux;
    const off = rd.w * 0.5 + 1.3;
    treeCoords.push([ax + ux * (len * 0.5) + nx * off, az + uz * (len * 0.5) + nz * off, 0.9]);
  }

  if (treeCoords.length > 0) {
    // Base blanqueada con cal (típica de Calama) + tronco café + copa de pimiento
    const baseTrunk = new THREE.CylinderGeometry(0.22, 0.28, 1.05, 6);
    baseTrunk.translate(0, 0.52, 0);
    const upperTrunk = new THREE.CylinderGeometry(0.16, 0.22, 1.5, 6);
    upperTrunk.translate(0, 1.75, 0);

    const crownA = new THREE.DodecahedronGeometry(1.85, 0);
    crownA.scale(1.15, 0.82, 1.15);
    crownA.translate(0, 3.45, 0);
    const crownB = new THREE.DodecahedronGeometry(1.3, 0);
    crownB.translate(0.85, 3.1, 0.4);
    const crownC = new THREE.DodecahedronGeometry(1.25, 0);
    crownC.translate(-0.8, 3.15, -0.45);
    const crownGeo = mergeParts(THREE, [crownA, crownB, crownC]);

    const whiteInst = new THREE.InstancedMesh(baseTrunk, new THREE.MeshLambertMaterial({ color: 0xeeece6 }), treeCoords.length);
    const barkInst = new THREE.InstancedMesh(upperTrunk, new THREE.MeshLambertMaterial({ color: 0x5c4330 }), treeCoords.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), treeCoords.length);
    whiteInst.name = 'PimientosBaseCal';
    barkInst.name = 'PimientosTronco';
    crownInst.name = 'PimientosCopa';

    for (let i = 0; i < treeCoords.length; i++) {
      const [tx, tz, sc] = treeCoords[i];
      dummy.position.set(tx, 0, tz);
      dummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      whiteInst.setMatrixAt(i, dummy.matrix);
      barkInst.setMatrixAt(i, dummy.matrix);
      crownInst.setMatrixAt(i, dummy.matrix);

      const gShade = 0.42 + (i % 5) * 0.045;
      colorTmp.setRGB(0.23 + (i % 3) * 0.03, gShade, 0.19 + (i % 4) * 0.02);
      crownInst.setColorAt(i, colorTmp);
    }
    whiteInst.instanceMatrix.needsUpdate = true;
    barkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;

    group.add(whiteInst, barkInst, crownInst);
  }

  // 3. FAROLAS URBANAS (alumbrado público de avenidas y centro)
  const lampCoords = [];
  for (let r = 0; r < roads.length && lampCoords.length < 650; r++) {
    const rd = roads[r];
    if (rd.t !== 'primary' && rd.t !== 'secondary' && rd.t !== 'tertiary' && rd.t !== 'pedestrian') continue;
    const pts = rd.p;
    if (!pts || pts.length < 4) continue;
    if (Math.hypot(pts[0], pts[1]) > 1400) continue;
    const ax = pts[0], az = pts[1], bx = pts[2], bz = pts[3];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 28) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    const nx = -uz, nz = ux;
    const off = rd.w * 0.5 + 0.85;
    const yaw = Math.atan2(-nx, -nz);
    lampCoords.push([ax + ux * 10 + nx * off, az + uz * 10 + nz * off, yaw]);
  }

  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2 });
  if (lampCoords.length > 0) {
    const lPole = new THREE.CylinderGeometry(0.07, 0.1, 5.8, 5);
    lPole.translate(0, 2.9, 0);
    const lArm = new THREE.BoxGeometry(0.1, 0.1, 1.35);
    lArm.translate(0, 5.75, 0.6);
    const poleGeo = mergeParts(THREE, [lPole, lArm]);
    const headGeo = new THREE.BoxGeometry(0.32, 0.14, 0.48);
    headGeo.translate(0, 5.65, 1.18);

    const poleInst = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x3b4046 }), lampCoords.length);
    const headInst = new THREE.InstancedMesh(headGeo, lampHeadMat, lampCoords.length);
    poleInst.name = 'FarolasPoste';
    headInst.name = 'FarolasLuminaria';

    for (let i = 0; i < lampCoords.length; i++) {
      const [lx, lz, yaw] = lampCoords[i];
      dummy.position.set(lx, 0, lz);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poleInst.setMatrixAt(i, dummy.matrix);
      headInst.setMatrixAt(i, dummy.matrix);
    }
    poleInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;
    group.add(poleInst, headInst);
  }

  // Controlador determinista de fases de semáforo (ciclo 24s: 12s N-S verde / E-O rojo, luego invierte)
  function getSignalStateAt(x, z, timeSec = 0, axis = null) {
    const cycle = ((timeSec % 24) + 24) % 24;
    const nsGreen = cycle < 12;
    let effectiveAxis = axis;
    if (!effectiveAxis) {
      // Buscar el semáforo cercano o alternar por paridad espacial
      const parity = (Math.floor(x / 80) + Math.floor(z / 80)) & 1;
      effectiveAxis = parity === 0 ? 'ns' : 'ew';
    }
    if (effectiveAxis === 'ns') {
      return nsGreen ? 'green' : 'red';
    }
    return nsGreen ? 'red' : 'green';
  }

  let lastPhaseBool = null;
  function updateSignalPhase(timeSec = 0) {
    if (!lensGreenMesh || !lensRedMesh) return;
    const nsGreen = (((timeSec % 24) + 24) % 24) < 12;
    if (nsGreen === lastPhaseBool) return;
    lastPhaseBool = nsGreen;

    const onGreen = new THREE.Color(0x28f06a);
    const dimGreen = new THREE.Color(0x10331b);
    const onRed = new THREE.Color(0xff3b30);
    const dimRed = new THREE.Color(0x361110);

    for (let i = 0; i < sigPositions.length; i++) {
      const isGreen = sigPositions[i].axis === 'ns' ? nsGreen : !nsGreen;
      lensGreenMesh.setColorAt(i, isGreen ? onGreen : dimGreen);
      lensRedMesh.setColorAt(i, isGreen ? dimRed : onRed);
    }
    if (lensGreenMesh.instanceColor) lensGreenMesh.instanceColor.needsUpdate = true;
    if (lensRedMesh.instanceColor) lensRedMesh.instanceColor.needsUpdate = true;
  }

  updateSignalPhase(0);

  return {
    group,
    signalsList: sigPositions,
    lampHeadMat,
    updateSignalPhase,
    getSignalStateAt,
  };
}
