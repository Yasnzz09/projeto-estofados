import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto';
import Revelar from '../components/Revelar';
import { IconeChat } from '../components/Icones';
import { config } from '../config';
import {
  DIMENSOES,
  NOME_DIMENSAO,
  espacoDaUrl,
  gravarEspacoNaUrl,
  lerNumero,
  temEspaco,
  verificarEncaixe,
  type Espaco,
} from '../lib/encaixe';
import { produtos } from '../lib/produtos';
import { linkWhatsApp } from '../lib/whatsapp';
import { registrarEvento } from '../lib/analytics';
import { CATEGORIAS, type Categoria, type Produto } from '../types';

const ehCategoria = (v: string | null): v is Categoria => CATEGORIAS.includes(v as Categoria);

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const categoriaParam = params.get('categoria');
  const categoria = ehCategoria(categoriaParam) ? categoriaParam : null;
  const prioridadeParam = params.get('prioridade');
  const prioridade = ehCategoria(prioridadeParam) ? prioridadeParam : null;
  const espaco = espacoDaUrl(params);
  const filtrandoEspaco = temEspaco(espaco);

  const visiveis = produtos.filter(
    (p) =>
      (!categoria || p.categoria === categoria) &&
      (!filtrandoEspaco || verificarEncaixe(p.medidas, espaco).coube),
  );

  const atualizar = (alterar: (p: URLSearchParams) => void) => {
    const novos = new URLSearchParams(params);
    alterar(novos);
    setParams(novos, { replace: true });
  };

  const escolherCategoria = (c: Categoria | null) =>
    atualizar((p) => (c ? p.set('categoria', c) : p.delete('categoria')));

  // Com prioridade (veio de "Olhar outras opções"), mostra primeiro a mesma categoria.
  const grupos: { titulo?: string; itens: Produto[] }[] =
    prioridade && !categoria
      ? [
          { titulo: `${prioridade} que cabem`, itens: visiveis.filter((p) => p.categoria === prioridade) },
          { titulo: 'Outras opções que cabem', itens: visiveis.filter((p) => p.categoria !== prioridade) },
        ].filter((g) => g.itens.length > 0)
      : [{ itens: visiveis }];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <section className="mb-8 motion-safe:animate-entrada">
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight sm:text-5xl">
          {categoria ?? 'Todos os móveis'}
        </h1>
        <p className="mt-3 max-w-2xl text-grafite-500">
          Gire cada produto em 3D, escolha o tecido e use a câmera do celular para ver o móvel no seu ambiente, em
          tamanho real.
        </p>
      </section>

      <FiltroMedidas
        key={DIMENSOES.map((d) => espaco[d] ?? '').join('x')}
        espaco={espaco}
        ativo={filtrandoEspaco}
        aoAplicar={(e) => atualizar((p) => gravarEspacoNaUrl(e, p))}
        aoLimpar={() =>
          atualizar((p) => {
            gravarEspacoNaUrl({}, p);
            p.delete('prioridade');
          })
        }
      />

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categorias">
        <Chip ativo={!categoria} onClick={() => escolherCategoria(null)}>
          Todos
        </Chip>
        {CATEGORIAS.map((c) => (
          <Chip key={c} ativo={categoria === c} onClick={() => escolherCategoria(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-suave ring-1 ring-areia-200">
          <p className="font-serif text-2xl">Nenhum produto cabe nesse espaço.</p>
          <p className="mt-1 text-grafite-500">
            Tente outra categoria ou fale com a gente — podemos indicar um modelo sob medida.
          </p>
          <a
            href={linkWhatsApp('Olá! Procuro um móvel para um espaço específico. Podem me ajudar?')}
            onClick={() => registrarEvento('contato_whatsapp', { origem: 'catalogo' })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp mt-5"
          >
            <IconeChat /> Falar no WhatsApp
          </a>
        </div>
      ) : (
        <div className="space-y-10">
          {grupos.map((g, i) => (
            <section key={g.titulo ?? i}>
              {g.titulo && <h2 className="mb-5 font-serif text-2xl font-normal sm:text-3xl">{g.titulo}</h2>}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {g.itens.map((p, j) => (
                  <Revelar key={p.id} atraso={(j % 3) * 90} className="h-full">
                    <CartaoProduto produto={p} cabe={filtrandoEspaco} />
                  </Revelar>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={ativo}
      onClick={onClick}
      className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-semibold transition ${
        ativo
          ? 'bg-grafite-900 text-offwhite shadow-suave'
          : 'bg-white text-grafite-700 ring-1 ring-areia-300 hover:bg-areia-50'
      }`}
    >
      {children}
    </button>
  );
}

function FiltroMedidas({
  espaco,
  ativo,
  aoAplicar,
  aoLimpar,
}: {
  espaco: Espaco;
  ativo: boolean;
  aoAplicar: (e: Espaco) => void;
  aoLimpar: () => void;
}) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(DIMENSOES.map((d) => [d, espaco[d]?.toString() ?? ''])),
  );
  const [aberto, setAberto] = useState(ativo);

  const aplicar = (e: FormEvent) => {
    e.preventDefault();
    const novo: Espaco = {};
    for (const d of DIMENSOES) {
      const v = lerNumero(valores[d]);
      if (v !== undefined) novo[d] = v;
    }
    aoAplicar(novo);
  };

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-secundario mb-6 w-full sm:w-auto">
        Filtrar pelo tamanho do meu espaço
      </button>
    );
  }

  return (
    <form
      onSubmit={aplicar}
      className={`mb-6 rounded-2xl p-4 ring-1 sm:p-5 ${ativo ? 'bg-green-50 ring-green-600/40' : 'bg-white ring-areia-200'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Medidas do seu espaço (cm)</h2>
          <p className="text-sm text-grafite-500">
            {ativo
              ? `Mostrando só o que cabe, com ${config.folgaCm} cm de folga.`
              : 'Digite o espaço disponível para ver só o que cabe.'}
          </p>
        </div>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-x-2 sm:border-spacing-x-3">
        <thead>
          <tr>
            {DIMENSOES.map((d) => (
              <th key={d} scope="col" className="pb-1 text-left text-sm font-medium">
                {NOME_DIMENSAO[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {DIMENSOES.map((d) => (
              <td key={d}>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="any"
                  placeholder="cm"
                  aria-label={`${NOME_DIMENSAO[d]} disponível em cm`}
                  value={valores[d]}
                  onChange={(e) => setValores((v) => ({ ...v, [d]: e.target.value }))}
                  className="campo"
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:flex">
        <button type="submit" className="btn-primario">
          Filtrar
        </button>
        <button
          type="button"
          onClick={() => {
            if (ativo) aoLimpar();
            else setAberto(false);
          }}
          className="btn-secundario"
        >
          {ativo ? 'Limpar' : 'Fechar'}
        </button>
      </div>
    </form>
  );
}
