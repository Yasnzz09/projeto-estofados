import type { Medidas } from '../types';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarPreco = (valor: number) => moeda.format(valor);

/** Ex.: "L 210 x A 95 x P 100 cm" */
export const formatarMedidas = (m: Medidas) =>
  `L ${m.largura} x A ${m.altura} x P ${m.profundidade} cm`;

export const formatarCm = (valor: number) =>
  `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`;
