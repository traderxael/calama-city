import test from 'node:test';
import assert from 'node:assert/strict';

import * as THREE from '../../web/vendor/three.module.min.js';
import { SpatialGrid } from '../../web/src/physics/SpatialGrid.js';
import { PlayerController } from '../../web/src/entities/PlayerController.js';
import { VehicleController } from '../../web/src/entities/VehicleController.js';
import { TrafficAndPeds } from '../../web/src/entities/TrafficAndPeds.js';
import { ThirdPersonCamera } from '../../web/src/entities/ThirdPersonCamera.js';

test('PlayerController moves, animates limbs, jumps and respects SpatialGrid building colliders', () => {
  const grid = new SpatialGrid(20);
  // Wall blocking z < -4
  grid.addPolygon([-20, -10, 20, -10, 20, -4, -20, -4], { id: 'wall' });

  const player = new PlayerController(THREE, { x: 0, z: 0 });
  assert.ok(player.mesh.isGroup);

  // Move north (-Z, cameraYaw = 0) for several frames
  for (let i = 0; i < 40; i++) {
    player.update(0.05, { forward: 1, right: 0, sprint: true, jump: i === 0 }, 0, grid);
  }

  // Must have moved towards -Z, animated legs, and stopped before z = -4 + radius
  assert.ok(player.z < -2.5);
  assert.ok(player.z >= -4 + player.radius - 0.05, `Player crossed wall: z=${player.z}`);
  assert.notEqual(player.leftLegPivot.rotation.x, 0, 'Legs should animate while running');
});

test('VehicleController accelerates, lights brakes, reduces high-speed steer and never tunnels at 35 m/s', () => {
  const grid = new SpatialGrid(20);
  // Thin 4m building across Z in [-8, -4]
  grid.addPolygon([-25, -8, 25, -8, 25, -4, -25, -4], { id: 'thinBuilding' });

  const pickup = new VehicleController(THREE, { variant: 'pickup_minera', x: 0, z: 10, yaw: 0 });
  assert.equal(pickup.wheels.length, 4);

  // Accelerate north (-Z when yaw=0)
  for (let i = 0; i < 20; i++) {
    pickup.update(0.05, { throttle: 1, steer: 0, handbrake: false }, grid);
  }
  assert.ok(pickup.speed > 5, `Expected speed > 5 m/s, got ${pickup.speed}`);
  assert.ok(pickup.speedKmh > 18);

  // Test brake light activation when reversing/braking while moving forward
  pickup.update(0.05, { throttle: -1, steer: 0.5, handbrake: false }, grid);
  assert.equal(pickup.braking, true);

  // Force extreme speed 35 m/s (126 km/h) right in front of thin 4m wall and step 0.1s (3.5m displacement)
  pickup.x = 0;
  pickup.z = -2.2;
  pickup.yaw = 0;
  pickup.speed = 35;
  pickup.update(0.1, { throttle: 1, steer: 0, handbrake: false }, grid);
  assert.ok(pickup.z >= -4 + pickup.collisionRadius - 0.08, `High-speed vehicle tunneled into wall: z=${pickup.z}`);
});

test('Entering and exiting vehicle finds safe non-colliding exit spot', () => {
  const grid = new SpatialGrid(20);
  // Block left side of vehicle with a wall (x in [-8, -1.0])
  grid.addPolygon([-8, -10, -1.0, -10, -1.0, 10, -8, 10], { id: 'leftWall' });

  const player = new PlayerController(THREE, { x: 2.0, z: 0 });
  const taxi = new VehicleController(THREE, { variant: 'colectivo', x: 0.4, z: 0, yaw: 0 });

  player.enterVehicle(taxi);
  assert.equal(player.inVehicle, taxi);
  assert.equal(player.mesh.visible, false);

  player.exitVehicle(grid);
  assert.equal(player.inVehicle, null);
  assert.equal(player.mesh.visible, true);
  // Since left side (-X) is blocked by wall, player must exit safely on right/front/back (x > 0)
  const check = grid.resolveCircle(player.x, player.z, player.radius);
  assert.equal(check.hit, false, `Player exited inside wall at (${player.x}, ${player.z})`);
});

test('TrafficAndPeds respects directed oneway graph edges and stops at red traffic signals', () => {
  // Simple directed graph: node 0 (0, 30) -> node 1 (0, 0) -> node 2 (0, -30) (oneway = 1)
  const fakeMap = {
    graph: {
      nodes: [0, 30, 0, 0, 0, -30],
      edges: [
        [0, 1, 0, 1],
        [1, 2, 0, 1],
      ],
    },
    signals: [0, 0],
    plazas: [{ p: [-15, -15, 15, -15, 15, 15, -15, 15] }],
    parks: [],
  };

  // Always red signal controller
  const redPropsCtrl = {
    getSignalStateAt: () => 'red',
  };

  const traffic = new TrafficAndPeds(THREE, fakeMap, redPropsCtrl, { maxCars: 2, maxPeds: 3 });
  assert.equal(traffic.cars.length, 2);
  assert.ok(traffic.peds.length >= 2);

  // Place car 0 approaching signal at (0, 0) along edge 0 -> 1
  const car0 = traffic.cars[0];
  car0.fromNode = 0;
  car0.toNode = 1;
  car0.progress = 0.78; // ~6.6 m before node 1 (0, 0)
  car0.speed = 8;

  for (let i = 0; i < 30; i++) {
    traffic.update(0.05, 0, 0, 1.0);
  }

  // Must remain on edge 0->1 stopped before the red light at node 1, never reversing against oneway
  assert.equal(car0.fromNode, 0);
  assert.equal(car0.toNode, 1);
  assert.ok(car0.speed < 0.5, `Car failed to stop at red signal: speed=${car0.speed}`);

  // Verify ThirdPersonCamera updates smoothly without NaN
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 4000);
  const camCtrl = new ThirdPersonCamera(cam);
  camCtrl.update(0.016, { x: 0, y: 0, z: 0, yaw: 0, inVehicle: false });
  assert.equal(Number.isFinite(cam.position.x), true);
});

test('VehicleController and PlayerController merge static sub-parts to keep GT 640 draw calls low', () => {
  const pickup = new VehicleController(THREE, { variant: 'pickup_minera' });
  let carMeshes = 0;
  pickup.mesh.traverse((o) => { if (o.isMesh) carMeshes++; });
  // Shadow (1) + merged body (1) + merged brake lights (1) + 4 merged wheels (4) <= 7 meshes
  assert.ok(carMeshes <= 7, `Too many meshes per vehicle (${carMeshes}); merge static parts for GT 640`);

  const player = new PlayerController(THREE, {});
  let playerMeshes = 0;
  player.mesh.traverse((o) => { if (o.isMesh) playerMeshes++; });
  // Shadow (1) + merged torso/head/hair (1) + 2 legs + 2 arms <= 6 meshes
  assert.ok(playerMeshes <= 6, `Too many meshes per character (${playerMeshes}); merge limb parts for GT 640`);
});

test('Hijacked AI traffic car stays parked where player exits instead of snapping back to old AI edge', () => {
  const fakeMap = {
    graph: {
      nodes: [0, 30, 0, 0, 0, -30],
      edges: [[0, 1, 0, 1], [1, 2, 0, 1]],
    },
    signals: [],
    plazas: [],
    parks: [],
  };
  const traffic = new TrafficAndPeds(THREE, fakeMap, null, { maxCars: 1, maxPeds: 0 });
  const aiCar = traffic.vehicles[0];
  const player = new PlayerController(THREE, { x: aiCar.x + 1, z: aiCar.z });

  player.enterVehicle(aiCar);
  // Player drives car far away to (150, -220)
  aiCar.x = 150;
  aiCar.z = -220;
  aiCar._syncTransform();
  player.exitVehicle(null);

  // Advance AI traffic update: exited car MUST remain parked at (150, -220), NOT snap back to graph edge near (0, 30)
  traffic.update(0.05, 150, -220, 2.0);
  assert.ok(Math.hypot(aiCar.x - 150, aiCar.z - (-220)) < 1.0, `Exited AI car snapped back to (${aiCar.x}, ${aiCar.z})`);
});
