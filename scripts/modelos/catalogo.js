// Modelos 3D dos produtos do catálogo, montados por código (three.js) com as medidas de cada um.
// Unidade: metros; chão em y = 0; frente em +z. Materiais "Tecido*" recebem as cores do site.
// O Sofá Dublin tem o próprio arquivo (sofa-dublin.js).

import { criarFerramentas } from './base.js';

/**
 * Sofá ou poltrona genérico: base, braços, encosto, almofadas de assento e de encosto com vivo, pés.
 * o = { L, A, P, lugares, braco: { l, a, raio, bojo }, assento: { altura, espessura },
 *       encosto: { profundidade, topo }, almofadaEncosto: { profundidade, inclinacao },
 *       pes: { altura, raioTopo, raioBase, inclinacao, recuo }, orelhas? }
 */
function sofa(THREE, f, m, o) {
  const g = new THREE.Group();
  const { L, A, P } = o;
  const bw = o.braco.l;
  const interno = L - 2 * bw;
  const yb = o.pes.altura; // fundo da estrutura
  const dB = o.encosto.profundidade;
  const ys0 = o.assento.altura - o.assento.espessura; // tampo onde apoiam as almofadas

  // Braços
  const braco = f.estofado({ l: bw, a: o.braco.a - yb, p: P, raio: o.braco.raio, bojo: o.braco.bojo ?? { topo: 0.01, frente: 0.008 } });
  const geoBraco = braco.geometria(0.03);
  for (const lado of [-1, 1]) {
    f.malha(`Braco_${lado < 0 ? 'E' : 'D'}`, geoBraco, m.tecido, g, [lado * (L / 2 - bw / 2), yb + (o.braco.a - yb) / 2, 0]);
  }

  // Orelhas (poltrona bergère): sobem dos braços até perto do topo, na parte de trás
  if (o.orelhas) {
    const { altura, profundidade } = o.orelhas;
    const orelha = f.estofado({ l: bw * 0.8, a: altura, p: profundidade, raio: 0.06, bojo: { lados: 0.012, frente: 0.01 } });
    const geo = orelha.geometria(0.03);
    for (const lado of [-1, 1]) {
      const om = f.malha(`Orelha_${lado < 0 ? 'E' : 'D'}`, geo, m.tecido, g,
        [lado * (L / 2 - bw * 0.62), o.braco.a + altura / 2 - 0.06, -P / 2 + profundidade / 2 + 0.01]);
      om.rotation.y = lado * -0.06;
    }
  }

  // Encosto (estrutura)
  const encosto = f.estofado({ l: interno, a: o.encosto.topo - yb, p: dB, raio: 0.045, bojo: { frente: 0.012, topo: 0.008 } });
  f.malha('Encosto', encosto.geometria(0.035), m.tecido, g, [0, yb + (o.encosto.topo - yb) / 2, -P / 2 + dB / 2]);

  // Base do assento
  const base = f.estofado({ l: interno, a: ys0 - yb, p: P - dB, raio: 0.03, bojo: { frente: 0.006 } });
  f.malha('Base_Assento', base.geometria(0.04), m.tecido, g, [0, yb + (ys0 - yb) / 2, -P / 2 + dB + (P - dB) / 2]);

  // Almofadas do assento (com vivo no topo)
  const n = o.lugares, folga = 0.006;
  const wi = (interno - folga * (n - 1)) / n;
  const assento = f.estofado({ l: wi, a: o.assento.espessura, p: P - dB - 0.005, raio: 0.05, bojo: { topo: 0.022, frente: 0.014, lados: 0.006 } });
  const geoAssento = assento.geometria(0.028);
  // Almofadas do encosto (com vivo na frente)
  const pb = o.almofadaEncosto.profundidade, inc = o.almofadaEncosto.inclinacao;
  const hb = (A - o.assento.altura + 0.03) / Math.cos(inc) - pb * Math.sin(inc) - 0.035;
  const almofada = f.estofado({ l: wi, a: hb, p: pb, raio: 0.075, bojo: { frente: 0.04, tras: 0.02, topo: 0.012, lados: 0.01 } });
  const geoAlmofada = almofada.geometria(0.028);

  for (let i = 0; i < n; i++) {
    const x = -interno / 2 + wi / 2 + i * (wi + folga);
    const ga = new THREE.Group();
    ga.position.set(x, ys0 + o.assento.espessura / 2, -P / 2 + dB + (P - dB) / 2);
    g.add(ga);
    f.malha(`Assento_${i + 1}`, geoAssento, m.tecido, ga);
    f.vivoTopo(`Vivo_Assento_${i + 1}`, assento, m.tecido, ga);

    const gb = new THREE.Group();
    gb.position.set(x, o.assento.altura + hb / 2 - 0.03, -P / 2 + dB + pb / 2 - 0.01);
    gb.rotation.x = -inc;
    g.add(gb);
    f.malha(`Almofada_${i + 1}`, geoAlmofada, m.almofada, gb);
    f.vivoFrente(`Vivo_Almofada_${i + 1}`, almofada, m.almofada, gb);
  }

  // Pés
  const { altura, raioTopo, raioBase, inclinacao = 0, recuo = 0.05 } = o.pes;
  if (altura > 0.005) {
    const xs = [-(L / 2 - recuo), L / 2 - recuo];
    const zs = [-(P / 2 - recuo), P / 2 - recuo];
    let k = 0;
    for (const x of xs) for (const z of zs) f.pe(`Pe_${++k}`, m.pes, g, [x, z], altura, raioTopo, raioBase, inclinacao);
    if (L > 1.7) for (const z of zs) f.pe(`Pe_${++k}`, m.pes, g, [0, z], altura, raioTopo, raioBase, 0);
  }
  return g;
}

/** Textura de "aço escovado" (riscos horizontais finos) em canvas, 1 m. */
function texturaInox(THREE, tamanho = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = tamanho;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c9cdd0';
  ctx.fillRect(0, 0, tamanho, tamanho);
  let semente = 7;
  const aleatorio = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1700; i++) {
    const y = aleatorio() * tamanho, x = aleatorio() * tamanho, w = 40 + aleatorio() * 260;
    const claro = aleatorio() > 0.5;
    ctx.fillStyle = claro ? `rgba(255,255,255,${0.015 + aleatorio() * 0.035})` : `rgba(90,95,100,${0.012 + aleatorio() * 0.03})`;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x - tamanho, y, w, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.mimeType = 'image/jpeg';
  return t;
}

function geladeira(THREE, f, m) {
  const g = new THREE.Group();
  const L = 0.7, A = 1.86, P = 0.73;
  const rodape = 0.05;
  const corpo = f.estofado({ l: L, a: A - rodape, p: P - 0.045, raio: 0.02 });
  f.malha('Corpo', corpo.geometria(0.06), m.inox, g, [0, rodape + (A - rodape) / 2, -0.0225]);
  f.malha('Rodape', f.estofado({ l: L - 0.04, a: rodape, p: P - 0.08, raio: 0.008 }).geometria(0.1), m.preto, g, [0, rodape / 2, -0.02]);
  // Portas: freezer em cima, refrigerador embaixo (frestas de 6 mm)
  const zPorta = P / 2 - 0.0225;
  const freezer = 0.5, fresta = 0.006;
  const alturaGeladeira = A - rodape - freezer - fresta * 2;
  const porta = (nome, a, y) => f.malha(nome, f.estofado({ l: L - 0.006, a, p: 0.045, raio: 0.012 }).geometria(0.05), m.inox, g, [0, y, zPorta]);
  porta('Porta_Freezer', freezer, A - fresta - freezer / 2);
  porta('Porta_Refrigerador', alturaGeladeira, rodape + fresta + alturaGeladeira / 2);
  // Puxadores verticais (barra + 2 suportes)
  const puxador = (nome, comprimento, yCentro) => {
    const x = L / 2 - 0.07, z = zPorta + 0.0225 + 0.03;
    f.malha(nome, f.estofado({ l: 0.022, a: comprimento, p: 0.022, raio: 0.01 }).geometria(0.02), m.puxador, g, [x, yCentro, z]);
    for (const s of [-1, 1]) {
      f.malha(`${nome}_Suporte${s > 0 ? 'A' : 'B'}`, f.estofado({ l: 0.016, a: 0.02, p: 0.03, raio: 0.006 }).geometria(0.02), m.puxador, g,
        [x, yCentro + s * (comprimento / 2 - 0.02), z - 0.02]);
    }
  };
  puxador('Puxador_Freezer', 0.26, A - fresta - freezer + 0.17);
  puxador('Puxador_Refrigerador', 0.42, rodape + fresta + alturaGeladeira - 0.25);
  // Painel digital discreto na porta do refrigerador
  f.malha('Painel', f.estofado({ l: 0.09, a: 0.035, p: 0.004, raio: 0.002 }).geometria(0.05), m.vidro, g, [-L / 2 + 0.12, rodape + alturaGeladeira - 0.12, zPorta + 0.0235]);
  return g;
}

function fogao(THREE, f, m) {
  const g = new THREE.Group();
  const L = 0.77, A = 0.92, P = 0.66;
  const pes = 0.03, mesa = 0.86;
  const corpo = f.estofado({ l: L, a: mesa - pes, p: P - 0.03, raio: 0.012 });
  f.malha('Corpo', corpo.geometria(0.06), m.inox, g, [0, pes + (mesa - pes) / 2, -0.015]);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    f.pe(`Pe_${x}${z}`, m.preto, g, [x * (L / 2 - 0.05), z * (P / 2 - 0.06)], pes, 0.018, 0.02);
  }
  // Mesa de vidro preto
  f.malha('Mesa_Vidro', f.estofado({ l: L - 0.01, a: 0.012, p: P - 0.1, raio: 0.005 }).geometria(0.08), m.vidro, g, [0, mesa + 0.006, -0.045]);
  // Painel de comandos (frente, inclinado) com 6 botões
  const painel = new THREE.Group();
  painel.position.set(0, mesa - 0.045, P / 2 - 0.02);
  painel.rotation.x = -0.35;
  g.add(painel);
  f.malha('Painel_Comandos', f.estofado({ l: L - 0.02, a: 0.08, p: 0.03, raio: 0.008 }).geometria(0.04), m.inox, painel);
  for (let i = 0; i < 6; i++) {
    const x = -L / 2 + 0.09 + i * ((L - 0.18) / 5);
    const botao = new THREE.CylinderGeometry(0.019, 0.021, 0.028, 24);
    botao.rotateX(Math.PI / 2);
    f.malha(`Botao_${i + 1}`, f.uvEmMetros(botao), m.preto, painel, [x, 0, 0.028]);
    const anel = new THREE.TorusGeometry(0.021, 0.0025, 8, 24);
    f.malha(`Anel_${i + 1}`, f.uvEmMetros(anel), m.puxador, painel, [x, 0, 0.016]);
  }
  // Queimadores: 4 nos cantos + tripla chama no centro, com trempes de ferro
  const zM = -0.045;
  const queimadores = [[-0.2, zM - 0.14, 0.04], [0.2, zM - 0.14, 0.04], [-0.2, zM + 0.14, 0.045], [0.2, zM + 0.14, 0.045], [0, zM, 0.06]];
  queimadores.forEach(([x, z, r], i) => {
    const y = mesa + 0.012;
    const espalhador = new THREE.CylinderGeometry(r, r * 1.05, 0.016, 32);
    f.malha(`Queimador_${i + 1}`, f.uvEmMetros(espalhador), m.aluminio, g, [x, y + 0.008, z]);
    const tampa = new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.008, 32);
    f.malha(`Tampa_${i + 1}`, f.uvEmMetros(tampa), m.preto, g, [x, y + 0.02, z]);
    // trempe: aro + 4 braços
    const aro = new THREE.TorusGeometry(r + 0.045, 0.005, 8, 40);
    aro.rotateX(Math.PI / 2);
    f.malha(`Trempe_Aro_${i + 1}`, f.uvEmMetros(aro), m.ferro, g, [x, y + 0.03, z]);
    for (let k = 0; k < 4; k++) {
      const braco = new THREE.BoxGeometry(0.008, 0.012, 0.075);
      braco.translate(0, 0, r + 0.02);
      braco.rotateY((k * Math.PI) / 2 + Math.PI / 4);
      f.malha(`Trempe_${i + 1}_${k + 1}`, f.uvEmMetros(braco), m.ferro, g, [x, y + 0.03, z]);
    }
  });
  // Porta do forno com visor de vidro e puxador horizontal
  const yForno = pes + 0.06 + 0.25;
  const zFrente = P / 2 - 0.015;
  f.malha('Porta_Forno', f.estofado({ l: L - 0.03, a: 0.5, p: 0.03, raio: 0.01 }).geometria(0.05), m.inox, g, [0, yForno, zFrente]);
  f.malha('Visor_Forno', f.estofado({ l: L - 0.2, a: 0.24, p: 0.006, raio: 0.02 }).geometria(0.05), m.vidro, g, [0, yForno - 0.03, zFrente + 0.016]);
  const barra = new THREE.CylinderGeometry(0.011, 0.011, L - 0.16, 20);
  barra.rotateZ(Math.PI / 2);
  f.malha('Puxador_Forno', f.uvEmMetros(barra), m.puxador, g, [0, yForno + 0.2, zFrente + 0.05]);
  for (const s of [-1, 1]) {
    const suporte = new THREE.CylinderGeometry(0.007, 0.007, 0.04, 12);
    suporte.rotateX(Math.PI / 2);
    f.malha(`Suporte_Puxador_${s > 0 ? 'D' : 'E'}`, f.uvEmMetros(suporte), m.puxador, g, [s * (L / 2 - 0.1), yForno + 0.2, zFrente + 0.03]);
  }
  // Gaveta inferior
  f.malha('Gaveta', f.estofado({ l: L - 0.03, a: 0.09, p: 0.02, raio: 0.008 }).geometria(0.05), m.inox, g, [0, pes + 0.055, zFrente]);
  return g;
}

/**
 * Monta o modelo de um produto. `texturas` traz as texturas de tecido (cor + relevo) por tipo.
 * Retorna o grupo pronto para exportar.
 */
export function construirProduto(THREE, mergeVertices, id, texturas, cores = {}) {
  const f = criarFerramentas(THREE, mergeVertices);
  const tecido = (tipo, cor, rugosidade) => {
    const t = texturas[tipo];
    const mat = new THREE.MeshStandardMaterial({ name: 'Tecido', color: cor, map: t.cor, normalMap: t.relevo, normalScale: new THREE.Vector2(0.7, 0.7), roughness: rugosidade, metalness: 0 });
    const alm = mat.clone();
    alm.name = 'Tecido_Almofada';
    return { tecido: mat, almofada: alm };
  };
  const madeira = (cor) => new THREE.MeshStandardMaterial({ name: 'Pes', color: cor, roughness: 0.55, metalness: 0 });
  const metalPreto = new THREE.MeshStandardMaterial({ name: 'Pes', color: 0x1d1d1f, roughness: 0.35, metalness: 0.7 });

  if (id === 'sofa-lisboa') {
    const g = sofa(THREE, f, { ...tecido('Linho', cores.tecido ?? 0xcbb79a, 0.92), pes: madeira(0x6b4a32) }, {
      L: 2.1, A: 0.95, P: 1.0, lugares: 3,
      braco: { l: 0.2, a: 0.63, raio: 0.07 }, assento: { altura: 0.47, espessura: 0.17 },
      encosto: { profundidade: 0.2, topo: 0.72 }, almofadaEncosto: { profundidade: 0.2, inclinacao: 0.2 },
      pes: { altura: 0.06, raioTopo: 0.025, raioBase: 0.02, recuo: 0.07 },
    });
    return g;
  }
  if (id === 'sofa-oslo') {
    return sofa(THREE, f, { ...tecido('Linho', cores.tecido ?? 0x9b9893, 0.92), pes: metalPreto }, {
      L: 1.56, A: 0.84, P: 0.88, lugares: 2,
      braco: { l: 0.13, a: 0.6, raio: 0.045, bojo: { topo: 0.006, frente: 0.006 } }, assento: { altura: 0.45, espessura: 0.15 },
      encosto: { profundidade: 0.17, topo: 0.66 }, almofadaEncosto: { profundidade: 0.17, inclinacao: 0.18 },
      pes: { altura: 0.16, raioTopo: 0.016, raioBase: 0.009, inclinacao: 0.12, recuo: 0.08 },
    });
  }
  if (id === 'poltrona-aurora') {
    return sofa(THREE, f, { ...tecido('Veludo', cores.tecido ?? 0xb5714f, 1), pes: madeira(0x4a3121) }, {
      L: 0.8, A: 1.02, P: 0.84, lugares: 1,
      braco: { l: 0.13, a: 0.64, raio: 0.065, bojo: { topo: 0.014, frente: 0.012, lados: 0.006 } }, assento: { altura: 0.46, espessura: 0.15 },
      encosto: { profundidade: 0.16, topo: 0.96 }, almofadaEncosto: { profundidade: 0.13, inclinacao: 0.12 },
      pes: { altura: 0.17, raioTopo: 0.022, raioBase: 0.012, inclinacao: 0.1, recuo: 0.07 },
      orelhas: { altura: 0.36, profundidade: 0.36 },
    });
  }
  if (id === 'poltrona-lina') {
    return sofa(THREE, f, { ...tecido('Linho', cores.tecido ?? 0x7d8463, 0.92), pes: metalPreto }, {
      L: 0.68, A: 0.78, P: 0.72, lugares: 1,
      braco: { l: 0.1, a: 0.58, raio: 0.03, bojo: { topo: 0.004 } }, assento: { altura: 0.44, espessura: 0.13 },
      encosto: { profundidade: 0.13, topo: 0.62 }, almofadaEncosto: { profundidade: 0.13, inclinacao: 0.15 },
      pes: { altura: 0.15, raioTopo: 0.012, raioBase: 0.008, inclinacao: 0.08, recuo: 0.06 },
    });
  }
  const inox = new THREE.MeshStandardMaterial({ name: 'Inox', color: 0xffffff, map: texturaInox(THREE), metalness: 0.9, roughness: 0.32 });
  const m = {
    inox,
    puxador: new THREE.MeshStandardMaterial({ name: 'Puxador', color: 0xd9dcde, metalness: 1, roughness: 0.22 }),
    preto: new THREE.MeshStandardMaterial({ name: 'Preto', color: 0x161616, metalness: 0.2, roughness: 0.5 }),
    vidro: new THREE.MeshStandardMaterial({ name: 'Vidro', color: 0x050505, metalness: 0.1, roughness: 0.06 }),
    ferro: new THREE.MeshStandardMaterial({ name: 'Ferro', color: 0x1b1b1b, metalness: 0.5, roughness: 0.6 }),
    aluminio: new THREE.MeshStandardMaterial({ name: 'Aluminio', color: 0x8f9295, metalness: 0.8, roughness: 0.45 }),
  };
  if (id === 'geladeira-duplex') return geladeira(THREE, f, m);
  if (id === 'fogao-5-bocas') return fogao(THREE, f, m);
  throw new Error('produto desconhecido: ' + id);
}
