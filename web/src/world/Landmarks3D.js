import * as BufferGeometryUtils from '../../vendor/BufferGeometryUtils.js';

/**
 * Modelos 3D arquitectónicos detallados de los hitos reales de Calama, Chile,
 * diseñados siguiendo las fotografías de Referencias/fotos/ y orientados sobre +Y.
 * Cada hito fusiona sus sub-geometrías por material para minimizar draw calls en la GT 640.
 */

function optimizeLandmarkGroup(THREE, group) {
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const litGeos = [];
  const unlitGeos = [];
  const toRemove = [];

  group.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const gClone = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    for (const attr of Object.keys(gClone.attributes)) {
      if (attr !== 'position' && attr !== 'normal') {
        gClone.deleteAttribute(attr);
      }
    }
    const relMat = new THREE.Matrix4().multiplyMatrices(invRoot, child.matrixWorld);
    gClone.applyMatrix4(relMat);

    const vCount = gClone.attributes.position.count;
    const col = child.material?.color || new THREE.Color(0xffffff);
    const colors = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    gClone.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    if (child.material?.isMeshBasicMaterial) {
      unlitGeos.push(gClone);
    } else {
      litGeos.push(gClone);
    }
    toRemove.push(child);
  });

  for (const ch of toRemove) {
    if (ch.parent) ch.parent.remove(ch);
  }
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }

  if (litGeos.length) {
    const merged = BufferGeometryUtils.mergeGeometries(litGeos, false);
    if (merged) {
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.name = `${group.name}_lit`;
      group.add(mesh);
    }
  }
  if (unlitGeos.length) {
    const merged = BufferGeometryUtils.mergeGeometries(unlitGeos, false);
    if (merged) {
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ vertexColors: true }));
      mesh.name = `${group.name}_emissive`;
      group.add(mesh);
    }
  }
  return group;
}

function box(THREE, w, h, d, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  return m;
}

function cyl(THREE, rt, rb, h, segs, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * 1. Catedral San Juan Bautista (frente a Plaza 23 de Marzo)
 * Inspirada en catedral_criss_salazar.jpg: fachada crema, molduras y pilastras rosado-terracota,
 * zócalo de piedra sillar, rosetón vitral azul, ventanas ojivales y aguja neogótica con cruz.
 */
export function createCatedral3D(THREE) {
  const g = new THREE.Group();
  g.name = 'CatedralSanJuanBautista';

  const mStone = new THREE.MeshLambertMaterial({ color: 0xc2b299 });
  const mCream = new THREE.MeshLambertMaterial({ color: 0xf2ece1 });
  const mTrim = new THREE.MeshLambertMaterial({ color: 0xc98c82 }); // rosado-terracota real
  const mRoof = new THREE.MeshLambertMaterial({ color: 0x3b3d42 });
  const mDarkWood = new THREE.MeshLambertMaterial({ color: 0x3a261a });
  const mStainedGlass = new THREE.MeshBasicMaterial({ color: 0x2f6398 });
  const mGold = new THREE.MeshLambertMaterial({ color: 0xd4af37 });

  // Zócalo de piedra sillar (base y=[0..2.2])
  g.add(box(THREE, 20, 2.2, 34, mStone, 0, 1.1, 0));

  // Nave central y naves laterales
  g.add(box(THREE, 12.2, 11.5, 31.5, mCream, 0, 2.2 + 5.75, -0.5));
  g.add(box(THREE, 19.2, 8.2, 30.5, mCream, 0, 2.2 + 4.1, -0.5));

  // Techos inclinados a dos aguas sobre la nave
  const roofSlopeL = box(THREE, 7.6, 0.45, 32.2, mRoof, -3.3, 14.9, -0.5, 0, 0, 0.42);
  const roofSlopeR = box(THREE, 7.6, 0.45, 32.2, mRoof, 3.3, 14.9, -0.5, 0, 0, -0.42);
  g.add(roofSlopeL, roofSlopeR);
  // Techos bajos laterales
  g.add(box(THREE, 4.2, 0.35, 31.0, mRoof, -7.8, 10.6, -0.5, 0, 0, 0.25));
  g.add(box(THREE, 4.2, 0.35, 31.0, mRoof, 7.8, 10.6, -0.5, 0, 0, -0.25));

  // Fachada principal frontal (+Z = +16.2)
  g.add(box(THREE, 19.4, 8.8, 0.9, mCream, 0, 6.6, 15.8));
  g.add(box(THREE, 12.0, 6.2, 0.9, mCream, 0, 12.8, 15.8));

  // Frontón triangular superior con cornisa rosado-terracota
  g.add(box(THREE, 7.4, 0.65, 1.15, mTrim, -3.0, 15.8, 16.0, 0, 0, 0.45));
  g.add(box(THREE, 7.4, 0.65, 1.15, mTrim, 3.0, 15.8, 16.0, 0, 0, -0.45));

  // 4 Pilastras verticales rosado-terracota
  for (const px of [-9.3, -4.6, 4.6, 9.3]) {
    const ph = Math.abs(px) < 6 ? 15.2 : 10.6;
    g.add(box(THREE, 0.85, ph, 1.25, mTrim, px, ph * 0.5 + 0.2, 16.05));
  }

  // Portal ojival central
  g.add(box(THREE, 4.5, 6.4, 1.3, mTrim, 0, 3.4, 16.1));
  g.add(box(THREE, 3.3, 5.2, 1.45, mDarkWood, 0, 2.8, 16.18));
  const archTop = cyl(THREE, 1.75, 1.75, 1.35, 12, mTrim, 0, 6.4, 16.1);
  archTop.rotation.x = Math.PI * 0.5;
  g.add(archTop);

  // Rosetón vitral azul central (y = 11.4)
  const roseFrame = cyl(THREE, 2.05, 2.05, 0.55, 18, mTrim, 0, 11.4, 16.25);
  roseFrame.rotation.x = Math.PI * 0.5;
  const roseGlass = cyl(THREE, 1.65, 1.65, 0.65, 18, mStainedGlass, 0, 11.4, 16.28);
  roseGlass.rotation.x = Math.PI * 0.5;
  g.add(roseFrame, roseGlass);

  // Ventanas ojivales gemelas a izquierda y derecha
  for (const side of [-1, 1]) {
    for (const dx of [-0.75, 0.75]) {
      const wx = side * 6.95 + dx;
      g.add(box(THREE, 1.05, 4.4, 0.45, mTrim, wx, 5.6, 16.2));
      g.add(box(THREE, 0.72, 3.8, 0.55, mStainedGlass, wx, 5.6, 16.25));
    }
  }

  // Torre campanario central (se eleva verticalmente sobre +Y hasta ~29.5 m)
  g.add(box(THREE, 5.4, 7.5, 5.4, mCream, 0, 19.2, 13.8));
  g.add(box(THREE, 5.8, 0.6, 5.8, mTrim, 0, 22.9, 13.8));
  // Ventanales de campanas en las 4 caras
  g.add(box(THREE, 2.6, 3.6, 5.6, mDarkWood, 0, 20.0, 13.8));
  g.add(box(THREE, 5.6, 3.6, 2.6, mDarkWood, 0, 20.0, 13.8));

  // Aguja piramidal alta + cruz
  const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(3.3, 6.8, 4), mRoof);
  mainSpire.position.set(0, 26.5, 13.8);
  mainSpire.rotation.y = Math.PI * 0.25;
  g.add(mainSpire);
  g.add(box(THREE, 0.22, 1.8, 0.22, mGold, 0, 30.5, 13.8));
  g.add(box(THREE, 1.0, 0.22, 0.22, mGold, 0, 30.8, 13.8));

  // Torretas laterales y pináculos de esquina
  for (const sx of [-4.6, 4.6]) {
    g.add(box(THREE, 1.6, 3.6, 1.6, mCream, sx, 17.2, 15.8));
    const sp = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.8, 4), mRoof);
    sp.position.set(sx, 20.4, 15.8);
    sp.rotation.y = Math.PI * 0.25;
    g.add(sp);
  }
  for (const sx of [-9.3, 9.3]) {
    g.add(box(THREE, 1.3, 2.6, 1.3, mCream, sx, 12.1, 15.8));
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4), mRoof);
    sp.position.set(sx, 14.5, 15.8);
    sp.rotation.y = Math.PI * 0.25;
    g.add(sp);
  }

  return g;
}

/**
 * 2. Plaza 23 de Marzo: Odeón octogonal tradicional, espejo de agua, bancas y farolas amarillas.
 */
export function createPlaza23DeMarzo3D(THREE) {
  const g = new THREE.Group();
  g.name = 'Plaza23DeMarzoElementos';

  const mStone = new THREE.MeshLambertMaterial({ color: 0xd8d0c2 });
  const mIron = new THREE.MeshLambertMaterial({ color: 0x263238 });
  const mCopper = new THREE.MeshLambertMaterial({ color: 0x437c6b }); // pátina cobre/verde
  const mWater = new THREE.MeshLambertMaterial({ color: 0x2b88a8 });
  const mWood = new THREE.MeshLambertMaterial({ color: 0x7a4e2d });
  const mYellowPole = new THREE.MeshLambertMaterial({ color: 0xe39c24 });
  const mBulb = new THREE.MeshBasicMaterial({ color: 0xfff3c4 });

  // Odeón central octogonal
  g.add(cyl(THREE, 5.2, 5.6, 1.1, 8, mStone, 0, 0.55, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(cyl(THREE, 0.14, 0.16, 3.8, 6, mIron, Math.cos(a) * 4.4, 3.0, Math.sin(a) * 4.4));
  }
  const dome = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.4, 8), mCopper);
  dome.position.set(0, 6.1, 0);
  g.add(dome);
  g.add(cyl(THREE, 0.08, 0.12, 1.2, 6, mIron, 0, 7.7, 0));

  // Fuente de agua lateral en la plaza
  g.add(cyl(THREE, 3.8, 4.0, 0.55, 14, mStone, 14, 0.28, -4));
  g.add(cyl(THREE, 3.3, 3.3, 0.48, 14, mWater, 14, 0.34, -4));
  g.add(cyl(THREE, 0.45, 0.7, 1.9, 10, mStone, 14, 1.0, -4));

  // Bancas tradicionales y farolas amarillas alrededor del paseo
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const bx = Math.cos(a) * 16.5;
    const bz = Math.sin(a) * 16.5;
    const bench = new THREE.Group();
    bench.add(box(THREE, 2.4, 0.12, 0.55, mWood, 0, 0.48, 0));
    bench.add(box(THREE, 2.4, 0.5, 0.1, mWood, 0, 0.76, -0.24));
    bench.add(box(THREE, 0.14, 0.48, 0.5, mIron, -0.95, 0.24, 0));
    bench.add(box(THREE, 0.14, 0.48, 0.5, mIron, 0.95, 0.24, 0));
    bench.position.set(bx, 0, bz);
    bench.rotation.y = -a + Math.PI * 0.5;
    g.add(bench);

    const lx = Math.cos(a + 0.35) * 22;
    const lz = Math.sin(a + 0.35) * 22;
    g.add(cyl(THREE, 0.09, 0.13, 4.8, 6, mYellowPole, lx, 2.4, lz));
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mBulb);
    globe.position.set(lx, 5.0, lz);
    g.add(globe);
  }

  return g;
}

/**
 * 3. Ilustre Municipalidad de Calama (inspirada en municipalidad_calama.jpg)
 * Fachada crema neoclásica, zócalo azul cerámico, balcón sobre ménsulas, frontón escalonado
 * y los 3 mástiles con banderas de Chile, Calama y Wiphala.
 */
export function createMunicipalidad3D(THREE) {
  const g = new THREE.Group();
  g.name = 'IlustreMunicipalidadDeCalama';

  const mCream = new THREE.MeshLambertMaterial({ color: 0xefe5cf });
  const mPinkTrim = new THREE.MeshLambertMaterial({ color: 0xdab6a8 });
  const mBlueBase = new THREE.MeshLambertMaterial({ color: 0x203f75 });
  const mWindow = new THREE.MeshLambertMaterial({ color: 0x2c475c });
  const mWood = new THREE.MeshLambertMaterial({ color: 0x5c361e });
  const mPole = new THREE.MeshLambertMaterial({ color: 0xd8dce0 });

  // Cuerpo principal de dos pisos altos + zócalo azul
  g.add(box(THREE, 24, 1.3, 18, mBlueBase, 0, 0.65, 0));
  g.add(box(THREE, 23.6, 10.2, 17.6, mCream, 0, 1.3 + 5.1, 0));
  g.add(box(THREE, 24.2, 0.6, 18.2, mPinkTrim, 0, 11.7, 0));

  // Frontón escalonado central característico
  g.add(box(THREE, 9.0, 1.8, 1.2, mCream, 0, 12.8, 8.4));
  g.add(box(THREE, 5.6, 1.5, 1.2, mCream, 0, 14.3, 8.4));
  g.add(box(THREE, 2.6, 1.0, 1.2, mPinkTrim, 0, 15.4, 8.4));

  // Puerta principal y balcón central en 2° piso con ménsulas
  g.add(box(THREE, 3.2, 4.2, 0.5, mWood, 0, 2.4, 8.85));
  g.add(box(THREE, 6.8, 0.45, 1.8, mPinkTrim, 0, 6.2, 9.5));
  g.add(box(THREE, 6.8, 1.05, 0.25, mCream, 0, 6.95, 10.25));
  g.add(box(THREE, 2.8, 3.4, 0.4, mWood, 0, 8.2, 8.85));

  // Ventanales en ambos niveles
  for (const wx of [-8.2, -4.5, 4.5, 8.2]) {
    g.add(box(THREE, 2.1, 3.0, 0.35, mWindow, wx, 3.5, 8.82));
    g.add(box(THREE, 2.1, 3.2, 0.35, mWindow, wx, 8.3, 8.82));
  }

  // Tres mástiles con banderas (Chile, Calama, Wiphala)
  const flagColors = [0xd52b1e, 0x1e5aa8, 0xf2a900];
  [-2.2, 0, 2.2].forEach((fx, idx) => {
    g.add(cyl(THREE, 0.05, 0.07, 5.5, 6, mPole, fx, 9.8, 10.3));
    const fMat = new THREE.MeshLambertMaterial({ color: flagColors[idx] });
    g.add(box(THREE, 1.35, 0.85, 0.06, fMat, fx + 0.68, 11.9, 10.3));
  });

  return g;
}

/**
 * 4. Edificio Corporativo Codelco Norte (inspirado en edificio_codelco.jpg)
 * Alas laterales de hormigón visto ranurado, torre cilíndrica derecha, muro cortina azul
 * con bandas cobre y la gran pérgola reticular color cobre/madera en el acceso central.
 */
export function createCodelcoNorte3D(THREE) {
  const g = new THREE.Group();
  g.name = 'EdificioCodelcoNorte';

  const mConcrete = new THREE.MeshLambertMaterial({ color: 0xbcbab4 });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x18527a });
  const mCopper = new THREE.MeshLambertMaterial({ color: 0xc57b42 });
  const mSteel = new THREE.MeshLambertMaterial({ color: 0x6f7780 });

  // Ala izquierda de hormigón visto (más alta, 21 m)
  g.add(box(THREE, 14, 21, 32, mConcrete, -22, 10.5, 0));
  // Ranuras horizontales de ventanas en hormigón
  for (let y = 4; y <= 18; y += 3.5) {
    g.add(box(THREE, 0.3, 0.7, 16, mGlass, -29.05, y, 4));
  }

  // Bloque central y derecho de muro cortina azul con franjas de cobre
  g.add(box(THREE, 36, 16.5, 22, mGlass, 4, 8.25, -4));
  for (let y = 3.2; y <= 15.5; y += 3.2) {
    g.add(box(THREE, 36.3, 0.32, 22.3, mCopper, 4, y, -4));
  }
  // Techo parasol metálico sobre muro cortina
  g.add(box(THREE, 38, 0.4, 25, mSteel, 4, 17.3, -4));

  // Torre cilíndrica lateral derecha de hormigón visto
  g.add(cyl(THREE, 4.2, 4.2, 18.0, 14, mConcrete, 25, 9.0, -2));

  // Icónica pérgola reticular elevada de cobre/madera sobre columnas en el patio delantero
  const pergY = 15.8;
  for (const px of [-10, -4, 2, 8]) {
    g.add(cyl(THREE, 0.32, 0.38, pergY, 8, mConcrete, px, pergY * 0.5, 11));
  }
  for (let gx = -13; gx <= 11; gx += 3.0) {
    g.add(box(THREE, 0.35, 0.55, 18, mCopper, gx, pergY, 10));
  }
  for (let gz = 2; gz <= 18; gz += 2.6) {
    g.add(box(THREE, 26, 0.38, 0.35, mCopper, -1, pergY + 0.35, gz));
  }

  return g;
}

/**
 * 5. Estadio Municipal Zorros del Desierto (inspirado en estadio_zorros.jpg + huella OSM)
 * Envolvente facetada color cobre brillante, graderías naranjas Cobreloa, cancha reglamentaria
 * con líneas blancas y 4 torres de iluminación de 26 m.
 */
export function createEstadioZorros3D(THREE, landmarkData = null) {
  const g = new THREE.Group();
  g.name = 'EstadioZorrosDelDesierto';

  const mCopper = new THREE.MeshLambertMaterial({ color: 0xc86432 });
  const mConcrete = new THREE.MeshLambertMaterial({ color: 0xcac6be });
  const mSeats = new THREE.MeshLambertMaterial({ color: 0xe85d1a }); // naranja Cobreloa
  const mPitch = new THREE.MeshLambertMaterial({ color: 0x2f8a3e });
  const mLine = new THREE.MeshBasicMaterial({ color: 0xf7f7f7 });
  const mTower = new THREE.MeshLambertMaterial({ color: 0x565c64 });
  const mFlood = new THREE.MeshBasicMaterial({ color: 0xfff8dc });

  // Dimensiones ajustadas a escala real del estadio (~136m x 106m exterior, cancha 96m x 62m)
  const extX = 132, extZ = 104, wallH = 15.5;
  const inX = 98, inZ = 68;

  // Cancha interior de césped + demarcación blanca
  g.add(box(THREE, inX, 0.25, inZ, mPitch, 0, 0.12, 0));
  g.add(box(THREE, 0.35, 0.28, 60, mLine, 0, 0.16, 0));
  g.add(box(THREE, 90, 0.28, 0.35, mLine, 0, 0.16, -30));
  g.add(box(THREE, 90, 0.28, 0.35, mLine, 0, 0.16, 30));
  g.add(box(THREE, 0.35, 0.28, 60, mLine, -45, 0.16, 0));
  g.add(box(THREE, 0.35, 0.28, 60, mLine, 45, 0.16, 0));

  // 4 Tribunas escalonadas + fachada exterior revestida en paneles de cobre
  // Norte y Sur
  for (const sz of [-1, 1]) {
    g.add(box(THREE, extX, wallH, 6.0, mCopper, 0, wallH * 0.5, sz * (extZ * 0.5 - 3)));
    g.add(box(THREE, inX + 8, 9.0, 10.0, mSeats, 0, 4.5, sz * (inZ * 0.5 + 6)));
    // Marquesina / techo voladizo color cobre sobre tribunas
    g.add(box(THREE, extX + 2, 0.8, 19.0, mCopper, 0, wallH + 0.4, sz * (extZ * 0.5 - 8.5)));
  }
  // Este y Oeste
  for (const sx of [-1, 1]) {
    g.add(box(THREE, 6.0, wallH, extZ - 12, mCopper, sx * (extX * 0.5 - 3), wallH * 0.5, 0));
    g.add(box(THREE, 10.0, 9.0, inZ + 6, mSeats, sx * (inX * 0.5 + 6), 4.5, 0));
    g.add(box(THREE, 19.0, 0.8, extZ, mCopper, sx * (extX * 0.5 - 8.5), wallH + 0.4, 0));
  }

  // Esquinas achaflanadas de hormigón visto (como en estadio_zorros.jpg)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(box(THREE, 12, wallH - 1, 12, mConcrete, sx * (extX * 0.5 - 6), (wallH - 1) * 0.5, sz * (extZ * 0.5 - 6), 0, Math.PI * 0.25, 0));
      // 4 Torres de iluminación de 26 m
      const tx = sx * (extX * 0.5 - 4);
      const tz = sz * (extZ * 0.5 - 4);
      g.add(cyl(THREE, 0.35, 0.55, 26, 6, mTower, tx, 13, tz));
      g.add(box(THREE, 4.2, 2.2, 0.6, mFlood, tx, 26.2, tz, 0.25 * sz, sx * sz * 0.6, 0));
    }
  }

  if (landmarkData && typeof landmarkData.angle === 'number') {
    g.userData.footprintAngle = landmarkData.angle;
  }
  return g;
}

/**
 * 6. Paseo Peatonal Eleuterio Ramírez + Monumento al Minero
 */
export function createPaseoRamirezYMinero3D(THREE) {
  const g = new THREE.Group();
  g.name = 'PaseoRamirezMonumentoMinero';

  const mStone = new THREE.MeshLambertMaterial({ color: 0xb7ab9a });
  const mBronze = new THREE.MeshLambertMaterial({ color: 0x8f5b34 });
  const mPergola = new THREE.MeshLambertMaterial({ color: 0xa6633c });
  const mGreen = new THREE.MeshLambertMaterial({ color: 0x3f7835 });

  // Pedestal escalonado de piedra
  g.add(box(THREE, 3.6, 0.6, 3.6, mStone, 0, 0.3, 0));
  g.add(box(THREE, 2.4, 1.8, 2.4, mStone, 0, 1.5, 0));

  // Escultura estilizada del Minero de Calama con casco y picota en alto
  g.add(box(THREE, 0.42, 1.2, 0.42, mBronze, -0.28, 3.0, 0));
  g.add(box(THREE, 0.42, 1.2, 0.42, mBronze, 0.28, 3.0, 0));
  g.add(box(THREE, 1.05, 1.35, 0.6, mBronze, 0, 4.25, 0));
  g.add(cyl(THREE, 0.32, 0.3, 0.5, 8, mBronze, 0, 5.2, 0));
  // Casco minero con ala
  g.add(cyl(THREE, 0.38, 0.44, 0.22, 10, mBronze, 0, 5.45, 0));
  // Brazos y picota minera
  g.add(box(THREE, 0.3, 1.15, 0.3, mBronze, 0.68, 4.75, 0.15, 0, 0, -0.55));
  g.add(box(THREE, 0.12, 1.7, 0.12, mBronze, 0.95, 5.4, 0.2, 0, 0, -0.35));
  g.add(box(THREE, 1.15, 0.16, 0.18, mBronze, 1.15, 6.1, 0.2, 0, 0, -0.35));

  // Pérgolas sombreadoras del Paseo Ramírez y jardineras
  for (const pz of [-12, 12]) {
    g.add(box(THREE, 0.25, 3.6, 0.25, mPergola, -3.2, 1.8, pz));
    g.add(box(THREE, 0.25, 3.6, 0.25, mPergola, 3.2, 1.8, pz));
    g.add(box(THREE, 7.2, 0.25, 4.2, mPergola, 0, 3.65, pz));
    g.add(box(THREE, 2.2, 0.65, 2.2, mStone, -2.8, 0.32, pz * 0.5));
    g.add(cyl(THREE, 0.9, 0.7, 0.9, 7, mGreen, -2.8, 1.0, pz * 0.5));
  }

  return g;
}

/**
 * 7. Mall Plaza Calama y Terminal de Buses
 */
export function createMallYTerminal3D(THREE, kind = 'mall') {
  const g = new THREE.Group();
  if (kind === 'terminal') {
    g.name = 'TerminalDeBusesCalama';
    const mHall = new THREE.MeshLambertMaterial({ color: 0xdcd4c6 });
    const mRoof = new THREE.MeshLambertMaterial({ color: 0x355c7d });
    const mGlass = new THREE.MeshLambertMaterial({ color: 0x4b7ea8 });
    g.add(box(THREE, 46, 8.5, 20, mHall, 0, 4.25, 0));
    g.add(box(THREE, 50, 0.9, 28, mRoof, 0, 9.0, 3));
    g.add(box(THREE, 36, 5.5, 0.5, mGlass, 0, 3.5, 10.1));
    // Tótem indicador Terminal
    g.add(box(THREE, 2.2, 12.5, 0.8, mRoof, 24, 6.25, 11));
    return g;
  }

  g.name = 'MallPlazaCalama';
  const mTerracotta = new THREE.MeshLambertMaterial({ color: 0xc86d51 });
  const mSand = new THREE.MeshLambertMaterial({ color: 0xe6dac8 });
  const mGlass = new THREE.MeshLambertMaterial({ color: 0x2d638c });
  const mSign = new THREE.MeshLambertMaterial({ color: 0xd62828 });

  g.add(box(THREE, 86, 12.5, 48, mSand, 0, 6.25, 0));
  g.add(box(THREE, 32, 14.5, 14, mTerracotta, 0, 7.25, 20));
  g.add(box(THREE, 20, 10.5, 1.0, mGlass, 0, 5.25, 27.1));
  // Tótem comercial alto
  g.add(cyl(THREE, 0.45, 0.6, 20, 8, mTerracotta, 46, 10, 22));
  g.add(box(THREE, 6.5, 3.8, 1.2, mSign, 46, 19.5, 22));
  return g;
}

/**
 * 8. Gran Dinosaurio del Parque El Loa (escultura icónica real en Parque El Loa)
 */
export function createDinosaurioLoa3D(THREE) {
  const g = new THREE.Group();
  g.name = 'GranDinosaurioParqueElLoa';

  const mBase = new THREE.MeshLambertMaterial({ color: 0xa89882 });
  const mDino = new THREE.MeshLambertMaterial({ color: 0x5c7a52 });

  g.add(box(THREE, 5.5, 0.7, 9.0, mBase, 0, 0.35, 0));
  // Patas
  for (const sx of [-0.9, 0.9]) {
    for (const sz of [-1.6, 1.6]) {
      g.add(cyl(THREE, 0.38, 0.45, 2.6, 7, mDino, sx, 1.9, sz));
    }
  }
  // Torso, cuello largo y cola de saurópodo
  const body = cyl(THREE, 1.25, 1.35, 4.4, 9, mDino, 0, 3.5, 0);
  body.rotation.x = Math.PI * 0.5;
  g.add(body);

  const neck = cyl(THREE, 0.35, 0.72, 4.6, 8, mDino, 0, 5.6, 2.9);
  neck.rotation.x = 0.55;
  g.add(neck);

  g.add(box(THREE, 0.75, 0.65, 1.35, mDino, 0, 7.5, 4.2));

  const tail = cyl(THREE, 0.15, 0.65, 4.8, 7, mDino, 0, 3.2, -3.9);
  tail.rotation.x = -1.25;
  g.add(tail);

  return g;
}

function makeRectCollider(cx, cz, halfW, halfD, yaw = 0) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const corners = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];
  const flat = [];
  for (const [lx, lz] of corners) {
    flat.push(cx + lx * c + lz * s, cz - lx * s + lz * c);
  }
  return flat;
}

export function buildLandmarks3D(THREE, mapData, colliderGrid = null, gltfLoader = null) {
  const group = new THREE.Group();
  group.name = 'HitosRealesCalama';

  const items = [];
  const seenKinds = new Set();
  const landmarks = mapData.landmarks || [];

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    // Evitar instanciar dos veces el mismo hito singular si hay múltiples ways con igual kind
    if (seenKinds.has(lm.kind) && lm.kind !== 'cobreloa') continue;
    seenKinds.add(lm.kind);

    let obj = null;
    let colliderPoly = null;
    const yaw = -(lm.angle || 0) + Math.PI * 0.5;

    switch (lm.kind) {
      case 'catedral': {
        obj = createCatedral3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        // La fachada en createCatedral3D mira a +Z; apuntarla hacia Plaza 23 de Marzo (-17.7, -2.1)
        const lookYaw = Math.atan2(-17.7 - lm.cx, -2.1 - lm.cz);
        obj.rotation.y = lookYaw;
        colliderPoly = lm.p && lm.p.length >= 6 ? lm.p : makeRectCollider(lm.cx, lm.cz, 10, 16, lookYaw);

        // Si se entrega GLTFLoader en navegador, cargar catedral_calama.glb opcionalmente si existe y normalizar Y-up
        if (gltfLoader && typeof gltfLoader.load === 'function') {
          gltfLoader.load(
            './assets/models/catedral_calama.glb',
            (gltf) => {
              if (!gltf || !gltf.scene) return;
              const box3 = new THREE.Box3().setFromObject(gltf.scene);
              const size = new THREE.Vector3();
              box3.getSize(size);
              // Solo adjuntar detalle GLB si tiene geometría sana; mantenemos nuestra fachada policromada fiel
              if (size.y > 1 && size.x > 1) {
                obj.userData.glbVerified = true;
              }
            },
            undefined,
            () => {}
          );
        }
        break;
      }
      case 'plaza23': {
        obj = createPlaza23DeMarzo3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        // Solo colisionar el odeón central (radio ~5.5 m), dejando toda la plaza caminable
        colliderPoly = makeRectCollider(lm.cx, lm.cz, 5.4, 5.4, 0);
        break;
      }
      case 'municipalidad': {
        obj = createMunicipalidad3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        obj.rotation.y = yaw;
        colliderPoly = lm.p && lm.p.length >= 6 ? lm.p : makeRectCollider(lm.cx, lm.cz, 12, 9, yaw);
        break;
      }
      case 'codelco': {
        obj = createCodelcoNorte3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        obj.rotation.y = yaw;
        colliderPoly = makeRectCollider(lm.cx, lm.cz, 28, 16, yaw);
        break;
      }
      case 'estadio': {
        obj = createEstadioZorros3D(THREE, lm);
        obj.position.set(lm.cx, 0, lm.cz);
        obj.rotation.y = -(lm.angle || 0);
        colliderPoly = lm.p && lm.p.length >= 6 ? lm.p : makeRectCollider(lm.cx, lm.cz, 66, 52, -(lm.angle || 0));
        break;
      }
      case 'paseo_ramirez': {
        obj = createPaseoRamirezYMinero3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        colliderPoly = makeRectCollider(lm.cx, lm.cz, 2.0, 2.0, 0);
        break;
      }
      case 'mall': {
        obj = createMallYTerminal3D(THREE, 'mall');
        obj.position.set(lm.cx, 0, lm.cz);
        obj.rotation.y = -(lm.angle || 0);
        colliderPoly = lm.p && lm.p.length >= 6 ? lm.p : makeRectCollider(lm.cx, lm.cz, 43, 24, -(lm.angle || 0));
        break;
      }
      case 'terminal': {
        obj = createMallYTerminal3D(THREE, 'terminal');
        obj.position.set(lm.cx, 0, lm.cz);
        obj.rotation.y = -(lm.angle || 0);
        colliderPoly = makeRectCollider(lm.cx, lm.cz, 23, 10, -(lm.angle || 0));
        break;
      }
      case 'dinosaurio_loa': {
        obj = createDinosaurioLoa3D(THREE);
        obj.position.set(lm.cx, 0, lm.cz);
        colliderPoly = makeRectCollider(lm.cx, lm.cz, 2.8, 4.5, 0);
        break;
      }
      default:
        break;
    }

    if (obj) {
      optimizeLandmarkGroup(THREE, obj);
      group.add(obj);
      if (colliderGrid && colliderPoly) {
        colliderGrid.addPolygon(colliderPoly, { kind: 'landmark', id: lm.id, name: lm.name });
      }
    }

    items.push({
      id: lm.id,
      name: lm.name,
      kind: lm.kind,
      x: lm.cx,
      z: lm.cz,
      object: obj,
    });
  }

  return { group, items };
}
