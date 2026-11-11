/**
 * Generador de texturas procedurales de estilo nortino / Calama para Three.js.
 * Usa <canvas> 2D en navegador y cae automáticamente a DataTexture en Node headless (tests).
 */

function makeFallbackDataTexture(THREE, r, g, b, w = 16, h = 16) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const jitter = ((i * 37) % 13) - 6;
    data[i * 4] = Math.max(0, Math.min(255, r + jitter));
    data[i * 4 + 1] = Math.max(0, Math.min(255, g + jitter));
    data[i * 4 + 2] = Math.max(0, Math.min(255, b + jitter));
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function finalizeCanvasTexture(THREE, canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createCityTextures(THREE, doc = globalThis.document) {
  if (!doc || typeof doc.createElement !== 'function') {
    return {
      facadeResidential: makeFallbackDataTexture(THREE, 218, 202, 178),
      facadeCommercial: makeFallbackDataTexture(THREE, 206, 188, 166),
      facadeModern: makeFallbackDataTexture(THREE, 120, 162, 196),
      asphalt: makeFallbackDataTexture(THREE, 46, 48, 52),
      cobbleRamirez: makeFallbackDataTexture(THREE, 176, 154, 134),
      plazaTile: makeFallbackDataTexture(THREE, 208, 198, 182),
      roofDesert: makeFallbackDataTexture(THREE, 148, 132, 116),
    };
  }

  // 1. Fachada residencial nortina (1 celda = ~3.5 m ancho x 3.2 m alto)
  const cRes = doc.createElement('canvas');
  cRes.width = 256;
  cRes.height = 256;
  {
    const ctx = cRes.getContext('2d');
    ctx.fillStyle = '#efe6d8';
    ctx.fillRect(0, 0, 256, 256);
    // Zócalo inferior guardapolvo desértico
    ctx.fillStyle = '#c2b29b';
    ctx.fillRect(0, 212, 256, 44);
    // Cornisa superior
    ctx.fillStyle = '#d4c5b0';
    ctx.fillRect(0, 0, 256, 18);
    // Textura fina de estuco
    for (let i = 0; i < 650; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(90,70,50,0.08)';
      ctx.fillRect(x, y, 2, 2);
    }
    // Dos ventanas con marco de aluminio/madera y persiana sutil
    for (const wx of [34, 148]) {
      ctx.fillStyle = '#8b7b6b';
      ctx.fillRect(wx - 5, 68, 78, 96);
      const grad = ctx.createLinearGradient(wx, 72, wx + 68, 158);
      grad.addColorStop(0, '#2a445e');
      grad.addColorStop(0.55, '#466c8c');
      grad.addColorStop(1, '#1f3246');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, 73, 68, 86);
      // Cortina interior clara parcial
      ctx.fillStyle = 'rgba(238, 228, 206, 0.25)';
      ctx.fillRect(wx + 4, 77, 26, 78);
      // División cruceta
      ctx.fillStyle = '#cfc6ba';
      ctx.fillRect(wx + 32, 73, 4, 86);
      ctx.fillRect(wx, 112, 68, 3);
    }
  }

  // 2. Fachada comercial céntrica (galerías, vitrinas, marcos de piso)
  const cCom = doc.createElement('canvas');
  cCom.width = 256;
  cCom.height = 256;
  {
    const ctx = cCom.getContext('2d');
    ctx.fillStyle = '#e7dfd3';
    ctx.fillRect(0, 0, 256, 256);
    // Franja divisoria entre pisos
    ctx.fillStyle = '#b99d82';
    ctx.fillRect(0, 0, 256, 22);
    ctx.fillStyle = '#9f523a';
    ctx.fillRect(0, 22, 256, 8);
    ctx.fillStyle = '#bfb4a4';
    ctx.fillRect(0, 232, 256, 24);
    // Ventanales triples comerciales / oficinas
    for (const wx of [18, 98, 178]) {
      ctx.fillStyle = '#5c554e';
      ctx.fillRect(wx - 3, 52, 64, 148);
      const g = ctx.createLinearGradient(wx, 56, wx + 58, 196);
      g.addColorStop(0, '#274863');
      g.addColorStop(0.5, '#5380a1');
      g.addColorStop(1, '#20364a');
      ctx.fillStyle = g;
      ctx.fillRect(wx, 55, 58, 142);
      ctx.fillStyle = 'rgba(255, 225, 170, 0.18)';
      ctx.fillRect(wx + 4, 130, 50, 62);
      ctx.fillStyle = '#47423d';
      ctx.fillRect(wx, 124, 58, 5);
    }
  }

  // 3. Fachada moderna corporativa / muro cortina (Codelco, bancos, hoteles)
  const cMod = doc.createElement('canvas');
  cMod.width = 256;
  cMod.height = 256;
  {
    const ctx = cMod.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#2c5a7d');
    g.addColorStop(0.5, '#4b86ad');
    g.addColorStop(1, '#1f425c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    // Perfiles metálicos y losa entre pisos
    ctx.fillStyle = '#8b959e';
    ctx.fillRect(0, 0, 256, 20);
    ctx.fillStyle = '#b87240'; // acento cobre calameño
    ctx.fillRect(0, 20, 256, 6);
    for (let x = 0; x < 256; x += 64) {
      ctx.fillStyle = '#243442';
      ctx.fillRect(x, 0, 6, 256);
    }
  }

  // 4. Asfalto urbano con micrograno árido
  const cAsp = doc.createElement('canvas');
  cAsp.width = 256;
  cAsp.height = 256;
  {
    const ctx = cAsp.getContext('2d');
    ctx.fillStyle = '#2d3035';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const x = (i * 97) % 256;
      const y = (i * 53) % 256;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(210,195,170,0.09)' : 'rgba(15,16,18,0.18)';
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // 5. Adoquín del Paseo Peatonal Eleuterio Ramírez
  const cCob = doc.createElement('canvas');
  cCob.width = 256;
  cCob.height = 256;
  {
    const ctx = cCob.getContext('2d');
    ctx.fillStyle = '#b89f88';
    ctx.fillRect(0, 0, 256, 256);
    const rows = 8;
    const cols = 4;
    const rh = 256 / rows;
    const cw = 256 / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off;
        const y = r * rh;
        ctx.fillStyle = (r + c) % 3 === 0 ? '#c8ae96' : '#a88d77';
        ctx.fillRect(x + 2, y + 2, cw - 4, rh - 4);
      }
    }
  }

  // 6. Baldosa ornamental de Plaza 23 de Marzo
  const cPlz = doc.createElement('canvas');
  cPlz.width = 256;
  cPlz.height = 256;
  {
    const ctx = cPlz.getContext('2d');
    ctx.fillStyle = '#ddd5c7';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#aba193';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    ctx.fillStyle = '#756f68';
    ctx.fillRect(0, 120, 256, 16);
    ctx.fillRect(120, 0, 16, 256);
  }

  // 7. Azoteas y techos nortinos con polvo de caliche
  const cRoof = doc.createElement('canvas');
  cRoof.width = 128;
  cRoof.height = 128;
  {
    const ctx = cRoof.getContext('2d');
    ctx.fillStyle = '#a89987';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#8b7d6d';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 124);
    for (let y = 8; y < 128; y += 16) {
      ctx.fillStyle = 'rgba(70,60,50,0.08)';
      ctx.fillRect(4, y, 120, 3);
    }
  }

  return {
    facadeResidential: finalizeCanvasTexture(THREE, cRes),
    facadeCommercial: finalizeCanvasTexture(THREE, cCom),
    facadeModern: finalizeCanvasTexture(THREE, cMod),
    asphalt: finalizeCanvasTexture(THREE, cAsp),
    cobbleRamirez: finalizeCanvasTexture(THREE, cCob),
    plazaTile: finalizeCanvasTexture(THREE, cPlz),
    roofDesert: finalizeCanvasTexture(THREE, cRoof),
  };
}
