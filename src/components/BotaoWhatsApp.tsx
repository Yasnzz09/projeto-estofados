import { linkOrcamento } from '../lib/whatsapp';
import type { Acabamento, Produto } from '../types';
import { IconeChat } from './Icones';

export default function BotaoWhatsApp({
  produto,
  acabamento,
  className = '',
  rotulo = 'Pedir orçamento no WhatsApp',
}: {
  produto: Produto;
  acabamento?: Acabamento;
  className?: string;
  rotulo?: string;
}) {
  return (
    <a
      href={linkOrcamento(produto, acabamento)}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn-whatsapp w-full ${className}`}
    >
      <IconeChat /> {rotulo}
    </a>
  );
}
