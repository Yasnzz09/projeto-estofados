import { Link, useParams, useSearchParams } from 'react-router-dom';
import BotaoWhatsApp from '../components/BotaoWhatsApp';
import FormularioEncaixe from '../components/FormularioEncaixe';
import Galeria from '../components/Galeria';
import { IconeVoltar } from '../components/Icones';
import SeletorAcabamento from '../components/SeletorAcabamento';
import Visualizador3D from '../components/Visualizador3D';
import { acabamentoEscolhido, precoComAcabamento } from '../lib/acabamentos';
import { formatarPreco } from '../lib/formatar';
import { buscarProduto } from '../lib/produtos';
import type { Acabamento, Produto } from '../types';

export default function PaginaProduto() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const produto = buscarProduto(id);

  if (!produto) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl">Produto não encontrado</h1>
        <Link to="/catalogo" className="btn-primario mt-6">
          Ver catálogo
        </Link>
      </main>
    );
  }

  // O acabamento fica na URL (?acabamento=id) para o link compartilhado abrir com a cor certa.
  const acabamento = acabamentoEscolhido(produto, params.get('acabamento'));
  const preco = precoComAcabamento(produto, acabamento);
  const escolherAcabamento = (a: Acabamento) => {
    const novos = new URLSearchParams(params);
    novos.set('acabamento', a.id);
    setParams(novos, { replace: true });
  };

  const { largura, altura, profundidade } = produto.medidas;

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-4 lg:pb-16">
        <nav className="mb-5 flex items-center gap-1 text-sm text-grafite-500">
          <Link to="/catalogo" className="inline-flex min-h-10 items-center gap-1 rounded-lg pr-2 hover:text-grafite-900">
            <IconeVoltar className="size-4" /> Catálogo
          </Link>
          <span aria-hidden="true">/</span>
          <Link to={`/catalogo?categoria=${encodeURIComponent(produto.categoria)}`} className="hover:text-grafite-900">
            {produto.categoria}
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div className="space-y-6">
            <div className="lg:hidden">
              <Titulo produto={produto} preco={preco} acabamento={acabamento} />
            </div>
            <Visualizador3D key={produto.id} produto={produto} acabamento={acabamento} />
            <Galeria fotos={produto.fotos} nome={produto.nome} />
          </div>

          <div className="space-y-6">
            <div className="hidden lg:block">
              <Titulo produto={produto} preco={preco} acabamento={acabamento} />
            </div>
            <p className="leading-relaxed text-grafite-700">{produto.descricao}</p>

            {produto.acabamentos && acabamento && (
              <SeletorAcabamento
                acabamentos={produto.acabamentos}
                selecionado={acabamento}
                aoEscolher={escolherAcabamento}
              />
            )}

            <div className="overflow-hidden rounded-3xl bg-white shadow-suave ring-1 ring-areia-200">
              <h2 className="border-b border-areia-200 px-5 py-3.5 font-serif text-lg font-medium">Medidas do produto</h2>
              <dl className="grid grid-cols-3 divide-x divide-areia-200 text-center">
                {[
                  ['Largura', largura],
                  ['Altura', altura],
                  ['Profundidade', profundidade],
                ].map(([nome, valor]) => (
                  <div key={nome} className="px-2 py-4">
                    <dt className="text-xs uppercase tracking-wider text-grafite-500">{nome}</dt>
                    <dd className="mt-1 font-serif text-2xl">
                      {valor}
                      <span className="ml-0.5 font-sans text-sm text-grafite-500">cm</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <BotaoWhatsApp produto={produto} acabamento={acabamento} className="hidden lg:inline-flex" />
            <FormularioEncaixe key={produto.id} produto={produto} acabamento={acabamento} />
          </div>
        </div>
      </main>

      {/* Barra fixa de orçamento no celular */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-areia-200 bg-offwhite/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[11px] leading-tight text-grafite-500">{acabamento ? acabamento.nome : 'Preço'}</p>
            <p className="text-lg font-semibold leading-tight">{formatarPreco(preco)}</p>
          </div>
          <BotaoWhatsApp produto={produto} acabamento={acabamento} rotulo="Pedir orçamento" className="flex-1 px-4" />
        </div>
      </div>
    </>
  );
}

function Titulo({ produto, preco, acabamento }: { produto: Produto; preco: number; acabamento?: Acabamento }) {
  return (
    <div>
      <p className="eyebrow">{produto.categoria}</p>
      <h1 className="mt-2 font-serif text-3xl font-normal leading-tight tracking-tight sm:text-4xl">{produto.nome}</h1>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl font-semibold tracking-tight">{formatarPreco(preco)}</span>
        {acabamento && <span className="text-sm text-grafite-500">em {acabamento.nome}</span>}
      </p>
    </div>
  );
}
