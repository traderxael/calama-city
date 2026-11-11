import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  worldToLatLon,
  worldToTile,
  searchMap,
  computeRoutePolyline,
  MapGPSController,
} from '../../web/src/ui/MapGPS.js';

const mapData = JSON.parse(fs.readFileSync(path.resolve('web/data/calama_map.json'), 'utf-8'));

test('searchMap finds real Calama landmarks, streets and POIs with diacritic-insensitive matching', () => {
  const rRamirez = searchMap(mapData, 'ramirez');
  assert.ok(rRamirez.length >= 1, 'Should match Eleuterio Ramírez without accent');
  assert.ok(rRamirez[0].label.toLowerCase().includes('ram'));

  const rCatedral = searchMap(mapData, 'Catedral');
  assert.ok(rCatedral.length >= 1);
  assert.equal(rCatedral[0].kind, 'landmark');
  assert.ok(Math.hypot(rCatedral[0].x, rCatedral[0].z) < 90);

  const rZorros = searchMap(mapData, 'Zorros');
  assert.ok(rZorros.length >= 1);
  assert.equal(rZorros[0].kind, 'landmark');

  const rCodelco = searchMap(mapData, 'Codelco');
  assert.ok(rCodelco.length >= 1);
});

test('computeRoutePolyline finds connected street route across Calama real road graph', () => {
  const estadio = mapData.landmarks.find((l) => l.kind === 'estadio');
  const route = computeRoutePolyline(mapData.graph, 0, 15, estadio.cx, estadio.cz);
  assert.ok(Array.isArray(route));
  assert.ok(route.length >= 4, `Expected multi-step street route, got ${route.length} points`);

  // Start near Plaza 23 de Marzo and end near Estadio Zorros del Desierto
  const startDist = Math.hypot(route[0][0] - 0, route[0][1] - 15);
  const endDist = Math.hypot(route[route.length - 1][0] - estadio.cx, route[route.length - 1][1] - estadio.cz);
  assert.ok(startDist < 85, `Route start too far from origin: ${startDist}`);
  assert.ok(endDist < 160, `Route end too far from stadium: ${endDist}`);
});

test('worldToTile computes exact Web Mercator tile coordinates for Plaza 23 de Marzo', () => {
  const ll = worldToLatLon(0, 0);
  assert.ok(Math.abs(ll.lat - (-22.4624)) < 1e-5);
  assert.ok(Math.abs(ll.lon - (-68.9272)) < 1e-5);

  const tile = worldToTile(0, 0, 16);
  // At lat=-22.4624, lon=-68.9272, zoom=16: (1 - ln(tan(lat)+sec(lat))/pi)/2 * 65536 = 36966.00
  assert.equal(tile.tx, 20220);
  assert.equal(tile.ty, 36966);
  assert.ok(tile.px >= 0 && tile.px < 256);
  assert.ok(tile.py >= 0 && tile.py < 256);
});

test('MapGPSController gracefully degrades to offline vector map when remote OSM tiles fail', async () => {
  const failingImageLoader = (_url, _onLoad, onError) => {
    queueMicrotask(() => onError(new Error('Network offline')));
  };

  const gps = new MapGPSController(mapData, {
    useOnlineTiles: true,
    imageLoader: failingImageLoader,
  });

  gps.requestTile(20220, 36976, 16);
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(gps.tileFallbackActive, true);
});
