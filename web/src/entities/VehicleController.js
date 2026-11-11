/**
 * Vehículos 3D detallados característicos de Calama y modelo físico estable:
 * - 'pickup_minera': Camioneta 4x4 doble cabina roja/blanca con barra antivuelco y baliza minera
 * - 'colectivo': Taxi colectivo urbano negro con letrero amarillo de recorrido calameño
 * - 'sedan': Automóvil particular urbano
 */

export function createVehicleMesh(THREE, variant = 'pickup_minera', bodyColorOverride = null) {
  const root = new THREE.Group();
  root.name = `Vehiculo_${variant}`;

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const defaultColors = {
    pickup_minera: 0xc8232c, // Rojo camioneta minera clásica de faena en Calama
    colectivo: 0x1c1e22,     // Negro colectivo chileno
    sedan: 0x3b6e9c,
  };
  const bodyHex = bodyColorOverride ?? defaultColors[variant] ?? 0xc8232c;

  const mBody = new THREE.MeshLambertMaterial({ color: bodyHex });
  const mDark = new THREE.MeshLambertMaterial({ color: 0x22252a });
  const mChrome = new THREE.MeshLambertMaterial({ color: 0xcfd5dc });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x263b4d });
  const mHeadlight = new THREE.MeshBasicMaterial({ color: 0xfff8d8 });
  const brakeLightMat = new THREE.MeshBasicMaterial({ color: 0x6e1414 });
  const mTire = new THREE.MeshLambertMaterial({ color: 0x1b1c1e });
  const mRim = new THREE.MeshLambertMaterial({ color: 0xb8bec6 });

  // Sombra blob bajo el chasis
  const shadowGeo = new THREE.PlaneGeometry(2.35, 4.9);
  shadowGeo.rotateX(-Math.PI * 0.5);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false })
  );
  shadow.position.y = 0.035;
  root.add(shadow);

  if (variant === 'pickup_minera') {
    // Chasis inferior y parachoques alto 4x4 (frente mira a -Z)
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.62, 4.75), mBody);
    lower.position.set(0, 0.72, 0);
    bodyGroup.add(lower);

    // Cabina doble
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.68, 2.05), mBody);
    cab.position.set(0, 1.35, -0.15);
    bodyGroup.add(cab);

    // Cristales cabina
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.83, 0.48, 1.82), mGlass);
    glass.position.set(0, 1.34, -0.15);
    bodyGroup.add(glass);

    // Caja pick-up trasera hueca visual (interior oscuro)
    const bedInner = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.16, 1.55), mDark);
    bedInner.position.set(0, 1.04, 1.55);
    bodyGroup.add(bedInner);

    // Barra antivuelco minera negra + baliza ámbar en techo + pértiga corta
    const barL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 6), mDark);
    barL.position.set(-0.78, 1.36, 0.96);
    const barR = barL.clone();
    barR.position.x = 0.78;
    const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.08, 0.08), mDark);
    barTop.position.set(0, 1.72, 0.96);
    bodyGroup.add(barL, barR, barTop);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.16, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9f1c })
    );
    beacon.position.set(0, 1.76, -0.15);
    bodyGroup.add(beacon);

    // Franja reflectante blanca minera lateral
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.99, 0.10, 4.4),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })
    );
    stripe.position.set(0, 0.84, 0);
    bodyGroup.add(stripe);

    // Parachoques y parrilla delantera (-Z)
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.28, 0.22), mDark);
    bumperF.position.set(0, 0.48, -2.38);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 0.08), mChrome);
    grille.position.set(0, 0.78, -2.39);
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.24, 0.2), mDark);
    bumperR.position.set(0, 0.48, 2.38);
    bodyGroup.add(bumperF, grille, bumperR);
  } else {
    // Sedán o Colectivo Urbano de Calama
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.52, 4.35), mBody);
    lower.position.set(0, 0.58, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.56, 2.15), mBody);
    cab.position.set(0, 1.10, 0.05);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.69, 0.42, 1.92), mGlass);
    glass.position.set(0, 1.09, 0.05);
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.22, 0.18), mDark);
    bumperF.position.set(0, 0.40, -2.18);
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.22, 0.18), mDark);
    bumperR.position.set(0, 0.40, 2.18);
    bodyGroup.add(lower, cab, glass, bumperF, bumperR);

    if (variant === 'colectivo') {
      // Letrero amarillo iluminado de colectivo chileno en el techo
      const signMat = new THREE.MeshBasicMaterial({ color: 0xffd11a });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.24), signMat);
      sign.position.set(0, 1.52, -0.15);
      // Puertas/techo con detalle amarillo si es taxi básico o letrero línea
      bodyGroup.add(sign);
    }
  }

  // Focos delanteros (-Z) y luces de freno traseras (+Z)
  const zFront = variant === 'pickup_minera' ? -2.39 : -2.19;
  const zRear = variant === 'pickup_minera' ? 2.39 : 2.19;
  const yLight = variant === 'pickup_minera' ? 0.82 : 0.66;

  for (const sx of [-0.68, 0.68]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.06), mHeadlight);
    hl.position.set(sx, yLight, zFront);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.06), brakeLightMat);
    bl.position.set(sx, yLight, zRear);
    bodyGroup.add(hl, bl);
  }

  // 4 Ruedas independientes con giro y viraje delantero
  const wheelRadius = variant === 'pickup_minera' ? 0.40 : 0.34;
  const wheelWidth = 0.26;
  const wheelX = variant === 'pickup_minera' ? 0.94 : 0.88;
  const wheelZFront = variant === 'pickup_minera' ? -1.48 : -1.32;
  const wheelZRear = variant === 'pickup_minera' ? 1.45 : 1.32;

  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
  tireGeo.rotateZ(Math.PI * 0.5);
  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth + 0.02, 8);
  rimGeo.rotateZ(Math.PI * 0.5);

  const wheels = [];
  const wheelDefs = [
    { x: -wheelX, z: wheelZFront, front: true },
    { x: wheelX, z: wheelZFront, front: true },
    { x: -wheelX, z: wheelZRear, front: false },
    { x: wheelX, z: wheelZRear, front: false },
  ];

  for (const wd of wheelDefs) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wd.x, wheelRadius, wd.z);
    const spinPivot = new THREE.Group();
    spinPivot.add(new THREE.Mesh(tireGeo, mTire), new THREE.Mesh(rimGeo, mRim));
    steerPivot.add(spinPivot);
    root.add(steerPivot);
    wheels.push({ steerPivot, spinPivot, front: wd.front, radius: wheelRadius });
  }

  return { root, bodyGroup, wheels, brakeLightMat };
}

export class VehicleController {
  constructor(THREE, opts = {}) {
    this.THREE = THREE;
    this.variant = opts.variant || 'pickup_minera';
    this.x = opts.x ?? 4.5;
    this.z = opts.z ?? 22.0;
    this.yaw = opts.yaw ?? 0;
    this.speed = 0; // m/s (positivo = avanza hacia adelante -Z local)
    this.steerAngle = 0;
    this.wheelBase = this.variant === 'pickup_minera' ? 2.95 : 2.64;
    this.maxSpeed = opts.maxSpeed ?? 34.0; // ~122 km/h
    this.maxReverse = 11.5;
    this.accel = 13.5;
    this.brakeDecel = 24.0;
    this.drag = 1.65;
    this.maxSteer = 0.58;
    this.collisionRadius = 1.32;
    this.isPlayerDriven = false;
    this.braking = false;

    const built = createVehicleMesh(THREE, this.variant, opts.color ?? null);
    this.mesh = built.root;
    this.bodyGroup = built.bodyGroup;
    this.wheels = built.wheels;
    this.brakeLightMat = built.brakeLightMat;

    this._syncTransform();
  }

  get speedKmh() {
    return Math.abs(this.speed) * 3.6;
  }

  update(dt, input = {}, colliderGrid = null) {
    const throttle = Math.max(-1, Math.min(1, input.throttle || 0));
    const steerInput = Math.max(-1, Math.min(1, input.steer || 0));
    const handbrake = Boolean(input.handbrake);

    let isBraking = handbrake;

    if (handbrake) {
      const drop = this.brakeDecel * 1.25 * dt;
      if (Math.abs(this.speed) <= drop) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * drop;
    } else if (throttle > 0.01) {
      if (this.speed < -0.4) {
        this.speed += this.brakeDecel * throttle * dt;
        isBraking = true;
      } else {
        const factor = 1 - Math.max(0, this.speed) / (this.maxSpeed * 1.08);
        this.speed += this.accel * throttle * Math.max(0.15, factor) * dt;
      }
    } else if (throttle < -0.01) {
      if (this.speed > 0.4) {
        this.speed += this.brakeDecel * throttle * dt; // throttle < 0 frena
        isBraking = true;
      } else {
        this.speed += this.accel * 0.72 * throttle * dt;
      }
    } else {
      // Rozamiento natural al soltar acelerador
      const coast = 3.6 * dt;
      if (Math.abs(this.speed) <= coast) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * coast;
    }

    // Resistencia aerodinámica suave y topes
    this.speed -= this.speed * 0.18 * dt;
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));

    this.braking = isBraking;
    this.brakeLightMat.color.setHex(isBraking ? 0xff2a22 : 0x6e1414);

    // Dirección sensible a la velocidad para evitar trompos irreales
    const speedSensitivity = 1 / (1 + Math.abs(this.speed) * 0.075);
    const targetSteer = -steerInput * this.maxSteer * speedSensitivity;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, dt * 11);

    if (Math.abs(this.speed) > 0.12) {
      const angularVel = (this.speed / this.wheelBase) * Math.tan(this.steerAngle);
      this.yaw += angularVel * dt;
    }

    // Frente local es -Z => vector avance mundial = (-sin(yaw), -cos(yaw))
    const fwdX = -Math.sin(this.yaw);
    const fwdZ = -Math.cos(this.yaw);
    const nextX = this.x + fwdX * this.speed * dt;
    const nextZ = this.z + fwdZ * this.speed * dt;

    if (colliderGrid) {
      const col = colliderGrid.resolveSweptCircle(this.x, this.z, nextX, nextZ, this.collisionRadius);
      this.x = col.x;
      this.z = col.z;
      if (col.hit) {
        // Amortiguar componente normal de velocidad al rozar o impactar un muro
        const vn = fwdX * col.normalX + fwdZ * col.normalZ;
        if ((this.speed > 0 && vn < -0.2) || (this.speed < 0 && vn > 0.2)) {
          this.speed *= Math.max(0.15, 1 - Math.abs(vn) * 0.78);
        }
      }
    } else {
      this.x = nextX;
      this.z = nextZ;
    }

    // Giro y dirección visual de las 4 ruedas + balanceo sutil de carrocería
    for (const w of this.wheels) {
      if (w.front) w.steerPivot.rotation.y = this.steerAngle;
      w.spinPivot.rotation.x -= (this.speed * dt) / w.radius;
    }
    this.bodyGroup.rotation.z = this.steerAngle * Math.min(0.08, Math.abs(this.speed) * 0.004);
    this.bodyGroup.rotation.x = isBraking && this.speed > 2 ? -0.025 : (throttle > 0.2 ? 0.015 : 0);

    this._syncTransform();
  }

  _syncTransform() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.yaw;
  }
}
