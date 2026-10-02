import versaoModelos from '../data/versao-modelos.json';
import { formatarMedidas } from './formatar';
import type { Acabamento, Produto } from '../types';

/**
 * Modelo 3D já pintado com o tecido escolhido (gerado no build por
 * scripts/gerar-acabamentos.mjs). Sem acabamento, usa o modelo original.
 */
export function modeloDoAcabamento(produto: Produto, acabamento?: Acabamento): string {
  if (!acabamento) return produto.modeloGlb;
  return `/modelos/acabamentos/${produto.id}--${acabamento.id}.glb`;
}

/** Página do site que registra o clique e abre o WhatsApp (usada pelo botão do AR do Android). */
export function linkOrcamentoDoAR(produto: Produto, acabamento?: Acabamento): string {
  const url = new URL(`/orcamento/${produto.id}`, window.location.origin);
  if (acabamento) url.searchParams.set('acabamento', acabamento.id);
  return url.toString();
}

/**
 * Endereço do modelo com as informações que aparecem DENTRO da câmera:
 * - Android (Scene Viewer): `title` = nome do produto, `link` = botão de orçamento.
 * - iPhone (Quick Look): faixa embaixo com nome, tecido/medidas e botão "Pedir orçamento"
 *   (parâmetros depois do #; o toque no botão chega como evento "quick-look-button-tapped").
 */
export function enderecoComAR(modelo: string, produto: Produto, acabamento?: Acabamento): string {
  const busca = new URLSearchParams({
    title: produto.nome,
    link: linkOrcamentoDoAR(produto, acabamento),
    // versão do modelo: arquivo novo = endereço novo (o celular não usa o modelo antigo do cache)
    v: versaoModelos.versao,
  });
  return `${modelo}?${busca.toString()}${faixaQuickLook(produto, acabamento)}`;
}

export function faixaQuickLook(produto: Produto, acabamento?: Acabamento): string {
  const subtitulo = [acabamento?.nome, formatarMedidas(produto.medidas)].filter(Boolean).join(' · ');
  const partes = [
    ['callToAction', 'Pedir orçamento'],
    ['checkoutTitle', produto.nome],
    ['checkoutSubtitle', subtitulo],
  ];
  return '#' + partes.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}
