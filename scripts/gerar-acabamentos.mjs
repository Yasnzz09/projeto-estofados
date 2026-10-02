// Gera uma cópia de cada modelo 3D para cada tecido/cor (acabamento) cadastrado.
//
// Por quê: no Android, o AR do Google (Scene Viewer) baixa o arquivo .glb direto do site,
// então o tecido escolhido só aparece no AR se existir um arquivo já pronto com ele.
// (No iPhone o Quick Look gera o modelo a partir da tela, que também usa estes arquivos.)
//
// Roda sozinho antes do `npm run dev` e do `npm run build` (inclusive no Netlify).
// Saída: public/modelos/acabamentos/<produto>--<acabamento>.glb  (pasta ignorada pelo git)
//
// Só os materiais de tecido mudam (nome com "tecido", "almofada", "assento"...): recebem a cor,
// a textura do tipo (public/texturas/<tipo>-cor.jpg e -relevo.jpg), a rugosidade e o brilho de
// tecido (sheen) de src/data/tecidos.json. Pés, couro e outras partes ficam como estão.
// Sem dependências: lê e escreve o GLB "na mão".

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produtos = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/products.json'), 'utf8'));
const tecidos = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/tecidos.json'), 'utf8'));
const tecidoTs = fs.readFileSync(path.join(raiz, 'src/lib/tecido.ts'), 'utf8');
const saida = path.join(raiz, 'public/modelos/acabamentos');

// Mesma regra do site (lida de src/lib/tecido.ts, fonte única).
const regraTecido = new RegExp(tecidoTs.match(/ehMaterialDeTecido[^/]*\/(.+?)\/i/)[1], 'i');

/** Imagens de textura de cada tipo (cor + relevo). */
const imagensDoTipo = (tipo) => {
  const t = tecidos.tipos[tipo];
  const ler = (sufixo) => fs.readFileSync(path.join(raiz, 'public/texturas', `${t.arquivo}-${sufixo}.jpg`));
  return { cor: ler('cor'), relevo: ler('relevo') };
};

/** Cor do site (sRGB, "#rrggbb") para o espaço linear usado no glTF. */
function hexParaLinear(hex) {
  const v = hex.replace('#', '');
  return [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function lerGlb(buf) {
  if (buf.toString('latin1', 0, 4) !== 'glTF') throw new Error('não é um GLB');
  const tamJson = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + tamJson));
  let bin = Buffer.alloc(0);
  const inicioBin = 20 + tamJson;
  if (buf.length > inicioBin + 8) bin = buf.subarray(inicioBin + 8, inicioBin + 8 + buf.readUInt32LE(inicioBin));
  return { json, bin };
}

/** Monta o GLB guardando só o que é usado (tira as texturas que o acabamento trocou). */
function escreverGlb(json, dadosDasViews) {
  // texturas usadas pelos materiais (inclusive dentro de extensões)
  const texturasUsadas = new Set();
  const procurar = (obj) => {
    for (const [chave, valor] of Object.entries(obj ?? {})) {
      if (valor && typeof valor === 'object') {
        if (/Texture$/.test(chave) && typeof valor.index === 'number') texturasUsadas.add(valor.index);
        else procurar(valor);
      }
    }
  };
  (json.materials ?? []).forEach(procurar);
  const novaTextura = new Map();
  const texturas = [];
  [...texturasUsadas].sort((a, b) => a - b).forEach((i) => { novaTextura.set(i, texturas.length); texturas.push({ ...json.textures[i] }); });
  const renumerar = (obj) => {
    for (const [chave, valor] of Object.entries(obj ?? {})) {
      if (valor && typeof valor === 'object') {
        if (/Texture$/.test(chave) && typeof valor.index === 'number') valor.index = novaTextura.get(valor.index);
        else renumerar(valor);
      }
    }
  };
  (json.materials ?? []).forEach(renumerar);

  const novaImagem = new Map();
  const imagens = [];
  for (const t of texturas) {
    if (!novaImagem.has(t.source)) { novaImagem.set(t.source, imagens.length); imagens.push({ ...json.images[t.source] }); }
    t.source = novaImagem.get(t.source);
  }

  // bufferViews usados (geometria + imagens), em sequência, alinhados em 4 bytes
  const viewsUsadas = new Set([...(json.accessors ?? []).map((a) => a.bufferView), ...imagens.map((i) => i.bufferView)].filter((v) => v !== undefined));
  const novaView = new Map();
  const views = [];
  const partes = [];
  let deslocamento = 0;
  for (const v of [...viewsUsadas].sort((a, b) => a - b)) {
    const dados = dadosDasViews[v];
    const view = { ...json.bufferViews[v], buffer: 0, byteOffset: deslocamento, byteLength: dados.length };
    novaView.set(v, views.length);
    views.push(view);
    partes.push(dados);
    deslocamento += dados.length;
    const sobra = (4 - (deslocamento % 4)) % 4;
    if (sobra) { partes.push(Buffer.alloc(sobra)); deslocamento += sobra; }
  }
  for (const a of json.accessors ?? []) if (a.bufferView !== undefined) a.bufferView = novaView.get(a.bufferView);
  for (const i of imagens) i.bufferView = novaView.get(i.bufferView);
  json.bufferViews = views;
  json.textures = texturas;
  json.images = imagens;
  json.buffers = [{ byteLength: deslocamento }];
  const usaBrilho = (json.materials ?? []).some((m) => m.extensions?.KHR_materials_sheen);
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((e) => e !== 'KHR_materials_sheen');
  if (usaBrilho) json.extensionsUsed.push('KHR_materials_sheen');
  if (!json.extensionsUsed.length) delete json.extensionsUsed;

  const bin = Buffer.concat(partes);
  let texto = Buffer.from(JSON.stringify(json), 'utf8');
  const sobra = (4 - (texto.length % 4)) % 4;
  if (sobra) texto = Buffer.concat([texto, Buffer.alloc(sobra, 0x20)]);
  const cabecalho = Buffer.alloc(20);
  cabecalho.write('glTF', 0, 'latin1');
  cabecalho.writeUInt32LE(2, 4);
  cabecalho.writeUInt32LE(20 + texto.length + 8 + bin.length, 8);
  cabecalho.writeUInt32LE(texto.length, 12);
  cabecalho.write('JSON', 16, 'latin1');
  const cabecalhoBin = Buffer.alloc(8);
  cabecalhoBin.writeUInt32LE(bin.length, 0);
  cabecalhoBin.write('BIN\0', 4, 'latin1');
  return Buffer.concat([cabecalho, texto, cabecalhoBin, bin]);
}

fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });

let total = 0;
for (const produto of produtos) {
  if (!produto.acabamentos?.length) continue;
  const original = lerGlb(fs.readFileSync(path.join(raiz, 'public', produto.modeloGlb)));
  const dadosOriginais = (original.json.bufferViews ?? []).map((v) => original.bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
  const nomes = (original.json.materials ?? []).map((m) => m.name ?? '');
  const deTecido = nomes.map((n, i) => (regraTecido.test(n) ? i : -1)).filter((i) => i >= 0);
  const alvos = deTecido.length ? deTecido : [0];

  for (const acabamento of produto.acabamentos) {
    const config = tecidos.tipos[acabamento.tipo];
    if (!config) throw new Error(`tipo de tecido sem configuração em tecidos.json: ${acabamento.tipo}`);
    const json = structuredClone(original.json);
    const dados = [...dadosOriginais];
    // textura do tipo: imagens novas + texturas novas (mesmo sampler de repetição do modelo)
    const imgs = imagensDoTipo(acabamento.tipo);
    const amostrador = json.textures?.find((t) => t.sampler !== undefined)?.sampler;
    const adicionar = (buf, nome) => {
      dados.push(buf);
      json.bufferViews.push({ buffer: 0, byteOffset: 0, byteLength: buf.length });
      (json.images ??= []).push({ name: nome, mimeType: 'image/jpeg', bufferView: json.bufferViews.length - 1 });
      (json.textures ??= []).push({ ...(amostrador !== undefined ? { sampler: amostrador } : {}), source: json.images.length - 1 });
      return json.textures.length - 1;
    };
    const texCor = adicionar(imgs.cor, `${config.arquivo}-cor`);
    const texRelevo = adicionar(imgs.relevo, `${config.arquivo}-relevo`);

    const linear = hexParaLinear(acabamento.corHex);
    for (const i of alvos) {
      const m = json.materials[i];
      const pbr = (m.pbrMetallicRoughness ??= {});
      pbr.baseColorFactor = [...linear, 1];
      pbr.baseColorTexture = { index: texCor };
      pbr.roughnessFactor = config.rugosidade;
      pbr.metallicFactor = 0;
      delete pbr.metallicRoughnessTexture;
      m.normalTexture = { index: texRelevo, scale: config.relevo };
      m.extensions ??= {};
      if (config.brilho) {
        m.extensions.KHR_materials_sheen = {
          sheenColorFactor: linear.map((c) => Math.min(1, c * config.brilho.fator + config.brilho.soma)),
          sheenRoughnessFactor: config.brilho.rugosidade,
        };
      } else delete m.extensions.KHR_materials_sheen;
      if (!Object.keys(m.extensions).length) delete m.extensions;
    }
    fs.writeFileSync(path.join(saida, `${produto.id}--${acabamento.id}.glb`), escreverGlb(json, dados));
    total++;
  }
}
console.log(`[acabamentos] ${total} modelos com tecido gerados em public/modelos/acabamentos`);

// Versão dos modelos: muda quando qualquer modelo, tecido ou cor muda. Vai no endereço dos arquivos
// (?v=...), então celular e AR baixam o modelo novo na hora, mesmo com o cache de 1 dia do Netlify.
const hash = crypto.createHash('sha1');
for (const nome of fs.readdirSync(path.join(raiz, 'public/modelos')).filter((n) => n.endsWith('.glb')).sort()) {
  hash.update(nome).update(fs.readFileSync(path.join(raiz, 'public/modelos', nome)));
}
for (const nome of fs.readdirSync(path.join(raiz, 'public/texturas')).filter((n) => n.endsWith('.jpg')).sort()) {
  hash.update(nome).update(fs.readFileSync(path.join(raiz, 'public/texturas', nome)));
}
hash.update(JSON.stringify(produtos.map((p) => p.acabamentos ?? []))).update(JSON.stringify(tecidos));
const versao = hash.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(raiz, 'src/data/versao-modelos.json'), JSON.stringify({ versao }) + '\n');
console.log(`[acabamentos] versão dos modelos: ${versao}`);
