import { formatarPreco } from '../lib/formatar';
import { urlTexturaDeTecido } from '../lib/tecido';
import { TIPOS_TECIDO, type Acabamento } from '../types';

interface Props {
  acabamentos: Acabamento[];
  selecionado: Acabamento;
  aoEscolher: (acabamento: Acabamento) => void;
}

/** Amostra redonda: foto do tecido ou a trama gerada tingida com a cor. */
function estiloAmostra(a: Acabamento) {
  if (a.textura) return { backgroundImage: `url(${a.textura})`, backgroundSize: 'cover' };
  return {
    backgroundColor: a.corHex,
    backgroundImage: `url(${urlTexturaDeTecido(a.tipo)})`,
    backgroundSize: '64px',
    backgroundBlendMode: 'multiply' as const,
  };
}

export default function SeletorAcabamento({ acabamentos, selecionado, aoEscolher }: Props) {
  const tipos = TIPOS_TECIDO.filter((t) => acabamentos.some((a) => a.tipo === t));
  const cores = acabamentos.filter((a) => a.tipo === selecionado.tipo);
  const adicional = selecionado.precoAdicional ?? 0;

  return (
    <section aria-labelledby="titulo-tecido" className="rounded-3xl bg-white p-5 shadow-suave ring-1 ring-areia-200 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="titulo-tecido" className="font-serif text-2xl font-medium">
          Escolha o tecido
        </h2>
        <span className="text-xs text-grafite-500">{acabamentos.length} opções</span>
      </div>

      <div role="radiogroup" aria-label="Tipo de tecido" className="mt-4 flex flex-wrap gap-2">
        {tipos.map((tipo) => {
          const ativo = tipo === selecionado.tipo;
          return (
            <button
              key={tipo}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => {
                if (ativo) return;
                const primeiro = acabamentos.find((a) => a.tipo === tipo);
                if (primeiro) aoEscolher(primeiro);
              }}
              className={`min-h-12 rounded-full px-5 text-sm font-semibold transition ${
                ativo
                  ? 'bg-grafite-900 text-offwhite shadow-suave'
                  : 'bg-areia-50 text-grafite-700 ring-1 ring-areia-300 hover:bg-areia-100'
              }`}
            >
              {tipo}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label={`Cores em ${selecionado.tipo}`} className="mt-5 flex flex-wrap gap-3">
        {cores.map((a) => {
          const ativo = a.id === selecionado.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={a.nome}
              title={a.nome}
              onClick={() => aoEscolher(a)}
              style={estiloAmostra(a)}
              className={`size-12 rounded-full ring-offset-[3px] ring-offset-white transition ${
                ativo ? 'ring-2 ring-grafite-900' : 'ring-1 ring-black/10 hover:scale-105'
              }`}
            />
          );
        })}
      </div>

      <p className="mt-4 text-sm" aria-live="polite">
        <span className="font-semibold">{selecionado.nome}</span>
        <span className="text-grafite-500">
          {adicional > 0 ? ` · + ${formatarPreco(adicional)}` : ' · sem custo adicional'}
        </span>
      </p>
    </section>
  );
}
