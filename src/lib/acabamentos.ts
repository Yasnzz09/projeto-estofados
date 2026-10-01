import type { Acabamento, Produto } from '../types';

/** Acabamento escolhido (pelo id da URL) ou o primeiro da lista. */
export function acabamentoEscolhido(produto: Produto, id: string | null): Acabamento | undefined {
  const lista = produto.acabamentos;
  if (!lista?.length) return undefined;
  return lista.find((a) => a.id === id) ?? lista[0];
}

export const precoComAcabamento = (produto: Produto, acabamento?: Acabamento) =>
  produto.preco + (acabamento?.precoAdicional ?? 0);

/** Menor preço possível (para "a partir de" no catálogo). */
export function precoMinimo(produto: Produto) {
  const adicionais = produto.acabamentos?.map((a) => a.precoAdicional ?? 0) ?? [0];
  return produto.preco + Math.min(...adicionais);
}

export const temVariacaoDePreco = (produto: Produto) =>
  new Set(produto.acabamentos?.map((a) => a.precoAdicional ?? 0) ?? []).size > 1;
