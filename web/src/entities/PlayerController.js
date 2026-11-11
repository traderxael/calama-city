/**
 * Personaje 3D articulado en tercera persona con animación procedural de caminata/carrera,
 * salto, sombra de contacto y entrada/salida segura de vehículos.
 */

export class PlayerController {
  constructor(THREE, opts = {}) {
    this.THREE = THREE;
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.z = opts.z ?? 18;
    this.vy = 0;
    this.yaw = opts.yaw ?? 0;
    this.radius = 0.48;
    this.walkSpeed = 5.4;
    this.sprintSpeed = 9.2;
    this.jumpSpeed = 6.8;
    this.gravity = 19.5;
    this.onGround = true;
    this.inVehicle = null;
    this.animPhase = 0;
    this.currentSpeed = 0;

    const built = PlayerController.createCharacterMesh(THREE, opts.jacketColor ?? 0xd4622a);
    this.mesh = built.root;
    this.leftLegPivot = built.leftLegPivot;
    this.rightLegPivot = built.rightLegPivot;
    this.leftArmPivot = built.leftArmPivot;
    this.rightArmPivot = built.rightArmPivot;
    this.shadowBlob = built.shadowBlob;

    this._syncTransform();
  }

  static createCharacterMesh(THREE, jacketHex = 0xd4622a) {
    const root = new THREE.Group();
    root.name = 'JugadorCalama';

    const mSkin = new THREE.MeshLambertMaterial({ color: 0xd9a17c });
    const mHair = new THREE.MeshLambertMaterial({ color: 0x221c18 });
    const mJacket = new THREE.MeshLambertMaterial({ color: jacketHex });
    const mPants = new THREE.MeshLambertMaterial({ color: 0x28374a });
    const mShoes = new THREE.MeshLambertMaterial({ color: 0x3b2b20 });
    const mShadow = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    // Sombra de contacto suave en el suelo (cero coste de shadow map)
    const shadowGeo = new THREE.CircleGeometry(0.46, 12);
    shadowGeo.rotateX(-Math.PI * 0.5);
    const shadowBlob = new THREE.Mesh(shadowGeo, mShadow);
    shadowBlob.position.y = 0.03;
    root.add(shadowBlob);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.28), mJacket);
    torso.position.set(0, 1.13, 0);
    root.add(torso);

    // Cabeza + gorra/cabello
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), mSkin);
    head.position.set(0, 1.66, 0);
    root.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.38), mHair);
    hair.position.set(0, 1.82, -0.02);
    root.add(hair);

    // Piernas articuladas desde la cadera (y = 0.80)
    const makeLeg = (offsetX) => {
      const pivot = new THREE.Group();
      pivot.position.set(offsetX, 0.80, 0);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.68, 0.22), mPants);
      leg.position.set(0, -0.34, 0);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.14, 0.30), mShoes);
      shoe.position.set(0, -0.73, -0.04); // mira hacia -Z local
      pivot.add(leg, shoe);
      root.add(pivot);
      return pivot;
    };

    // Brazos articulados desde el hombro (y = 1.42)
    const makeArm = (offsetX) => {
      const pivot = new THREE.Group();
      pivot.position.set(offsetX, 1.42, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.54, 0.18), mJacket);
      sleeve.position.set(0, -0.25, 0);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mSkin);
      hand.position.set(0, -0.55, 0);
      pivot.add(sleeve, hand);
      root.add(pivot);
      return pivot;
    };

    const leftLegPivot = makeLeg(-0.14);
    const rightLegPivot = makeLeg(0.14);
    const leftArmPivot = makeArm(-0.35);
    const rightArmPivot = makeArm(0.35);

    return { root, leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot, shadowBlob };
  }

  enterVehicle(vehicle) {
    if (!vehicle) return;
    this.inVehicle = vehicle;
    vehicle.isPlayerDriven = true;
    this.mesh.visible = false;
    this.currentSpeed = 0;
  }

  exitVehicle(colliderGrid = null) {
    const v = this.inVehicle;
    if (!v) return;
    v.isPlayerDriven = false;
    v.braking = false;

    const cos = Math.cos(v.yaw);
    const sin = Math.sin(v.yaw);
    // Candidatos de salida: puerta izquierda, puerta derecha, atrás, adelante
    const localOffsets = [
      [-1.85, 0.0],
      [1.85, 0.0],
      [0.0, 3.2],
      [0.0, -3.2],
      [-2.4, 1.5],
      [2.4, 1.5],
    ];

    let chosenX = v.x - cos * 1.85;
    let chosenZ = v.z + sin * 1.85;

    if (colliderGrid) {
      for (const [lx, lz] of localOffsets) {
        const wx = v.x + lx * cos + lz * sin;
        const wz = v.z - lx * sin + lz * cos;
        const res = colliderGrid.resolveCircle(wx, wz, this.radius);
        if (!res.hit) {
          chosenX = wx;
          chosenZ = wz;
          break;
        }
      }
      const safe = colliderGrid.resolveCircle(chosenX, chosenZ, this.radius);
      chosenX = safe.x;
      chosenZ = safe.z;
    }

    this.x = chosenX;
    this.z = chosenZ;
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.yaw = v.yaw;
    this.inVehicle = null;
    this.mesh.visible = true;
    this._syncTransform();
  }

  teleportTo(x, z, colliderGrid = null) {
    if (this.inVehicle) {
      this.inVehicle.x = x;
      this.inVehicle.z = z;
      this.inVehicle.speed = 0;
      this.inVehicle._syncTransform();
      return;
    }
    let tx = x;
    let tz = z;
    if (colliderGrid) {
      const res = colliderGrid.resolveCircle(tx, tz, this.radius + 0.3);
      tx = res.x;
      tz = res.z;
    }
    this.x = tx;
    this.z = tz;
    this.y = 0;
    this.vy = 0;
    this._syncTransform();
  }

  update(dt, input = {}, cameraYaw = 0, colliderGrid = null) {
    if (this.inVehicle) {
      this.x = this.inVehicle.x;
      this.z = this.inVehicle.z;
      this.y = 0;
      this.yaw = this.inVehicle.yaw;
      return;
    }

    const fwd = (input.forward || 0);
    const right = (input.right || 0);
    const mag = Math.hypot(fwd, right);

    let moveX = 0;
    let moveZ = 0;

    if (mag > 0.01) {
      const nf = fwd / mag;
      const nr = right / mag;
      // Con cameraYaw = 0 mirando hacia el Norte (-Z): adelante = (0, -1), derecha = (+1, 0)
      const fwdX = -Math.sin(cameraYaw);
      const fwdZ = -Math.cos(cameraYaw);
      const rightX = Math.cos(cameraYaw);
      const rightZ = -Math.sin(cameraYaw);

      moveX = fwdX * nf + rightX * nr;
      moveZ = fwdZ * nf + rightZ * nr;

      const targetYaw = Math.atan2(-moveX, -moveZ);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 12);
    }

    const topSpeed = input.sprint ? this.sprintSpeed : this.walkSpeed;
    const desiredSpeed = mag > 0.01 ? topSpeed * Math.min(1, mag) : 0;
    this.currentSpeed += (desiredSpeed - this.currentSpeed) * Math.min(1, dt * 14);

    const nextX = this.x + moveX * this.currentSpeed * dt;
    const nextZ = this.z + moveZ * this.currentSpeed * dt;

    if (colliderGrid) {
      const col = colliderGrid.resolveSweptCircle(this.x, this.z, nextX, nextZ, this.radius);
      this.x = col.x;
      this.z = col.z;
    } else {
      this.x = nextX;
      this.z = nextZ;
    }

    // Salto y gravedad
    if (input.jump && this.onGround) {
      this.vy = this.jumpSpeed;
      this.onGround = false;
    }
    if (!this.onGround || this.y > 0) {
      this.vy -= this.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.onGround = true;
      }
    }

    // Animación de extremidades
    if (this.currentSpeed > 0.25 && this.onGround) {
      const freq = input.sprint ? 12.5 : 8.5;
      this.animPhase += dt * freq;
      const amp = Math.min(0.75, this.currentSpeed * 0.085);
      const s = Math.sin(this.animPhase) * amp;
      this.leftLegPivot.rotation.x = s;
      this.rightLegPivot.rotation.x = -s;
      this.leftArmPivot.rotation.x = -s * 0.85;
      this.rightArmPivot.rotation.x = s * 0.85;
    } else if (!this.onGround) {
      this.leftLegPivot.rotation.x = 0.35;
      this.rightLegPivot.rotation.x = -0.25;
      this.leftArmPivot.rotation.x = -0.5;
      this.rightArmPivot.rotation.x = -0.5;
    } else {
      const decay = Math.max(0, 1 - dt * 12);
      this.leftLegPivot.rotation.x *= decay;
      this.rightLegPivot.rotation.x *= decay;
      this.leftArmPivot.rotation.x *= decay;
      this.rightArmPivot.rotation.x *= decay;
    }

    this._syncTransform();
  }

  _syncTransform() {
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.yaw;
    if (this.shadowBlob) {
      this.shadowBlob.position.y = -this.y + 0.03;
      const sc = Math.max(0.55, 1 - this.y * 0.14);
      this.shadowBlob.scale.set(sc, sc, 1);
    }
  }
}
