import { config } from '../config';
import type { Medidas } from '../types';

export const DIMENSOES = ['largura', 'altura', 'profundidade'] as const;
export type Dimensao = (typeof DIMENSOES)[number];

export const NOME_DIMENSAO: Record<Dimensao, string> = {
  largura: 'Largura',
  altura: 'Altura',
  profundidade: 'Profundidade',
};

/** Espaço disponível do cliente, em cm. Medidas não informadas são ignoradas. */
export type Espaco = Partial<Record<Dimensao, number>>;

export interface Excesso {
  dimensao: Dimensao;
  produto: number;
  disponivel: number;
  excessoCm: number;
}

export interface ResultadoEncaixe {
  coube: boolean;
  excessos: Excesso[];
  naoVerificadas: Dimensao[];
}

/** O produto cabe se, em cada medida informada, (medida do produto + folga) <= espaço. */
export function verificarEncaixe(
  medidas: Medidas,
  espaco: Espaco,
  folga = config.folgaCm,
): ResultadoEncaixe {
  const excessos: Excesso[] = [];
  const naoVerificadas: Dimensao[] = [];
  for (const d of DIMENSOES) {
    const disponivel = espaco[d];
    if (disponivel === undefined) {
      naoVerificadas.push(d);
      continue;
    }
    const necessario = medidas[d] + folga;
    if (necessario > disponivel) {
      excessos.push({
        dimensao: d,
        produto: medidas[d],
        disponivel,
        excessoCm: Math.round((necessario - disponivel) * 10) / 10,
      });
    }
  }
  return { coube: excessos.length === 0, excessos, naoVerificadas };
}

export const temEspaco = (e: Espaco) => DIMENSOES.some((d) => e[d] !== undefined);

export function lerNumero(texto: string | null): number | undefined {
  if (!texto) return undefined;
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function espacoDaUrl(params: URLSearchParams): Espaco {
  const espaco: Espaco = {};
  for (const d of DIMENSOES) {
    const v = lerNumero(params.get(d));
    if (v !== undefined) espaco[d] = v;
  }
  return espaco;
}

export function gravarEspacoNaUrl(espaco: Espaco, params: URLSearchParams) {
  for (const d of DIMENSOES) {
    const v = espaco[d];
    if (v === undefined) params.delete(d);
    else params.set(d, String(v));
  }
}
