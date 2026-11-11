import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from '../../web/vendor/three.module.min.js';
import { earcut2D, polygonAreaSigned, pointInPolygon, closestPointOnSegment } from '../../web/src/utils/Geometry2D.js';
import { SpatialGrid } from '../../web/src/physics/SpatialGrid.js';
import { createCityTextures } from '../../web/src/world/ProceduralTextures.js';

test('THREE local vendor imports cleanly in ES module runtime', () => {
  const v = new THREE.Vector3(1, 2, 3);
  assert.equal(v.lengthSq(), 14);
});

test('earcut2D triangulates concave L-shape and polygon with inner hole accurately', () => {
  // L-shape: 10x10 minus 5x5 top-right => area = 100 - 25 = 75
  const lShape = [
    0, 0,
    10, 0,
    10, 5,
    5, 5,
    5, 10,
    0, 10,
  ];
  const trisL = earcut2D(lShape);
  assert.ok(trisL.length >= 12);
  let areaSum = 0;
  for (let i = 0; i < trisL.length; i += 3) {
    const ia = trisL[i], ib = trisL[i + 1], ic = trisL[i + 2];
    const ax = lShape[2 * ia], az = lShape[2 * ia + 1];
    const bx = lShape[2 * ib], bz = lShape[2 * ib + 1];
    const cx = lShape[2 * ic], cz = lShape[2 * ic + 1];
    areaSum += Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) * 0.5;
  }
  assert.ok(Math.abs(areaSum - 75) < 0.01, `Expected area 75, got ${areaSum}`);

  // Stadium-like ring: outer 20x20 (area 400) minus inner 10x10 (area 100) => net area = 300
  const outer = [0, 0, 20, 0, 20, 20, 0, 20];
  const hole = [5, 5, 5, 15, 15, 15, 15, 5];
  const merged = earcut2D(outer, [hole], true);
  let ringArea = 0;
  for (let i = 0; i < merged.indices.length; i += 3) {
    const ia = merged.indices[i], ib = merged.indices[i + 1], ic = merged.indices[i + 2];
    const ax = merged.vertices[2 * ia], az = merged.vertices[2 * ia + 1];
    const bx = merged.vertices[2 * ib], bz = merged.vertices[2 * ib + 1];
    const cx = merged.vertices[2 * ic], cz = merged.vertices[2 * ic + 1];
    ringArea += Math.abs((bx - ax) * (cz - az) - (bz - az) * (cx - ax)) * 0.5;
  }
  assert.ok(Math.abs(ringArea - 300) < 0.1, `Expected ring area 300, got ${ringArea}`);
});

test('SpatialGrid pushes penetrating circle out and slides smoothly along walls', () => {
  const grid = new SpatialGrid(20);
  // Building from x=[0..10], z=[0..10]
  grid.addPolygon([0, 0, 10, 0, 10, 10, 0, 10], { id: 'b1' });

  // Circle of radius 1.0 placed slightly inside left wall at (-0.4, 5)
  const res1 = grid.resolveCircle(-0.4, 5, 1.0);
  assert.equal(res1.hit, true);
  assert.ok(res1.x <= -0.99, `Expected pushed to x <= -1.0, got ${res1.x}`);
  assert.ok(Math.abs(res1.z - 5) < 0.05);

  // Diagonal movement into wall slides along Z instead of sticking
  const resSlide = grid.resolveSweptCircle(-1.1, 3.0, 0.2, 6.0, 1.0);
  assert.equal(resSlide.hit, true);
  assert.ok(resSlide.x <= -0.98);
  assert.ok(resSlide.z > 5.2, `Expected tangential slide along Z > 5.2, got ${resSlide.z}`);
});

test('SpatialGrid.resolveSweptCircle prevents high-speed tunneling through thin 4m building', () => {
  const grid = new SpatialGrid(20);
  // Thin building x=[4..8], z=[-10..10]
  grid.addPolygon([4, -10, 8, -10, 8, 10, 4, 10], { id: 'wall' });

  // Vehicle moves 14m in one step from x=0 to x=14 with radius 1.2
  const swept = grid.resolveSweptCircle(0, 0, 14, 0, 1.2);
  assert.equal(swept.hit, true);
  assert.ok(swept.x <= 2.85, `Vehicle tunneled through wall: x=${swept.x}`);
  assert.equal(pointInPolygon(swept.x, swept.z, [4, -10, 8, -10, 8, 10, 4, 10]), false);
});

test('SpatialGrid.findNearestRoad returns closest real street name', () => {
  const grid = new SpatialGrid(32);
  grid.addRoadSegment(-50, 0, 50, 0, { n: 'Eleuterio Ramírez', t: 'pedestrian', w: 8 });
  grid.addRoadSegment(0, -50, 0, -200, { n: 'Vivar', t: 'secondary', w: 12 });

  const near = grid.findNearestRoad(12, 3, 30);
  assert.ok(near);
  assert.equal(near.n, 'Eleuterio Ramírez');
});

test('createCityTextures returns complete procedural texture set with DataTexture fallback in headless Node', () => {
  const tex = createCityTextures(THREE);
  for (const key of ['facadeCommercial', 'facadeResidential', 'facadeModern', 'asphalt', 'cobbleRamirez', 'plazaTile', 'roofDesert']) {
    assert.ok(tex[key], `Missing texture ${key}`);
    assert.equal(tex[key].isTexture, true);
  }
});
