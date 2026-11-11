import { VehicleController } from './VehicleController.js';
import { PlayerController } from './PlayerController.js';

/**
 * Simulación ligera de vida urbana de Calama:
 * - Flota de vehículos IA (camionetas mineras, colectivos y sedanes) circulando por el
 *   grafo vial real respetando calles de un sentido (oneway) y los 209 semáforos.
 * - Peatones articulados paseando por Plaza 23 de Marzo, Paseo Ramírez y veredas cercanas.
 * - Cualquier vehículo IA puede ser abordado por el jugador con la tecla E.
 */

const CAR_PALETTE = [0xc8232c, 0xf2f4f7, 0x2d669b, 0xd4882a, 0x4f5d6b, 0x8b2635];
const PED_JACKETS = [0x2b5d8c, 0xc85a32, 0x3b7a57, 0x8e44ad, 0xd4a017, 0xc0392b];

export class TrafficAndPeds {
  constructor(THREE, mapData, propsCtrl = null, opts = {}) {
    this.THREE = THREE;
    this.mapData = mapData;
    this.propsCtrl = propsCtrl;
    this.maxCars = opts.maxCars ?? 18;
    this.maxPeds = opts.maxPeds ?? 22;

    this.group = new THREE.Group();
    this.group.name = 'TraficoYPeatonesCalama';

    this.nodes = mapData.graph?.nodes || [];
    this.edges = mapData.graph?.edges || [];
    this.adj = new Map();
    for (let i = 0; i < this.edges.length; i++) {
      const [u, v, roadIdx, oneway] = this.edges[i];
      let list = this.adj.get(u);
      if (!list) {
        list = [];
        this.adj.set(u, list);
      }
      list.push({ to: v, roadIdx, oneway });
    }

    // Indexar semáforos para consulta rápida de parada
    this.signalNodes = new Set();
    const sigs = mapData.signals || [];
    if (sigs.length > 0 && this.nodes.length > 0) {
      const nCount = this.nodes.length / 2;
      for (let s = 0; s < sigs.length; s += 2) {
        const sx = sigs[s], sz = sigs[s + 1];
        for (let n = 0; n < nCount; n++) {
          const dx = this.nodes[2 * n] - sx;
          const dz = this.nodes[2 * n + 1] - sz;
          if (dx * dx + dz * dz < 196) {
            this.signalNodes.add(n);
          }
        }
      }
    }

    this.cars = [];
    this.vehicles = [];
    this._initCars();

    this.peds = [];
    this._initPeds();
  }

  _pickSpawnEdge(centerX = 0, centerZ = 0, minDist = 0, maxDist = 240, seed = 0) {
    if (!this.edges.length) return null;
    const total = this.edges.length;
    for (let attempt = 0; attempt < 80; attempt++) {
      const idx = (seed * 97 + attempt * 131) % total;
      const [u, v] = this.edges[idx];
      const ux = this.nodes[2 * u], uz = this.nodes[2 * u + 1];
      const vx = this.nodes[2 * v], vz = this.nodes[2 * v + 1];
      const d = Math.hypot(ux - centerX, uz - centerZ);
      const len = Math.hypot(vx - ux, vz - uz);
      if (d >= minDist && d <= maxDist && len >= 10) {
        return { u, v };
      }
    }
    const [u, v] = this.edges[seed % total];
    return { u, v };
  }

  _initCars() {
    if (!this.edges.length) return;
    const variants = ['pickup_minera', 'colectivo', 'sedan', 'colectivo', 'pickup_minera', 'sedan'];

    for (let i = 0; i < this.maxCars; i++) {
      const variant = variants[i % variants.length];
      const color = variant === 'colectivo' ? 0x1c1e22 : CAR_PALETTE[i % CAR_PALETTE.length];
      const veh = new VehicleController(this.THREE, { variant, color, x: 0, z: 0 });
      this.group.add(veh.mesh);
      this.vehicles.push(veh);

      const edge = this._pickSpawnEdge(0, 0, 20, 220, i + 1);
      const ai = {
        vehicle: veh,
        fromNode: edge.u,
        toNode: edge.v,
        progress: (i * 0.19) % 0.85,
        speed: 7.5 + (i % 4) * 1.4,
        cruiseSpeed: 8.5 + (i % 4) * 1.5,
      };
      this._placeAiCar(ai);
      this.cars.push(ai);
    }
  }

  _placeAiCar(ai) {
    const ux = this.nodes[2 * ai.fromNode], uz = this.nodes[2 * ai.fromNode + 1];
    const vx = this.nodes[2 * ai.toNode], vz = this.nodes[2 * ai.toNode + 1];
    const dx = vx - ux, dz = vz - uz;
    const len = Math.hypot(dx, dz) || 1;
    const dirX = dx / len, dirZ = dz / len;
    // En Chile se conduce por la pista derecha: perpendicular derecha a (dirX, dirZ) en plano (X=Este, Z=Sur) es (-dirZ, dirX)
    const rightX = -dirZ;
    const rightZ = dirX;
    const laneOffset = 1.85;

    ai.vehicle.x = ux + dx * ai.progress + rightX * laneOffset;
    ai.vehicle.z = uz + dz * ai.progress + rightZ * laneOffset;
    ai.vehicle.yaw = Math.atan2(-dirX, -dirZ);
    ai.vehicle._syncTransform();
  }

  _initPeds() {
    const count = this.maxPeds;
    for (let i = 0; i < count; i++) {
      const built = PlayerController.createCharacterMesh(this.THREE, PED_JACKETS[i % PED_JACKETS.length]);
      const mesh = built.root;
      mesh.scale.setScalar(0.94 + (i % 3) * 0.04);
      this.group.add(mesh);

      // Distribuir entre Plaza 23 de Marzo, Paseo Ramírez y veredas cercanas
      const angle = (i / count) * Math.PI * 2;
      const rad = 10 + (i * 11) % 95;
      const startX = -15 + Math.cos(angle) * rad;
      const startZ = -2 + Math.sin(angle) * rad;

      this.peds.push({
        mesh,
        leftLeg: built.leftLegPivot,
        rightLeg: built.rightLegPivot,
        leftArm: built.leftArmPivot,
        rightArm: built.rightArmPivot,
        x: startX,
        z: startZ,
        dirAngle: angle + Math.PI * 0.5,
        speed: 1.25 + (i % 4) * 0.22,
        phase: i * 1.1,
        timer: 3 + (i % 5),
      });
    }
  }

  findClosestEnterableVehicle(px, pz, maxDist = 4.4, extraVehicles = []) {
    let best = null;
    let bestD = maxDist;
    const all = [...extraVehicles, ...this.vehicles];
    for (const v of all) {
      if (!v || v.isPlayerDriven) continue;
      const d = Math.hypot(v.x - px, v.z - pz);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  update(dt, focusX = 0, focusZ = 0, timeSec = 0, colliderGrid = null) {
    // 1. Actualizar autos IA
    for (let i = 0; i < this.cars.length; i++) {
      const ai = this.cars[i];
      const veh = ai.vehicle;
      if (veh.isPlayerDriven) continue;

      const ux = this.nodes[2 * ai.fromNode], uz = this.nodes[2 * ai.fromNode + 1];
      const vx = this.nodes[2 * ai.toNode], vz = this.nodes[2 * ai.toNode + 1];
      const dx = vx - ux, dz = vz - uz;
      const segLen = Math.max(1, Math.hypot(dx, dz));
      const remDist = (1 - ai.progress) * segLen;

      // Verificar semáforo al llegar a nodo con señal
      let mustStop = false;
      if (this.propsCtrl && this.signalNodes.has(ai.toNode) && remDist < 11.5 && remDist > 2.0) {
        const axis = Math.abs(dz) >= Math.abs(dx) ? 'ns' : 'ew';
        const state = this.propsCtrl.getSignalStateAt(vx, vz, timeSec, axis);
        if (state === 'red') {
          mustStop = true;
        }
      }

      const targetSpd = mustStop ? 0 : ai.cruiseSpeed;
      ai.speed += (targetSpd - ai.speed) * Math.min(1, dt * (mustStop ? 7.5 : 3.5));
      veh.braking = mustStop && ai.speed > 0.2;
      veh.brakeLightMat.color.setHex(veh.braking ? 0xff2a22 : 0x6e1414);

      ai.progress += (ai.speed * dt) / segLen;

      if (ai.progress >= 1.0) {
        const prev = ai.fromNode;
        const curr = ai.toNode;
        const neighbors = this.adj.get(curr) || [];
        let candidates = neighbors.filter((e) => e.to !== prev);
        if (!candidates.length) candidates = neighbors;

        if (candidates.length) {
          const pick = candidates[(i + Math.floor(timeSec)) % candidates.length];
          ai.fromNode = curr;
          ai.toNode = pick.to;
          ai.progress = 0;
        } else {
          const resp = this._pickSpawnEdge(focusX, focusZ, 95, 210, i + Math.floor(timeSec));
          if (resp) {
            ai.fromNode = resp.u;
            ai.toNode = resp.v;
            ai.progress = 0;
          }
        }
      }

      this._placeAiCar(ai);
      for (const w of veh.wheels) {
        w.spinPivot.rotation.x -= (ai.speed * dt) / w.radius;
      }

      // Reciclar autos muy lejanos para mantener vida constante alrededor del jugador
      if (Math.hypot(veh.x - focusX, veh.z - focusZ) > 275 && this.edges.length > 8) {
        const resp = this._pickSpawnEdge(focusX, focusZ, 105, 210, i * 13 + Math.floor(timeSec));
        if (resp) {
          ai.fromNode = resp.u;
          ai.toNode = resp.v;
          ai.progress = 0.1;
          this._placeAiCar(ai);
        }
      }
    }

    // 2. Actualizar peatones cercanos
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      p.timer -= dt;
      if (p.timer <= 0) {
        p.dirAngle += ((i % 2 === 0 ? 1 : -1) * 0.65);
        p.timer = 3.5 + (i % 4);
      }

      const nx = p.x + Math.cos(p.dirAngle) * p.speed * dt;
      const nz = p.z + Math.sin(p.dirAngle) * p.speed * dt;

      if (colliderGrid) {
        const res = colliderGrid.resolveCircle(nx, nz, 0.42);
        if (res.hit) {
          p.dirAngle += Math.PI * 0.65;
        }
        p.x = res.x;
        p.z = res.z;
      } else {
        p.x = nx;
        p.z = nz;
      }

      // Si se aleja más de 175 m del jugador, reubicar en el anillo alrededor del jugador
      if (Math.hypot(p.x - focusX, p.z - focusZ) > 180) {
        const a = (i * 2.1 + timeSec * 0.3) % (Math.PI * 2);
        let rx = focusX + Math.cos(a) * 85;
        let rz = focusZ + Math.sin(a) * 85;
        if (colliderGrid) {
          const safe = colliderGrid.resolveCircle(rx, rz, 0.6);
          rx = safe.x;
          rz = safe.z;
        }
        p.x = rx;
        p.z = rz;
      }

      p.phase += dt * 5.8;
      const swing = Math.sin(p.phase) * 0.42;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.leftArm.rotation.x = -swing * 0.7;
      p.rightArm.rotation.x = swing * 0.7;

      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = Math.atan2(-Math.cos(p.dirAngle), -Math.sin(p.dirAngle));
    }
  }
}
