// Material de tecido igual para todos os modelos (e para os arquivos por cor gerados no build):
// textura de cor + relevo do tipo (public/texturas), rugosidade e brilho de tecido (sheen),
// tudo vindo de src/data/tecidos.json.

/** Cor do brilho (sheen) a partir da cor do tecido: tom do próprio tecido, um pouco mais claro. */
export function corDoBrilho(linear, brilho) {
  return linear.map((c) => Math.min(1, c * brilho.fator + brilho.soma));
}

/**
 * Material de tecido. `texturas` = { cor, relevo } (THREE.Texture, ladrilho com RepeatWrapping).
 * Nome "Tecido*" = o site e o build trocam a cor/tipo dele; "Couro" fica fixo.
 */
export function materialDeTecido(THREE, { nome = 'Tecido', tipo, cor, texturas, config }) {
  const t = config.tipos[tipo];
  const material = new THREE.MeshPhysicalMaterial({
    name: nome,
    color: cor,
    map: texturas.cor,
    normalMap: texturas.relevo,
    normalScale: new THREE.Vector2(t.relevo, t.relevo),
    roughness: t.rugosidade,
    metalness: 0,
  });
  if (t.brilho) {
    const c = new THREE.Color(cor);
    const [r, g, b] = corDoBrilho([c.r, c.g, c.b], t.brilho);
    material.sheen = 1;
    material.sheenColor = new THREE.Color().setRGB(r, g, b);
    material.sheenRoughness = t.brilho.rugosidade;
  }
  return material;
}

/**
 * Os modelos são feitos com UV em metros. Aqui o UV das peças de tecido/couro passa a contar
 * "ladrilhos" (1 unidade = metrosPorRepeticao), para usar a textura de alta resolução sem
 * depender de extensão de repetição (funciona igual no site, no Android e no iPhone).
 */
export function uvEmLadrilhos(THREE, objeto, config) {
  const fator = 1 / config.metrosPorRepeticao;
  const feitos = new Set();
  objeto.traverse((o) => {
    if (!o.isMesh || !/tecido|couro|almofad/i.test(o.material?.name ?? '')) return;
    const uv = o.geometry.attributes.uv;
    if (!uv || feitos.has(uv)) return;
    feitos.add(uv);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fator, uv.getY(i) * fator);
    uv.needsUpdate = true;
  });
}
