import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';
import {
  DIMENSOES,
  NOME_DIMENSAO,
  gravarEspacoNaUrl,
  lerNumero,
  temEspaco,
  verificarEncaixe,
  type Dimensao,
  type Espaco,
  type ResultadoEncaixe,
} from '../lib/encaixe';
import { formatarCm } from '../lib/formatar';
import type { Acabamento, Produto } from '../types';
import BotaoWhatsApp from './BotaoWhatsApp';
import { IconeCheck, IconeX } from './Icones';

const VAZIO: Record<Dimensao, string> = { largura: '', altura: '', profundidade: '' };

export default function FormularioEncaixe({ produto, acabamento }: { produto: Produto; acabamento?: Acabamento }) {
  const navigate = useNavigate();
  const [valores, setValores] = useState(VAZIO);
  const [resultado, setResultado] = useState<ResultadoEncaixe | null>(null);
  const [erro, setErro] = useState('');

  const espaco: Espaco = {};
  for (const d of DIMENSOES) {
    const v = lerNumero(valores[d]);
    if (v !== undefined) espaco[d] = v;
  }

  const verificar = (e: FormEvent) => {
    e.preventDefault();
    if (!temEspaco(espaco)) {
      setErro('Informe pelo menos uma medida do seu espaço.');
      setResultado(null);
      return;
    }
    setErro('');
    setResultado(verificarEncaixe(produto.medidas, espaco));
  };

  const olharOutrasOpcoes = () => {
    const params = new URLSearchParams();
    gravarEspacoNaUrl(espaco, params);
    params.set('prioridade', produto.categoria);
    navigate(`/catalogo?${params.toString()}`);
  };

  return (
    <section id="vai-caber" className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-suave ring-1 ring-areia-200 sm:p-6">
      <h2 className="font-serif text-2xl font-medium">Vai caber no seu espaço?</h2>
      <p className="mt-1 text-sm text-grafite-500">
        Meça o espaço disponível e digite em centímetros. Consideramos uma folga de{' '}
        {config.folgaCm} cm em cada medida.
      </p>

      <form onSubmit={verificar} className="mt-4 space-y-4" noValidate>
        <div className="grid grid-cols-3 gap-3">
          {DIMENSOES.map((d) => (
            <label key={d} className="block">
              <span className="block text-sm font-medium">{NOME_DIMENSAO[d]}</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step="any"
                placeholder="cm"
                value={valores[d]}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [d]: e.target.value }));
                  setResultado(null);
                }}
                className="campo mt-1"
              />
              <span className="mt-1 block text-xs text-grafite-400">Produto: {produto.medidas[d]}</span>
            </label>
          ))}
        </div>
        {erro && <p className="text-sm font-medium text-red-700">{erro}</p>}
        <button type="submit" className="btn-primario w-full">
          Verificar
        </button>
      </form>

      {resultado && (
        <div aria-live="polite" className="mt-5">
          {resultado.coube ? (
            <div className="rounded-3xl border-2 border-green-600 bg-green-50 p-5 text-green-900">
              <p className="flex items-center gap-2 text-3xl font-extrabold text-green-700">
                <IconeCheck className="size-8" /> Coube!
              </p>
              <p className="mt-2 text-sm">
                O {produto.nome} cabe no seu espaço, já contando {config.folgaCm} cm de folga.
              </p>
              <NaoVerificadas dimensoes={resultado.naoVerificadas} />
              <BotaoWhatsApp produto={produto} acabamento={acabamento} origem="formulario" className="mt-4" />
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-red-600 bg-red-50 p-5 text-red-900">
              <p className="flex items-center gap-2 text-2xl font-extrabold text-red-700 sm:text-3xl">
                <IconeX className="size-8 shrink-0" /> Infelizmente não coube
              </p>
              <ul className="mt-3 space-y-2">
                {resultado.excessos.map((x) => (
                  <li key={x.dimensao} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                    <strong>{NOME_DIMENSAO[x.dimensao]}</strong> excede em{' '}
                    <strong className="text-red-700">{formatarCm(x.excessoCm)}</strong>
                    <span className="block text-xs text-red-800/80">
                      Produto {formatarCm(x.produto)} + {config.folgaCm} cm de folga · seu espaço{' '}
                      {formatarCm(x.disponivel)}
                    </span>
                  </li>
                ))}
              </ul>
              <NaoVerificadas dimensoes={resultado.naoVerificadas} />
              <button type="button" onClick={olharOutrasOpcoes} className="btn-primario mt-4 w-full">
                Olhar outras opções
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NaoVerificadas({ dimensoes }: { dimensoes: Dimensao[] }) {
  if (dimensoes.length === 0) return null;
  const nomes = dimensoes.map((d) => NOME_DIMENSAO[d].toLowerCase()).join(' e ');
  return <p className="mt-2 text-xs opacity-80">Não verificamos: {nomes} (não informada).</p>;
}
