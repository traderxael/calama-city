import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import * as THREE from '../../web/vendor/three.module.min.js';
import { buildWorld } from '../../web/src/world/WorldBuilder.js';

const mapPath = path.resolve('web/data/calama_map.json');
const fullMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

function makeCentralSlice(radius = 650) {
  const inBox = (pts) => {
    for (let i = 0; i < pts.length; i += 2) {
      if (Math.abs(pts[i]) <= radius && Math.abs(pts[i + 1]) <= radius) return true;
    }
    return false;
  };
  return {
    ...fullMap,
    roads: fullMap.roads.filter((r) => inBox(r.p)),
    buildings: fullMap.buildings.filter((b) => inBox(b.p)),
    parks: fullMap.parks.filter((p) => inBox(p.p)),
    plazas: fullMap.plazas.filter((p) => inBox(p.p)),
    waterLines: fullMap.waterLines.filter((w) => inBox(w.p)),
    waterPolys: fullMap.waterPolys.filter((w) => inBox(w.p)),
    railways: fullMap.railways.filter((r) => inBox(r.p)),
  };
}

test('buildWorld builds valid chunked 3D meshes within GT 640 draw-call budget', () => {
  const slice = makeCentralSlice(650);
  const world = buildWorld(THREE, slice, { chunkSize: 500 });

  assert.ok(world.root.isGroup);
  assert.ok(world.stats.buildingCount >= 500, `Expected >= 500 central buildings, got ${world.stats.buildingCount}`);
  assert.ok(world.stats.roadCount >= 150, `Expected >= 150 central roads, got ${world.stats.roadCount}`);

  let meshCount = 0;
  let totalVerts = 0;
  world.root.traverse((obj) => {
    if (obj.isMesh || obj.isInstancedMesh) {
      meshCount++;
      const pos = obj.geometry?.attributes?.position;
      assert.ok(pos && pos.count > 0, `Empty geometry on ${obj.name}`);
      totalVerts += pos.count;
      // Spot-check NaN absence
      for (let i = 0; i < Math.min(30, pos.array.length); i++) {
        assert.equal(Number.isFinite(pos.array[i]), true, `NaN/Infinity in ${obj.name}`);
      }
    }
  });

  assert.ok(meshCount <= 95, `Too many static meshes for GT 640 in central view: ${meshCount}`);
  assert.ok(totalVerts > 5000);
});

test('buildWorld registers building colliders while keeping Plaza 23 de Marzo walkable', () => {
  const slice = makeCentralSlice(500);
  const world = buildWorld(THREE, slice, { chunkSize: 500 });

  // Center of Plaza 23 de Marzo (-17, -2) and spawn (0, 20) must be clear of building colliders
  const plazaCheck = world.colliderGrid.resolveCircle(-17, -2, 0.8);
  assert.equal(plazaCheck.hit, false, 'Plaza 23 de Marzo center should not collide with buildings');

  // Inside an actual building centroid must trigger collision pushout
  const sampleBuilding = slice.buildings[0];
  let cx = 0, cz = 0;
  const n = sampleBuilding.p.length / 2;
  for (let i = 0; i < n; i++) {
    cx += sampleBuilding.p[2 * i];
    cz += sampleBuilding.p[2 * i + 1];
  }
  cx /= n;
  cz /= n;
  const bCheck = world.colliderGrid.resolveCircle(cx, cz, 1.0);
  assert.equal(bCheck.hit, true, 'Point inside building polygon must collide');
});

test('StreetProps traffic signals alternate green and red deterministically over time', () => {
  const slice = makeCentralSlice(500);
  const world = buildWorld(THREE, slice, { chunkSize: 500 });

  const s0 = world.propsCtrl.getSignalStateAt(10, 20, 1.0, 'ns');
  const s1 = world.propsCtrl.getSignalStateAt(10, 20, 14.0, 'ns');
  const ew0 = world.propsCtrl.getSignalStateAt(10, 20, 1.0, 'ew');

  assert.ok(s0 === 'green' || s0 === 'red');
  assert.notEqual(s0, s1, 'Signal should switch phase after half cycle');
  assert.notEqual(s0, ew0, 'Perpendicular signal axis should have opposite phase');
});
