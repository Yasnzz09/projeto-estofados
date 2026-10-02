// Modelo 3D do Sofá Cama Dublin, montado por código a partir das medidas e fotos do produto.
// Medidas: L 190 x A 77 x P 117 cm (assento fechado). Unidade: metros; chão em y = 0, frente em +z.
//
// Peças: base escura, 2 braços largos arredondados com painel de couro na lateral externa,
// 2 assentos retráteis (cada um com 3 gomos costurados), encosto e 2 almofadas soltas.
// Materiais com nome "Tecido*" recebem as cores/tecidos do site; "Couro" e "Base" não mudam.
//
// O arquivo public/modelos/sofa-dublin.glb foi exportado deste código com o GLTFExporter do three.js
// (texturas de bouclê e couro de src/lib/tecido.ts, repetidas a cada 25 cm). Para ajustar o modelo,
// mude as medidas aqui e exporte de novo.

export function construirSofaDublin(THREE, RoundedBoxGeometry, texturas, mergeVertices) {
  const grupo = new THREE.Group();
  grupo.name = 'Sofa_Dublin';

  const tecido = new THREE.MeshStandardMaterial({
    name: 'Tecido', color: 0xe9e2d6, map: texturas.boucle, roughness: 1, metalness: 0,
  });
  const almofada = tecido.clone();
  almofada.name = 'Tecido_Almofada';
  const couro = new THREE.MeshStandardMaterial({
    name: 'Couro', color: 0x5c3826, map: texturas.couro, roughness: 0.55, metalness: 0,
  });
  const base = new THREE.MeshStandardMaterial({ name: 'Base', color: 0x2b2623, roughness: 0.8, metalness: 0 });

  /** UV em metros (projeção pela direção da face): a textura fica com o mesmo tamanho em todas as peças. */
  function uvEmMetros(geo) {
    const p = geo.attributes.position, n = geo.attributes.normal;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
      else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
      else { u = p.getX(i); v = p.getY(i); }
      uv[i * 2] = u; uv[i * 2 + 1] = v;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }

  function caixa(nome, material, [l, a, p], [x, y, z], raio, segmentos = 4) {
    // Vértices compartilhados (malha indexada): o formato que o AR do Google (Scene Viewer) espera.
    const geo = mergeVertices(uvEmMetros(new RoundedBoxGeometry(l, a, p, segmentos, raio)));
    const malha = new THREE.Mesh(geo, material);
    malha.name = nome;
    malha.position.set(x, y, z);
    grupo.add(malha);
    return malha;
  }

  // ---- medidas (m) ----
  const L = 1.9, P = 1.17;
  const larguraBraco = 0.2, alturaBraco = 0.62;
  const internoX = L / 2 - larguraBraco; // 0.75
  const alturaAssento = 0.45, chao = 0.05;
  const frenteAssento = 0.56, fundoAssento = -0.33;

  // Base escura (quase não aparece, dá o "respiro" embaixo)
  caixa('Base', base, [L - 0.06, 0.03, P - 0.06], [0, 0.015, 0], 0.01, 2);

  // Braços
  for (const lado of [-1, 1]) {
    const x = lado * (internoX + larguraBraco / 2);
    caixa(`Braco_${lado < 0 ? 'E' : 'D'}`, tecido, [larguraBraco, alturaBraco - 0.015, P], [x, 0.015 + (alturaBraco - 0.015) / 2, 0], 0.06);

    // Painel de couro na lateral externa: retângulo de cantos bem arredondados
    const w = 0.98, h = 0.45, r = 0.09;
    const forma = new THREE.Shape();
    forma.moveTo(-w / 2 + r, -h / 2);
    forma.lineTo(w / 2 - r, -h / 2); forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    forma.lineTo(w / 2, h / 2 - r); forma.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    forma.lineTo(-w / 2 + r, h / 2); forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    forma.lineTo(-w / 2, -h / 2 + r); forma.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 3, curveSegments: 10 });
    geo.computeVertexNormals();
    // a forma está no plano XY: girar para ficar no plano da lateral (ZY)
    geo.rotateY(lado * Math.PI / 2);
    uvEmMetros(geo);
    const painel = new THREE.Mesh(geo, couro);
    painel.name = `Couro_${lado < 0 ? 'E' : 'D'}`;
    painel.position.set(lado * (L / 2 - 0.009), 0.025 + h / 2, -0.015);
    grupo.add(painel);
  }

  // Assentos retráteis: 2 módulos inteiros (sem frestas internas). As 2 costuras de cada módulo
  // são um "vivo" de tecido em relevo que corre pelo topo e desce pela frente, como no sofá real.
  const folgaModulos = 0.006;
  const larguraModulo = internoX - folgaModulos / 2;
  const profundidadeAssento = frenteAssento - fundoAssento;
  const raioAssento = 0.035;
  for (const modulo of [-1, 1]) {
    const centroX = modulo * (folgaModulos / 2 + larguraModulo / 2);
    caixa(`Assento_${modulo < 0 ? 'E' : 'D'}`, tecido,
      [larguraModulo, alturaAssento - chao, profundidadeAssento],
      [centroX, chao + (alturaAssento - chao) / 2, (frenteAssento + fundoAssento) / 2], raioAssento, 4);

    for (const fracao of [-1 / 6, 1 / 6]) {
      const x = centroX + fracao * larguraModulo * 1.0;
      const topo = alturaAssento + 0.0015, frente = frenteAssento + 0.0015, r = raioAssento;
      const caminho = new THREE.CurvePath();
      caminho.add(new THREE.LineCurve3(new THREE.Vector3(x, topo, fundoAssento + 0.06), new THREE.Vector3(x, topo, frente - r)));
      caminho.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, topo, frente - r), new THREE.Vector3(x, topo, frente), new THREE.Vector3(x, topo - r, frente)));
      caminho.add(new THREE.LineCurve3(new THREE.Vector3(x, topo - r, frente), new THREE.Vector3(x, chao + 0.04, frente)));
      const geo = uvEmMetros(new THREE.TubeGeometry(caminho, 48, 0.004, 6, false));
      const vivo = new THREE.Mesh(geo, tecido);
      vivo.name = `Costura_${modulo < 0 ? 'E' : 'D'}${fracao < 0 ? 1 : 2}`;
      grupo.add(vivo);
    }
  }

  // Encosto (estrutura atrás das almofadas)
  const topoEncosto = 0.58;
  caixa('Encosto', tecido, [internoX * 2, topoEncosto - chao, fundoAssento + P / 2],
    [0, chao + (topoEncosto - chao) / 2, (-P / 2 + fundoAssento) / 2], 0.05);

  // Almofadas soltas do encosto: grandes, fofas, um pouco inclinadas para trás
  for (const lado of [-1, 1]) {
    const m = caixa(`Almofada_${lado < 0 ? 'E' : 'D'}`, almofada, [0.72, 0.38, 0.2],
      [lado * 0.375, alturaAssento + 0.115, fundoAssento + 0.12], 0.095, 5);
    m.rotation.x = -0.24;
  }

  return grupo;
}
