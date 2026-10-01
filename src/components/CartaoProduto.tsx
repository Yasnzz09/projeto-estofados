import { Link } from 'react-router-dom';
import { precoMinimo, temVariacaoDePreco } from '../lib/acabamentos';
import { formatarMedidas, formatarPreco } from '../lib/formatar';
import type { Produto } from '../types';
import { IconeCheck, IconeCubo } from './Icones';

const MAX_BOLINHAS = 6;

export default function CartaoProduto({ produto, cabe }: { produto: Produto; cabe?: boolean }) {
  const acabamentos = produto.acabamentos ?? [];
  const aPartirDe = temVariacaoDePreco(produto);

  return (
    <Link
      to={`/produto/${produto.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-suave ring-1 ring-areia-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-elevada focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-grafite-900"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-areia-100">
        <img
          src={produto.fotos[0]}
          alt={produto.nome}
          loading="lazy"
          className="size-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-grafite-900 shadow-sm backdrop-blur">
          <IconeCubo className="size-3.5" /> Ver em 3D
        </span>
        {cabe && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            <IconeCheck className="size-3.5" /> Cabe
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="eyebrow">{produto.categoria}</span>
        <h3 className="mt-1.5 font-serif text-xl font-medium leading-snug">{produto.nome}</h3>
        <p className="mt-1 text-sm text-grafite-500">{formatarMedidas(produto.medidas)}</p>

        {acabamentos.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5" aria-label={`${acabamentos.length} opções de tecido`}>
            {acabamentos.slice(0, MAX_BOLINHAS).map((a) => (
              <span
                key={a.id}
                title={a.nome}
                className="size-4 rounded-full ring-1 ring-black/10 ring-offset-1"
                style={{ backgroundColor: a.corHex }}
              />
            ))}
            {acabamentos.length > MAX_BOLINHAS && (
              <span className="ml-0.5 text-xs font-medium text-grafite-500">+{acabamentos.length - MAX_BOLINHAS}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p>
            {aPartirDe && <span className="block text-xs text-grafite-500">a partir de</span>}
            <span className="text-2xl font-semibold tracking-tight">{formatarPreco(precoMinimo(produto))}</span>
          </p>
          <span className="grid size-10 place-items-center rounded-full bg-areia-100 text-grafite-700 transition group-hover:bg-terracota-500 group-hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
