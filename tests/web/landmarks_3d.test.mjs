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
