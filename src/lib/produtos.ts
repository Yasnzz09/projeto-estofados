import dados from '../data/products.json';
import type { Produto } from '../types';

export const produtos = dados as Produto[];

export function buscarProduto(id: string): Produto | undefined {
  return produtos.find((p) => p.id === id);
}
