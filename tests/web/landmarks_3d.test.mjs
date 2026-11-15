import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import * as THREE from '../../web/vendor/three.module.min.js';
import {
  createCatedral3D,
  createPlaza23DeMarzo3D,
  createMunicipalidad3D,
  createCodelcoNorte3D,
  createEstadioZorros3D,
  createPaseoRamirezYMinero3D,
  createMallYTerminal3D,
  createDinosaurioLoa3D,
  createHospitalDelCobre3D,
  createColegioChuquicamata3D,
  createClinicaMutual3D,
  buildLandmarks3D,
} from '../../web/src/world/Landmarks3D.js';
import { SpatialGrid } from '../../web/src/physics/SpatialGrid.js';

const mapData = JSON.parse(fs.readFileSync(path.resolve('web/data/calama_map.json'), 'utf-8'));

function computeBounds(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  return box;
}

test('All Calama 3D landmark builders stand upright on +Y axis without Z-up tilt bugs', () => {
  const cat = createCatedral3D(THREE);
  const bCat = computeBounds(cat);
  assert.ok(bCat.min.y >= -0.5 && bCat.min.y <= 0.4, `Cathedral base off ground: ${bCat.min.y}`);
  assert.ok(bCat.max.y >= 24 && bCat.max.y <= 38, `Cathedral spire height unexpected: ${bCat.max.y}`);
  const catWidth = bCat.max.x - bCat.min.x;
  assert.ok(bCat.max.y > catWidth, 'Cathedral tower must rise higher on +Y than nave width');

  const muni = createMunicipalidad3D(THREE);
  const bMuni = computeBounds(muni);
  assert.ok(bMuni.min.y >= -0.4 && bMuni.min.y <= 0.4);
  assert.ok(bMuni.max.y >= 12 && bMuni.max.y <= 24);

  const cod = createCodelcoNorte3D(THREE);
  const bCod = computeBounds(cod);
  assert.ok(bCod.min.y >= -0.4 && bCod.min.y <= 0.4);
  assert.ok(bCod.max.y >= 16 && bCod.max.y <= 32);

  const estadioData = mapData.landmarks.find((l) => l.kind === 'estadio');
  const est = createEstadioZorros3D(THREE, estadioData);
  const bEst = computeBounds(est);
  assert.ok(bEst.min.y >= -0.5 && bEst.min.y <= 0.5);
  assert.ok(bEst.max.y >= 20, `Stadium floodlight towers should be >= 20m, got ${bEst.max.y}`);

  const plz = createPlaza23DeMarzo3D(THREE);
  const bPlz = computeBounds(plz);
  assert.ok(bPlz.min.y >= -0.4 && bPlz.max.y >= 5.5);

  const minero = createPaseoRamirezYMinero3D(THREE);
  const bMin = computeBounds(minero);
  assert.ok(bMin.min.y >= -0.4 && bMin.max.y >= 5.0);

  const mall = createMallYTerminal3D(THREE, 'mall');
  assert.ok(computeBounds(mall).max.y >= 10);

  const dino = createDinosaurioLoa3D(THREE);
  assert.ok(computeBounds(dino).max.y >= 6.5);
});

test('buildLandmarks3D places real Calama landmarks at accurate OSM coordinates and registers colliders', () => {
  const grid = new SpatialGrid(32);
  const res = buildLandmarks3D(THREE, mapData, grid);

  assert.ok(res.group.isGroup);
  const kinds = new Set(res.items.map((i) => i.kind));
  for (const k of ['catedral', 'plaza23', 'municipalidad', 'codelco', 'estadio', 'mall', 'terminal', 'paseo_ramirez']) {
    assert.equal(kinds.has(k), true, `Missing landmark kind: ${k}`);
  }

  const catedralItem = res.items.find((i) => i.kind === 'catedral');
  assert.ok(Math.hypot(catedralItem.x, catedralItem.z) < 90, 'Cathedral must sit right next to Plaza 23 de Marzo');

  // Inside Cathedral center must collide
  const colCat = grid.resolveCircle(catedralItem.x, catedralItem.z, 1.0);
  assert.equal(colCat.hit, true);
});

test('Landmarks3D instantiates Cobreloa 3D mesh and keeps Mall Plaza parking esplanade free of invisible walls', () => {
  const grid = new SpatialGrid(32);
  const res = buildLandmarks3D(THREE, mapData, grid);

  const cobreloaItems = res.items.filter((i) => i.kind === 'cobreloa' && i.object !== null);
  assert.ok(cobreloaItems.length >= 1, 'Cobreloa landmarks must have non-null 3D mesh');

  const mallItem = res.items.find((i) => i.kind === 'mall');
  assert.ok(mallItem);
  // 120m away from Mall building center (inside outer parking lot) must NOT hit invisible Mall building collider
  const parkingCheck = grid.resolveCircle(mallItem.x, mallItem.z + 120, 1.2);
  assert.equal(parkingCheck.hit, false, 'Mall parking lot 120m from Mall building should not have invisible wall');
});

test('Peripheral Calama landmarks (Hospital del Cobre, Colegio Chuquicamata, Clínica Mutual) build upright 3D models', () => {
  const hosp = createHospitalDelCobre3D(THREE);
  const bH = computeBounds(hosp);
  assert.ok(bH.min.y >= -0.5 && bH.min.y <= 0.4, `Hospital del Cobre base off ground: ${bH.min.y}`);
  assert.ok(bH.max.y >= 14 && bH.max.y <= 22, `Hospital height unexpected: ${bH.max.y}`);
  assert.ok(bH.max.x - bH.min.x > 80, 'Hospital del Cobre must be a wide low-rise complex');

  const col = createColegioChuquicamata3D(THREE);
  const bC = computeBounds(col);
  assert.ok(bC.min.y >= -0.5 && bC.min.y <= 0.4, `Colegio base off ground: ${bC.min.y}`);
  assert.ok(bC.max.y >= 8 && bC.max.y <= 18, `Colegio height unexpected: ${bC.max.y}`);
  assert.ok(bC.max.x - bC.min.x > 180, 'Colegio Chuquicamata must be a large campus');

  const cl = createClinicaMutual3D(THREE);
  const bL = computeBounds(cl);
  assert.ok(bL.min.y >= -0.5 && bL.min.y <= 0.4, `Clínica base off ground: ${bL.min.y}`);
  assert.ok(bL.max.y >= 16 && bL.max.y <= 26, `Clínica height unexpected: ${bL.max.y}`);
  // Compact mid-rise: tower clearly taller than the 26m-wide main block (canopy excluded from this check)
  assert.ok(bL.max.y > 18, 'Clínica Mutual must be a genuine mid-rise building');
});

test('buildLandmarks3D emits the three peripheral landmarks at their real OSM coordinates with colliders', () => {
  const grid = new SpatialGrid(32);
  const res = buildLandmarks3D(THREE, mapData, grid);
  const byKind = new Map();
  for (const it of res.items) if (!byKind.has(it.kind)) byKind.set(it.kind, it);

  const expected = {
    hospital_cobre: { dist: [1700, 2100], z: [-1150, -800] },
    colegio_chuquicamata: { dist: [1450, 1700], z: [1600, 1900] },
    clinica_mutual: { dist: [450, 750], z: [-2650, -2400] },
  };

  for (const [kind, box] of Object.entries(expected)) {
    const it = byKind.get(kind);
    assert.ok(it, `Missing peripheral landmark: ${kind}`);
    assert.ok(it.object, `${kind} must instantiate a 3D mesh`);
    assert.ok(it.x >= box.dist[0] && it.x <= box.dist[1], `${kind} x=${Math.round(it.x)} out of range`);
    assert.ok(it.z >= box.z[0] && it.z <= box.z[1], `${kind} z=${Math.round(it.z)} out of range`);
    const col = grid.resolveCircle(it.x, it.z, 1.5);
    assert.equal(col.hit, true, `${kind} must register a collider at its center`);
  }
});
