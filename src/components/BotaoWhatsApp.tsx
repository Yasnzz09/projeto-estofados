import { registrarEvento } from '../lib/analytics';
import { linkOrcamento } from '../lib/whatsapp';
import type { Acabamento, Produto } from '../types';
import { IconeChat } from './Icones';

export default function BotaoWhatsApp({
  produto,
  acabamento,
  className = '',
  rotulo = 'Pedir orçamento no WhatsApp',
  origem = 'pagina',
}: {
  produto: Produto;
  acabamento?: Acabamento;
  className?: string;
  rotulo?: string;
  /** De onde veio o clique, para a medição (pagina, formulario...). */
  origem?: string;
}) {
  return (
    <a
      href={linkOrcamento(produto, acabamento)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarEvento('pedir_orcamento', { produto: produto.id, acabamento: acabamento?.id, origem })}
      className={`btn-whatsapp w-full ${className}`}
    >
      <IconeChat /> {rotulo}
    </a>
  );
}
