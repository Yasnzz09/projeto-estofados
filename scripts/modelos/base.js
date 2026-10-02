// Peças reutilizáveis para modelar móveis por código (three.js). Unidade: metros.
// Mesmas técnicas do Sofá Dublin: estofado com bojo de espuma, UV em metros, vivos de tecido.

export function criarFerramentas(THREE, mergeVertices) {
  const { Vector3 } = THREE;

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
   * Bloco estofado: caixa de cantos arredondados (raio) com "bojo" de espuma por face
   * (zero nas bordas, máximo no meio). `canais` divide topo e frente em gomos ao longo de X.
   */
  function estofado({ l, a, p, raio, bojo = {}, canais = 0 }) {
    const h = new Vector3(l / 2, a / 2, p / 2);
    raio = Math.min(raio, h.x * 0.95, h.y * 0.95, h.z * 0.95);
    const interno = h.clone().subScalar(raio);
    const perfil = (t) => Math.max(0, 1 - t * t);
    const gomo = (x) => {
      if (!canais) return 1;
      const u = ((x + interno.x) / (2 * interno.x)) * canais;
      return Math.pow(Math.abs(Math.sin(Math.PI * (u - Math.floor(u)))), 0.55);
    };
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

  function malha(nome, geo, material, pai, pos) {
    const m = new THREE.Mesh(geo, material);
    m.name = nome;
    if (pos) m.position.set(...pos);
    pai.add(m);
    return m;
  }

  /** Vivo (cordão de tecido) por uma lista de pontos. */
  function vivo(nome, pontos, raioTubo, material, pai, fechado = false) {
    const curva = new THREE.CatmullRomCurve3(pontos, fechado, 'centripetal');
    const geo = uvEmMetros(new THREE.TubeGeometry(curva, Math.max(24, pontos.length * 2), raioTubo, 6, fechado));
    return malha(nome, geo, material, pai);
  }

  /** Vivo em volta da face da frente (+z) de um estofado, seguindo o bojo. */
  function vivoFrente(nome, est, material, pai, raioTubo = 0.0045, lado = 1) {
    const { interno, raio } = est;
    const rho = raio * Math.SQRT1_2;
    const z = lado * (interno.z + rho);
    const arcos = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => {
      const arco = [];
      for (let t = 0; t <= 6; t++) {
        const ang = Math.atan2(sy, sx) - Math.PI / 4 + (t / 6) * (Math.PI / 2);
        arco.push(new Vector3(sx * interno.x + Math.cos(ang) * rho, sy * interno.y + Math.sin(ang) * rho, z));
      }
      return arco;
    });
    const pontos = [];
    arcos.forEach((arco, i) => {
      pontos.push(...arco);
      const fim = arco[arco.length - 1], prox = arcos[(i + 1) % 4][0];
      const passos = Math.max(1, Math.round(fim.distanceTo(prox) / 0.03));
      for (let k = 1; k < passos; k++) pontos.push(fim.clone().lerp(prox, k / passos));
    });
    const naSuperficie = pontos.map((pt) => {
      const { ponto, dir } = est.deformar(pt);
      return ponto.addScaledVector(dir, raioTubo * 0.6);
    });
    return vivo(nome, naSuperficie, raioTubo, material, pai, true);
  }

  /** Vivo em volta do topo (+y) de um estofado (almofada de assento), seguindo o bojo. */
  function vivoTopo(nome, est, material, pai, raioTubo = 0.0045) {
    const { interno, raio } = est;
    const rho = raio * Math.SQRT1_2;
    const y = interno.y + rho;
    const arcos = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => {
      const arco = [];
      for (let t = 0; t <= 6; t++) {
        const ang = Math.atan2(sz, sx) - Math.PI / 4 + (t / 6) * (Math.PI / 2);
        arco.push(new Vector3(sx * interno.x + Math.cos(ang) * rho, y, sz * interno.z + Math.sin(ang) * rho));
      }
      return arco;
    });
    const pontos = [];
    arcos.forEach((arco, i) => {
      pontos.push(...arco);
      const fim = arco[arco.length - 1], prox = arcos[(i + 1) % 4][0];
      const passos = Math.max(1, Math.round(fim.distanceTo(prox) / 0.03));
      for (let k = 1; k < passos; k++) pontos.push(fim.clone().lerp(prox, k / passos));
    });
    const naSuperficie = pontos.map((pt) => {
      const { ponto, dir } = est.deformar(pt);
      return ponto.addScaledVector(dir, raioTubo * 0.6);
    });
    return vivo(nome, naSuperficie, raioTubo, material, pai, true);
  }

  /** Pé torneado/cônico (madeira ou metal), apoiado no chão. */
  function pe(nome, material, pai, [x, z], altura, raioTopo, raioBase, inclinacao = 0) {
    const geo = new THREE.CylinderGeometry(raioTopo, raioBase, altura, 16, 1);
    geo.translate(0, altura / 2, 0);
    const m = malha(nome, uvEmMetros(geo), material, pai, [x, 0, z]);
    if (inclinacao) {
      // base para fora, topo para dentro (pé palito escandinavo)
      m.rotation.z = Math.sign(x) * inclinacao;
      m.rotation.x = -Math.sign(z) * inclinacao;
    }
    return m;
  }

  return { uvEmMetros, estofado, malha, vivo, vivoFrente, vivoTopo, pe };
}
