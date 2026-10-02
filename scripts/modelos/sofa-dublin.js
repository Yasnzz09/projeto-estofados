// Modelo 3D do Sofá Cama Dublin, montado por código a partir das medidas e fotos do produto.
// Medidas: L 190 x A 77 x P 117 cm (assento fechado). Unidade: metros; chão em y = 0, frente em +z.
//
// Peças: base escura, 2 braços largos com painel de couro na lateral externa, 2 assentos retráteis
// (3 gomos costurados em cada), encosto e 2 almofadas soltas com vivo nas bordas.
// Os estofados são "estufados" (bojo de espuma) e o bouclê tem relevo (normal map).
// Materiais com nome "Tecido*" recebem as cores/tecidos do site; "Couro" e "Base" não mudam.
//
// O arquivo public/modelos/sofa-dublin.glb foi exportado deste código com o GLTFExporter do three.js.
// Texturas: public/texturas/<tipo>-cor.jpg e -relevo.jpg (geradas por tecidos.js), material de
// tecido com brilho (sheen) em materiais.js, acabamento por tipo em src/data/tecidos.json.
// Para ajustar, mude aqui e exporte de novo.

import { materialDeTecido, uvEmLadrilhos } from './materiais.js';

/** `texturas` = { Bouclé: { cor, relevo }, Couro: { cor, relevo } }; `config` = src/data/tecidos.json. */
export function construirSofaDublin(THREE, texturas, mergeVertices, config) {
  const { Vector3 } = THREE;
  const grupo = new THREE.Group();
  grupo.name = 'Sofa_Dublin';

  const tecido = materialDeTecido(THREE, { tipo: 'Bouclé', cor: 0xe9e2d6, texturas: texturas['Bouclé'], config });
  const almofada = tecido.clone();
  almofada.name = 'Tecido_Almofada';
  const couro = materialDeTecido(THREE, { nome: 'Couro', tipo: 'Couro', cor: 0x5f3a27, texturas: texturas.Couro, config });
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

  /**
   * Bloco estofado: caixa de cantos arredondados (raio) com "bojo" de espuma em cada face
   * (zero nas bordas, máximo no meio). `canais` divide o topo e a frente em gomos ao longo de X,
   * com o vale da costura entre eles.
   */
  function estofado({ l, a, p, raio, bojo = {}, canais = 0 }) {
    const h = new Vector3(l / 2, a / 2, p / 2);
    const interno = h.clone().subScalar(raio);
    const perfil = (t) => Math.max(0, 1 - t * t); // 1 no centro, 0 na borda
    const gomo = (x) => {
      if (!canais) return 1;
      const u = ((x + interno.x) / (2 * interno.x)) * canais;
      return Math.pow(Math.abs(Math.sin(Math.PI * (u - Math.floor(u)))), 0.55);
    };

    /** Ponto da caixa (antes de arredondar) -> ponto na superfície estofada, e a normal aproximada. */
    function deformar(v) {
      const c = new Vector3(
        Math.min(Math.max(v.x, -interno.x), interno.x),
        Math.min(Math.max(v.y, -interno.y), interno.y),
        Math.min(Math.max(v.z, -interno.z), interno.z),
      );
      const dir = v.clone().sub(c);
      if (dir.lengthSq() < 1e-14) dir.set(0, 1, 0);
      dir.normalize();
      const px = perfil(c.x / interno.x), py = perfil(c.y / interno.y), pz = perfil(c.z / interno.z);
      let empurrao = 0;
      if (dir.y > 0) empurrao += dir.y * dir.y * (bojo.topo ?? 0) * px * pz * gomo(c.x);
      if (dir.z > 0) empurrao += dir.z * dir.z * (bojo.frente ?? 0) * px * py * gomo(c.x);
      if (dir.z < 0) empurrao += dir.z * dir.z * (bojo.tras ?? 0) * px * py;
      empurrao += dir.x * dir.x * (bojo.lados ?? 0) * py * pz;
      return { ponto: c.addScaledVector(dir, raio + empurrao), dir };
    }

    /** Malha densa (mais fina perto das bordas, para o arredondado ficar liso). */
    function geometria(passo = 0.03) {
      const n = (d) => Math.max(4, Math.ceil(d / passo));
      const geo = new THREE.BoxGeometry(l, a, p, n(l), n(a), n(p));
      geo.deleteAttribute('normal');
      geo.deleteAttribute('uv');
      const pos = geo.attributes.position;
      const remapear = (val, meia) => {
        const u = val / meia, s = Math.sign(u), au = Math.abs(u);
        return s * meia * (0.45 * au + 0.55 * (1 - (1 - au) * (1 - au)));
      };
      const v = new Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.set(remapear(pos.getX(i), h.x), remapear(pos.getY(i), h.y), remapear(pos.getZ(i), h.z));
        const { ponto } = deformar(v);
        pos.setXYZ(i, ponto.x, ponto.y, ponto.z);
      }
      const unida = mergeVertices(geo, 1e-6);
      unida.computeVertexNormals();
      return uvEmMetros(unida);
    }

    return { h, interno, raio, deformar, geometria };
  }

  function malha(nome, geo, material, pai = grupo) {
    const m = new THREE.Mesh(geo, material);
    m.name = nome;
    pai.add(m);
    return m;
  }

  /** Vivo (cordão de tecido) que segue uma lista de pontos da superfície, um pouco para fora. */
  function vivo(nome, pontos, raioTubo, material, pai) {
    const curva = new THREE.CatmullRomCurve3(pontos, false, 'centripetal');
    const geo = uvEmMetros(new THREE.TubeGeometry(curva, Math.max(24, pontos.length * 2), raioTubo, 6, false));
    return malha(nome, geo, material, pai);
  }

  // ---- medidas (m) ----
  const L = 1.9, P = 1.17;
  const larguraBraco = 0.2, alturaBraco = 0.62;
  const internoX = L / 2 - larguraBraco; // 0.75
  const alturaAssento = 0.45, chao = 0.05;
  const frenteAssento = 0.56, fundoAssento = -0.33;

  // Base escura (quase não aparece, dá o "respiro" embaixo)
  malha('Base', estofado({ l: L - 0.06, a: 0.03, p: P - 0.06, raio: 0.01 }).geometria(0.1), base).position.set(0, 0.015, 0);

  // Braços: largos, topo levemente abaulado
  const braco = estofado({ l: larguraBraco, a: alturaBraco - 0.015, p: P, raio: 0.065, bojo: { topo: 0.008, frente: 0.006 } }); // lateral reta: recebe o painel de couro
  const geoBraco = braco.geometria(0.03);
  for (const lado of [-1, 1]) {
    const x = lado * (internoX + larguraBraco / 2);
    malha(`Braco_${lado < 0 ? 'E' : 'D'}`, geoBraco, tecido).position.set(x, 0.015 + (alturaBraco - 0.015) / 2, 0);

    // Painel de couro na lateral externa: retângulo de cantos bem arredondados
    const w = 0.98, hp = 0.45, r = 0.09;
    const forma = new THREE.Shape();
    forma.moveTo(-w / 2 + r, -hp / 2);
    forma.lineTo(w / 2 - r, -hp / 2); forma.quadraticCurveTo(w / 2, -hp / 2, w / 2, -hp / 2 + r);
    forma.lineTo(w / 2, hp / 2 - r); forma.quadraticCurveTo(w / 2, hp / 2, w / 2 - r, hp / 2);
    forma.lineTo(-w / 2 + r, hp / 2); forma.quadraticCurveTo(-w / 2, hp / 2, -w / 2, hp / 2 - r);
    forma.lineTo(-w / 2, -hp / 2 + r); forma.quadraticCurveTo(-w / 2, -hp / 2, -w / 2 + r, -hp / 2);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.005, bevelSegments: 4, curveSegments: 12 });
    geo.rotateY(lado * Math.PI / 2);
    geo.computeVertexNormals();
    uvEmMetros(geo);
    malha(`Couro_${lado < 0 ? 'E' : 'D'}`, geo, couro).position.set(lado * (L / 2 - 0.0065), 0.025 + hp / 2, -0.015);
  }

  // Assentos retráteis: 2 módulos inteiros, cada um com 3 gomos estufados; as costuras ficam no vale
  // entre os gomos, com um vivo correndo pelo topo e descendo pela frente (como no sofá real).
  const folgaModulos = 0.006;
  const larguraModulo = internoX - folgaModulos / 2;
  const assento = estofado({
    l: larguraModulo, a: alturaAssento - chao, p: frenteAssento - fundoAssento, raio: 0.045,
    bojo: { topo: 0.018, frente: 0.012, lados: 0.004 }, canais: 3,
  });
  const geoAssento = assento.geometria(0.025);
  for (const modulo of [-1, 1]) {
    const centro = new Vector3(modulo * (folgaModulos / 2 + larguraModulo / 2), chao + (alturaAssento - chao) / 2, (frenteAssento + fundoAssento) / 2);
    const g = new THREE.Group();
    g.position.copy(centro);
    grupo.add(g);
    malha(`Assento_${modulo < 0 ? 'E' : 'D'}`, geoAssento, tecido, g);

    const { h, interno, raio } = assento;
    for (const k of [1, 2]) {
      const x = -interno.x + (2 * interno.x * k) / 3; // vale entre os gomos
      const pontos = [];
      // topo: de trás para a frente
      for (let z = -interno.z + 0.05; z <= interno.z; z += 0.05) pontos.push(new Vector3(x, h.y, z));
      // canto da frente (arco)
      for (let t = 1; t <= 6; t++) {
        const ang = (t / 6) * (Math.PI / 2);
        pontos.push(new Vector3(x, interno.y + raio * Math.cos(ang), interno.z + raio * Math.sin(ang)));
      }
      // frente: de cima para baixo
      for (let y = interno.y - 0.04; y >= -interno.y + 0.02; y -= 0.04) pontos.push(new Vector3(x, y, h.z));
      const naSuperficie = pontos.map((pt) => {
        const { ponto, dir } = assento.deformar(pt);
        return ponto.addScaledVector(dir, 0.002);
      });
      vivo(`Costura_${modulo < 0 ? 'E' : 'D'}${k}`, naSuperficie, 0.0045, tecido, g);
    }
  }

  // Encosto (estrutura atrás das almofadas)
  const topoEncosto = 0.58;
  const encosto = estofado({ l: internoX * 2, a: topoEncosto - chao, p: fundoAssento + P / 2, raio: 0.05, bojo: { frente: 0.01, topo: 0.006 } });
  malha('Encosto', encosto.geometria(0.035), tecido).position.set(0, chao + (topoEncosto - chao) / 2, (-P / 2 + fundoAssento) / 2);

  // Almofadas soltas do encosto: grandes e fofas (bem estufadas), com vivo em volta da frente,
  // um pouco inclinadas para trás.
  const almofadaEst = estofado({ l: 0.72, a: 0.38, p: 0.17, raio: 0.06, bojo: { frente: 0.045, tras: 0.025, topo: 0.012, lados: 0.01 } });
  const geoAlmofada = almofadaEst.geometria(0.025);
  for (const lado of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(lado * 0.375, alturaAssento + 0.1, fundoAssento + 0.11);
    g.rotation.x = -0.24;
    grupo.add(g);
    malha(`Almofada_${lado < 0 ? 'E' : 'D'}`, geoAlmofada, almofada, g);

    // vivo na emenda entre a frente e a lateral da almofada (no meio do arredondado)
    const { interno, raio } = almofadaEst;
    const rho = raio * Math.SQRT1_2;
    const z = interno.z + rho;
    const arcos = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => {
      const arco = [];
      for (let t = 0; t <= 6; t++) {
        const ang = Math.atan2(sy, sx) - Math.PI / 4 + (t / 6) * (Math.PI / 2);
        arco.push(new Vector3(sx * interno.x + Math.cos(ang) * rho, sy * interno.y + Math.sin(ang) * rho, z));
      }
      return arco;
    });
    // cantos em arco + trechos retos com pontos a cada ~3 cm (para o vivo acompanhar o bojo)
    const pontos = [];
    arcos.forEach((arco, i) => {
      pontos.push(...arco);
      const fim = arco[arco.length - 1], prox = arcos[(i + 1) % 4][0];
      const passos = Math.max(1, Math.round(fim.distanceTo(prox) / 0.03));
      for (let k = 1; k < passos; k++) pontos.push(fim.clone().lerp(prox, k / passos));
    });
    pontos.push(pontos[0].clone());
    const naSuperficie = pontos.map((pt) => {
      const { ponto, dir } = almofadaEst.deformar(pt);
      return ponto.addScaledVector(dir, 0.003);
    });
    vivo(`Vivo_Almofada_${lado < 0 ? 'E' : 'D'}`, naSuperficie, 0.005, almofada, g);
  }

  uvEmLadrilhos(THREE, grupo, config);
  return grupo;
}
