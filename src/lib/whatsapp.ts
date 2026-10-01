import { config } from '../config';
import type { Acabamento, Produto } from '../types';
import { formatarMedidas } from './formatar';

export function linkWhatsApp(mensagem: string) {
  return `https://wa.me/${config.whatsappNumero}?text=${encodeURIComponent(mensagem)}`;
}

export function linkOrcamento(produto: Produto, acabamento?: Acabamento) {
  const tecido = acabamento ? `, tecido ${acabamento.nome}` : '';
  return linkWhatsApp(
    `Olá! Tenho interesse no ${produto.nome}${tecido} (${formatarMedidas(produto.medidas)}). Gostaria de um orçamento.`,
  );
}
