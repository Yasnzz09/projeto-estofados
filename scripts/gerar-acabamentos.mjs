// Gera uma cópia de cada modelo 3D para cada tecido/cor (acabamento) cadastrado.
//
// Por quê: no Android, o AR do Google (Scene Viewer) baixa o arquivo .glb direto do site,
// então a cor escolhida só aparece no AR se existir um arquivo já pintado com ela.
// (No iPhone o Quick Look gera o modelo a partir da tela, então não precisa.)
//
// Roda sozinho antes do `npm run dev` e do `npm run build` (inclusive no Netlify).
// Saída: public/modelos/acabamentos/<produto>--<acabamento>.glb  (pasta ignorada pelo git)
//
// Só os materiais de tecido mudam (nome com "tecido", "almofada", "assento"...);
// pés e outras partes ficam como estão. Sem dependências: lê e escreve o GLB "na mão".

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const produtos = JSON.parse(fs.readFileSync(path.join(raiz, 'src/data/products.json'), 'utf8'));
const tecidoTs = fs.readFileSync(path.join(raiz, 'src/lib/tecido.ts'), 'utf8');
const saida = path.join(raiz, 'public/modelos/acabamentos');

// Mesma regra e mesmas rugosidades do site (lidas de src/lib/tecido.ts, fonte única).
const regraTecido = new RegExp(tecidoTs.match(/ehMaterialDeTecido[^/]*\/(.+?)\/i/)[1], 'i');
const RUGOSIDADE = Object.fromEntries(
  [...tecidoTs.match(/RUGOSIDADE[^{]*\{([^}]*)\}/)[1].matchAll(/([\p{L}\w]+):\s*([\d.]+)/gu)].map(([, k, v]) => [k, +v]),
);

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
  const resto = buf.subarray(20 + tamJson); // chunk binário (se houver), sem alterações
  return { json, resto };
}

function escreverGlb(json, resto) {
  let texto = Buffer.from(JSON.stringify(json), 'utf8');
  const sobra = (4 - (texto.length % 4)) % 4;
  if (sobra) texto = Buffer.concat([texto, Buffer.alloc(sobra, 0x20)]);
  const cabecalho = Buffer.alloc(20);
  cabecalho.write('glTF', 0, 'latin1');
  cabecalho.writeUInt32LE(2, 4);
  cabecalho.writeUInt32LE(20 + texto.length + resto.length, 8);
  cabecalho.writeUInt32LE(texto.length, 12);
  cabecalho.write('JSON', 16, 'latin1');
  return Buffer.concat([cabecalho, texto, resto]);
}

fs.rmSync(saida, { recursive: true, force: true });
fs.mkdirSync(saida, { recursive: true });

let total = 0;
for (const produto of produtos) {
  if (!produto.acabamentos?.length) continue;
  const original = fs.readFileSync(path.join(raiz, 'public', produto.modeloGlb));
  const { json, resto } = lerGlb(original);
  const materiais = json.materials ?? [];
  const deTecido = materiais.filter((m) => regraTecido.test(m.name ?? ''));
  const alvos = deTecido.length ? deTecido : materiais.slice(0, 1);

  for (const acabamento of produto.acabamentos) {
    const [r, g, b] = hexParaLinear(acabamento.corHex);
    for (const m of alvos) {
      const pbr = (m.pbrMetallicRoughness ??= {});
      pbr.baseColorFactor = [r, g, b, 1];
      pbr.roughnessFactor = RUGOSIDADE[acabamento.tipo] ?? 0.9;
      pbr.metallicFactor = 0;
    }
    fs.writeFileSync(path.join(saida, `${produto.id}--${acabamento.id}.glb`), escreverGlb(json, resto));
    total++;
  }
}
console.log(`[acabamentos] ${total} modelos coloridos gerados em public/modelos/acabamentos`);

// Versão dos modelos: muda quando qualquer modelo, tecido ou cor muda. Vai no endereço dos arquivos
// (?v=...), então celular e AR baixam o modelo novo na hora, mesmo com o cache de 1 dia do Netlify.
const hash = crypto.createHash('sha1');
for (const nome of fs.readdirSync(path.join(raiz, 'public/modelos')).filter((n) => n.endsWith('.glb')).sort()) {
  hash.update(nome).update(fs.readFileSync(path.join(raiz, 'public/modelos', nome)));
}
hash.update(JSON.stringify(produtos.map((p) => p.acabamentos ?? []))).update(JSON.stringify(RUGOSIDADE));
const versao = hash.digest('hex').slice(0, 10);
fs.writeFileSync(path.join(raiz, 'src/data/versao-modelos.json'), JSON.stringify({ versao }) + '\n');
console.log(`[acabamentos] versão dos modelos: ${versao}`);
