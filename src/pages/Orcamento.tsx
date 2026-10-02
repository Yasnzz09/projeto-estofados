import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { IconeChat } from '../components/Icones';
import { acabamentoEscolhido } from '../lib/acabamentos';
import { registrarEvento } from '../lib/analytics';
import { buscarProduto } from '../lib/produtos';
import { linkOrcamento } from '../lib/whatsapp';

/**
 * Aberta pelo botão de orçamento dentro do AR do Android (Scene Viewer).
 * Registra o clique e segue para o WhatsApp com a mensagem pronta.
 */
export default function Orcamento() {
  const { id = '' } = useParams();
  const [busca] = useSearchParams();
  const produto = buscarProduto(id);
  const acabamento = produto ? acabamentoEscolhido(produto, busca.get('acabamento')) : undefined;
  const destino = produto ? linkOrcamento(produto, acabamento) : null;

  useEffect(() => {
    if (!produto || !destino) return;
    registrarEvento('pedir_orcamento', { produto: produto.id, acabamento: acabamento?.id, origem: 'ar' });
    // Pequena espera para o registro do clique sair antes de trocar de página.
    const t = window.setTimeout(() => window.location.replace(destino), 400);
    return () => {
      window.clearTimeout(t);
    };
  }, [produto, acabamento, destino]);

  if (!produto || !destino) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Produto não encontrado</h1>
        <Link to="/catalogo" className="btn-primario mt-6">
          Ver catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-lg font-semibold">Abrindo o WhatsApp…</p>
      <p className="mt-2 text-sm text-grafite-500">
        {produto.nome}
        {acabamento ? ` · ${acabamento.nome}` : ''}
      </p>
      <a href={destino} className="btn-whatsapp mt-6 w-full">
        <IconeChat /> Abrir o WhatsApp
      </a>
    </main>
  );
}
