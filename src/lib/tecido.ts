import type { TipoTecido } from '../types';

/** Rugosidade por tipo: veludo bem macio, couro com leve brilho, linho e suede foscos. */
export const RUGOSIDADE: Record<TipoTecido, number> = {
  Bouclé: 1,
  Linho: 0.92,
  Veludo: 1,
  Suede: 0.88,
  Couro: 0.42,
};

/** Quantas vezes a textura se repete por metro (UV dos modelos em metros). */
export const REPETICAO_TEXTURA_GERADA = 5; // trama de ~20 cm
export const REPETICAO_TEXTURA_FOTO = 3; // foto de tecido cobrindo ~33 cm

/** Materiais do .glb que recebem o tecido (os pés e outras partes ficam como estão). */
export const ehMaterialDeTecido = (nome: string | undefined) =>
  !!nome && /tecido|fabric|estofad|almofad|assento|encosto|upholster|cushion/i.test(nome);

// ---------------------------------------------------------------------------
// Textura de trama gerada por canvas (cinza claro; a cor vem do baseColor).
// Tudo é periódico em 256 px, então a textura se repete sem emenda.

const TAMANHO = 256;
const cache = new Map<TipoTecido, HTMLCanvasElement>();
const cacheUrl = new Map<TipoTecido, string>();

/** Número pseudoaleatório estável a partir de inteiros. */
function ruido(...n: number[]) {
  let h = 2166136261;
  for (const v of n) h = Math.imul(h ^ (v | 0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

/** Ruído suave (interpolado) que fecha a emenda: `celulas` precisa dividir 256. */
function ruidoSuave(x: number, y: number, celulas: number, semente: number) {
  const passo = TAMANHO / celulas;
  const gx = x / passo, gy = y / passo;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const v = (i: number, j: number) => ruido(((i % celulas) + celulas) % celulas, ((j % celulas) + celulas) % celulas, semente);
  const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sx;
  const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

function brilho(tipo: TipoTecido, x: number, y: number): number {
  switch (tipo) {
    case 'Bouclé': {
      // fios em laçadas: "bolinhas" irregulares bem marcadas sobre um fundo macio
      const lacada = ruidoSuave(x, y, 64, 23);
      const miuda = ruidoSuave(x, y, 128, 29);
      const relevo = lacada > 0.5 ? 1 : 0.86 + 0.28 * lacada;
      return (0.8 + 0.12 * miuda + 0.06 * ruidoSuave(x, y, 8, 31)) * relevo;
    }
    case 'Linho': {
      // fios horizontais e verticais com espessura irregular (slub) + trançado
      const fio = 4;
      const linha = Math.floor(y / fio), coluna = Math.floor(x / fio);
      const trama = (linha + coluna) % 2 === 0 ? 1 : 0.955;
      const slub = 0.94 + 0.06 * ruidoSuave(x, y, 16, 3);
      const fioH = 0.965 + 0.035 * ruido(linha, 7);
      const fioV = 0.965 + 0.035 * ruido(coluna, 11);
      const borda = y % fio === 0 || x % fio === 0 ? 0.96 : 1;
      return trama * slub * fioH * fioV * borda;
    }
    case 'Veludo':
      // manchas macias de luz (pelo amassado) + granulado muito fino
      return 0.86 + 0.1 * ruidoSuave(x, y, 4, 5) + 0.04 * ruidoSuave(x, y, 32, 9) + 0.02 * ruido(x, y);
    case 'Suede':
      return 0.9 + 0.05 * ruidoSuave(x, y, 8, 13) + 0.05 * ruido(x, y, 2);
    case 'Couro': {
      // grão: células irregulares escuras + variação ampla
      const grao = ruidoSuave(x, y, 64, 17);
      const poro = grao < 0.18 ? 0.9 : 1;
      return (0.88 + 0.1 * ruidoSuave(x, y, 4, 19) + 0.03 * grao) * poro;
    }
  }
}

export function texturaDeTecido(tipo: TipoTecido): HTMLCanvasElement {
  const pronto = cache.get(tipo);
  if (pronto) return pronto;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TAMANHO;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(TAMANHO, TAMANHO);
  for (let y = 0; y < TAMANHO; y++) {
    for (let x = 0; x < TAMANHO; x++) {
      const v = Math.round(Math.min(1, brilho(tipo, x, y)) * 255);
      const i = (y * TAMANHO + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cache.set(tipo, canvas);
  return canvas;
}

export function urlTexturaDeTecido(tipo: TipoTecido): string {
  let url = cacheUrl.get(tipo);
  if (!url) {
    url = texturaDeTecido(tipo).toDataURL('image/png');
    cacheUrl.set(tipo, url);
  }
  return url;
}
