/**
 * Cámara orbital y de persecución en tercera persona para pie y conducción,
 * con modos de distancia (cercana, estándar, panorámica aérea de Calama).
 */

const PRESETS = [
  { footDist: 5.8, footHeight: 2.35, carDist: 8.6, carHeight: 3.3 },
  { footDist: 8.5, footHeight: 3.8, carDist: 12.5, carHeight: 5.2 },
  { footDist: 28.0, footHeight: 22.0, carDist: 34.0, carHeight: 26.0 }, // Vista panorámica urbana
];

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.22;
    this.presetIndex = 0;
    this.manualTimer = 0;
    this.currentPos = null;
    this.currentLook = null;
  }

  cyclePreset() {
    this.presetIndex = (this.presetIndex + 1) % PRESETS.length;
    return this.presetIndex;
  }

  rotateBy(deltaYaw, deltaPitch) {
    this.yaw -= deltaYaw;
    this.pitch = Math.max(-0.08, Math.min(1.15, this.pitch + deltaPitch));
    this.manualTimer = 2.2;
  }

  update(dt, targetState) {
    if (!targetState) return;
    const preset = PRESETS[this.presetIndex];
    const inCar = Boolean(targetState.inVehicle);
    const dist = inCar ? preset.carDist : preset.footDist;
    const baseH = inCar ? preset.carHeight : preset.footHeight;

    if (this.manualTimer > 0) {
      this.manualTimer = Math.max(0, this.manualTimer - dt);
    } else if (inCar && Math.abs(targetState.speed || 0) > 1.2) {
      // Alinear suavemente detrás del vehículo al conducir
      let diff = targetState.yaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 3.8);
    }

    const horizDist = dist * Math.cos(this.pitch);
    const vertOffset = baseH + dist * Math.sin(this.pitch) * 0.65;

    // Detrás del objetivo: si yaw = 0 (mirando a -Z), la cámara se ubica en +Z
    const desiredX = targetState.x + Math.sin(this.yaw) * horizDist;
    const desiredY = (targetState.y || 0) + vertOffset;
    const desiredZ = targetState.z + Math.cos(this.yaw) * horizDist;

    const lookX = targetState.x - Math.sin(this.yaw) * (inCar ? 2.4 : 0.8);
    const lookY = (targetState.y || 0) + (inCar ? 1.35 : 1.45);
    const lookZ = targetState.z - Math.cos(this.yaw) * (inCar ? 2.4 : 0.8);

    if (!this.currentPos) {
      this.currentPos = { x: desiredX, y: desiredY, z: desiredZ };
      this.currentLook = { x: lookX, y: lookY, z: lookZ };
    } else {
      const k = Math.min(1, dt * 11.5);
      this.currentPos.x += (desiredX - this.currentPos.x) * k;
      this.currentPos.y += (desiredY - this.currentPos.y) * k;
      this.currentPos.z += (desiredZ - this.currentPos.z) * k;
      this.currentLook.x += (lookX - this.currentLook.x) * k;
      this.currentLook.y += (lookY - this.currentLook.y) * k;
      this.currentLook.z += (lookZ - this.currentLook.z) * k;
    }

    this.camera.position.set(this.currentPos.x, this.currentPos.y, this.currentPos.z);
    this.camera.lookAt(this.currentLook.x, this.currentLook.y, this.currentLook.z);
  }
}
