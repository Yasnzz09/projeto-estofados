import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { config } from '../config';
import { pedirPermissaoSensores } from '../lib/sensores';
import type { Acabamento, Produto } from '../types';
import { CenaAR, type CotaTela } from './ar-android/CenaAR';
import {
  IconeAltura,
  IconeBaixar,
  IconeCamera,
  IconeCompartilhar,
  IconeGirarDireita,
  IconeGirarEsquerda,
  IconeMira,
  IconeMovimento,
  IconeRegua,
  IconeSeta,
  IconeX,
} from './Icones';

/**
 * Visualizador com câmera + setas, usado SOMENTE no Android.
 * Vídeo da câmera traseira ao fundo, móvel em three.js por cima (escala real),
 * câmera virtual girando com o giroscópio e posicionamento por setas.
 * Não usa Scene Viewer nem ARCore.
 */

const CHAVE_DICA = 'ar-android-dica-vista';
const { passoCm, passoRotacaoGraus, passoAlturaCm } = config.arAndroid;

type EstadoCamera = 'abrindo' | 'ok' | 'negada' | 'erro' | 'sem-https';

interface Props {
  produto: Produto;
  /** Tecido escolhido na página do produto (estofados). */
  acabamento?: Acabamento;
  aoFechar: () => void;
  aoIrParaTabela: () => void;
}

function dicaJaVista(): boolean {
  try {
    return localStorage.getItem(CHAVE_DICA) === '1';
  } catch {
    return false;
  }
}

function marcarDicaVista() {
  try {
    localStorage.setItem(CHAVE_DICA, '1');
  } catch {
    // sem storage (aba anônima etc.): a dica só aparece de novo
  }
}

const anguloTela = () => screen.orientation?.angle ?? 0;

/** Repete a ação enquanto o botão está pressionado; acelera depois de 1 s. */
function useSegurar() {
  const timers = useRef<{ espera?: number; repete?: number }>({});

  const parar = useCallback(() => {
    window.clearTimeout(timers.current.espera);
    window.clearInterval(timers.current.repete);
    timers.current = {};
  }, []);

  useEffect(() => {
    return parar;
  }, [parar]);

  return useCallback(
    (acao: (fator: number) => void, intervaloMs: number, fatorAcelerado: number) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        parar();
        acao(1);
        const inicio = performance.now();
        timers.current.espera = window.setTimeout(() => {
          timers.current.repete = window.setInterval(() => {
            acao(performance.now() - inicio > 1000 ? fatorAcelerado : 1);
          }, intervaloMs);
        }, 350);
      },
      onPointerUp: parar,
      onPointerCancel: parar,
      onLostPointerCapture: parar,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      onKeyDown: (e: { key: string; preventDefault: () => void }) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          acao(1);
        }
      },
    }),
    [parar],
  );
}

const estiloBotaoBase =
  'grid place-items-center rounded-2xl ring-1 ring-white/25 backdrop-blur-sm ' +
  'transition active:scale-95 select-none touch-none [-webkit-touch-callout:none]';
const estiloBotao = `${estiloBotaoBase} bg-black/35 text-white active:bg-black/60`;
const estiloBotaoAtivo = `${estiloBotaoBase} bg-white/90 text-grafite-900`;

function BotaoControle({
  rotulo,
  icone,
  props,
  className = '',
}: {
  rotulo: string;
  icone: ReactNode;
  props: ReturnType<ReturnType<typeof useSegurar>>;
  className?: string;
}) {
  return (
    <button type="button" aria-label={rotulo} {...props} className={`${estiloBotao} size-14 ${className}`}>
      <span className="flex flex-col items-center leading-none">
        {icone}
        <span className="mt-0.5 text-[10px] font-medium text-white/85">{rotulo}</span>
      </span>
    </button>
  );
}

export default function ARAndroid({ produto, acabamento, aoFechar, aoIrParaTabela }: Props) {
  const acabamentoRef = useRef(acabamento);
  acabamentoRef.current = acabamento;
  const videoRef = useRef<HTMLVideoElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rotulosRef = useRef<(HTMLDivElement | null)[]>([]);
  const cenaRef = useRef<CenaAR | null>(null);

  const [tentativa, setTentativa] = useState(0);
  const [estadoCamera, setEstadoCamera] = useState<EstadoCamera>('abrindo');
  const [modeloPronto, setModeloPronto] = useState(false);
  const [erroModelo, setErroModelo] = useState(false);
  const [erro3D, setErro3D] = useState(false);
  const [semSensores, setSemSensores] = useState(false);
  const [mostrarMedidas, setMostrarMedidas] = useState(false);
  // Por padrão a cena fica travada (o móvel não segue o giroscópio e não "desliza").
  const [seguirCelular, setSeguirCelular] = useState(false);
  const seguirCelularRef = useRef(seguirCelular);
  seguirCelularRef.current = seguirCelular;
  const [dica, setDica] = useState(() => !dicaJaVista());
  const [foto, setFoto] = useState<{ url: string; arquivo: File } | null>(null);
  const [tirandoFoto, setTirandoFoto] = useState(false);
  const segurar = useSegurar();
  const { largura, altura, profundidade } = produto.medidas;

  // Trava a rolagem da página por trás da tela cheia.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  // Câmera traseira. Para as tracks ao fechar ou ao tentar de novo.
  useEffect(() => {
    let cancelado = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;

    const abrir = async () => {
      setEstadoCamera('abrindo');
      // O navegador só libera a câmera em sites seguros (https).
      if (!window.isSecureContext) {
        setEstadoCamera('sem-https');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstadoCamera('erro');
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (video) {
          video.srcObject = s;
          await video.play().catch(() => undefined);
        }
        setEstadoCamera('ok');
      } catch (erro) {
        if (cancelado) return;
        const nome = erro instanceof DOMException ? erro.name : '';
        setEstadoCamera(nome === 'NotAllowedError' || nome === 'SecurityError' ? 'negada' : 'erro');
      }
    };

    void abrir();
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [tentativa]);

  // Cena 3D, sensores de orientação e redimensionamento.
  useEffect(() => {
    const palco = palcoRef.current;
    const video = videoRef.current;
    if (!palco) return;
    let cancelado = false;

    // Um canvas novo a cada abertura: reaproveitar um canvas cujo WebGL já foi
    // liberado faz o three.js quebrar (e a página inteira ficava branca).
    const canvas = document.createElement('canvas');
    canvas.className = 'block size-full';
    palco.appendChild(canvas);

    let criada: CenaAR | null = null;
    try {
      criada = new CenaAR(canvas, {
        ...config.arAndroid,
        textosCotas: [`L ${largura} cm`, `A ${altura} cm`, `P ${profundidade} cm`],
      });
    } catch (erro) {
      console.error('[AR Android] WebGL', erro);
    }
    if (!criada) {
      canvas.remove();
      setErro3D(true);
      return;
    }
    const cena = criada;
    cenaRef.current = cena;
    cena.seguirCelular = seguirCelularRef.current;
    cena.aplicarAcabamento(acabamentoRef.current ?? null);

    cena.aoAtualizarCotas = (cotas: CotaTela[] | null) => {
      const linhas = svgRef.current?.querySelectorAll('line');
      for (let i = 0; i < 3; i++) {
        const linha = linhas?.[i];
        const rotulo = rotulosRef.current[i];
        const c = cotas?.[i];
        if (linha) {
          const ok = !!c && c.a.visivel && c.b.visivel;
          linha.style.display = ok ? '' : 'none';
          if (ok) {
            linha.setAttribute('x1', String(c.a.x));
            linha.setAttribute('y1', String(c.a.y));
            linha.setAttribute('x2', String(c.b.x));
            linha.setAttribute('y2', String(c.b.y));
          }
        }
        if (rotulo) {
          const ok = !!c && c.rotulo.visivel;
          rotulo.style.display = ok ? '' : 'none';
          if (ok) rotulo.style.transform = `translate3d(${c.rotulo.x}px, ${c.rotulo.y}px, 0) translate(-50%, -50%)`;
        }
      }
    };

    cena
      .carregar(produto.modeloGlb)
      .then(() => {
        if (!cancelado) setModeloPronto(true);
      })
      .catch(() => {
        if (!cancelado) setErroModelo(true);
      });

    const ajustar = () => {
      cena.ajustarTamanho(window.innerWidth, window.innerHeight, video?.videoWidth ?? 0, video?.videoHeight ?? 0);
    };
    ajustar();
    video?.addEventListener('loadedmetadata', ajustar);
    video?.addEventListener('resize', ajustar);
    window.addEventListener('resize', ajustar);

    let recebeuSensor = false;
    const aoOrientar = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      if (!recebeuSensor) {
        recebeuSensor = true;
        setSemSensores(false);
      }
      cena.definirOrientacao(e.alpha, e.beta, e.gamma, anguloTela());
    };
    window.addEventListener('deviceorientation', aoOrientar);

    void pedirPermissaoSensores().then((permitido) => {
      if (!permitido && !cancelado) setSemSensores(true);
    });
    // Sem leitura do giroscópio em 1,5 s: câmera fixa, só as setas.
    const espera = window.setTimeout(() => {
      if (recebeuSensor || cancelado) return;
      cena.usarOrientacaoPadrao();
      setSemSensores(true);
    }, 1500);

    cena.iniciar();

    return () => {
      cancelado = true;
      window.clearTimeout(espera);
      window.removeEventListener('deviceorientation', aoOrientar);
      window.removeEventListener('resize', ajustar);
      video?.removeEventListener('loadedmetadata', ajustar);
      video?.removeEventListener('resize', ajustar);
      cena.dispose();
      canvas.remove();
      cenaRef.current = null;
    };
  }, [produto.modeloGlb, largura, altura, profundidade]);

  useEffect(() => {
    if (cenaRef.current) cenaRef.current.mostrarCotas = mostrarMedidas;
  }, [mostrarMedidas]);

  useEffect(() => {
    if (cenaRef.current) cenaRef.current.seguirCelular = seguirCelular;
  }, [seguirCelular]);

  useEffect(() => {
    cenaRef.current?.aplicarAcabamento(acabamento ?? null);
  }, [acabamento]);

  // Luz automática: mede o brilho da câmera a cada segundo e ajusta o móvel ao ambiente.
  useEffect(() => {
    if (estadoCamera !== 'ok') return;
    const amostra = document.createElement('canvas');
    amostra.width = amostra.height = 16;
    const ctx = amostra.getContext('2d', { willReadFrequently: true });
    const medir = () => {
      const video = videoRef.current;
      if (!ctx || !video || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, 16, 16);
        const px = ctx.getImageData(0, 0, 16, 16).data;
        let soma = 0;
        for (let i = 0; i < px.length; i += 4) soma += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
        cenaRef.current?.ajustarLuzAmbiente(soma / (px.length / 4) / 255);
      } catch {
        // sem acesso aos pixels: mantém a luz padrão
      }
    };
    medir();
    const t = window.setInterval(medir, 1000);
    return () => {
      window.clearInterval(t);
    };
  }, [estadoCamera]);

  // Esconde a dica sozinha depois de alguns segundos.
  useEffect(() => {
    if (!dica) return;
    const t = window.setTimeout(() => {
      setDica(false);
      marcarDicaVista();
    }, 7000);
    return () => {
      window.clearTimeout(t);
    };
  }, [dica]);

  useEffect(() => {
    if (!foto) return;
    return () => {
      URL.revokeObjectURL(foto.url);
    };
  }, [foto]);

  const fecharDica = () => {
    setDica(false);
    marcarDicaVista();
  };

  const passo = passoCm / 100;
  const mover = (frente: number, lado: number) => (fator: number) => {
    cenaRef.current?.mover(frente * passo * fator, lado * passo * fator);
  };
  const mudarAltura = (sentido: number) => (fator: number) => {
    cenaRef.current?.subir((sentido * passoAlturaCm * fator) / 100);
  };
  const girar = (sentido: number) => (fator: number) => {
    cenaRef.current?.girar(sentido * passoRotacaoGraus * Math.min(fator, 2));
  };

  const tirarFoto = async () => {
    const cena = cenaRef.current;
    const video = videoRef.current;
    if (!cena || !video || tirandoFoto) return;
    setTirandoFoto(true);
    try {
      const blob = await cena.foto(video);
      const arquivo = new File([blob], `${produto.id}-na-minha-casa.jpg`, { type: 'image/jpeg' });
      setFoto({ url: URL.createObjectURL(blob), arquivo });
    } catch {
      // ignora: o usuário pode tentar de novo
    } finally {
      setTirandoFoto(false);
    }
  };

  const podeCompartilhar = !!foto && typeof navigator.canShare === 'function' && navigator.canShare({ files: [foto.arquivo] });

  const compartilhar = async () => {
    if (!foto) return;
    try {
      await navigator.share({ files: [foto.arquivo], title: produto.nome });
    } catch {
      // cancelado pelo usuário
    }
  };

  const salvar = () => {
    if (!foto) return;
    const a = document.createElement('a');
    a.href = foto.url;
    a.download = foto.arquivo.name;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${produto.nome} na sua casa`}
      className="fixed inset-0 z-[100] touch-none select-none overflow-hidden bg-black text-white"
    >
      <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />
      <div ref={palcoRef} className="pointer-events-none absolute inset-0" />

      {/* Cotas */}
      <svg ref={svgRef} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            style={{ display: 'none', filter: 'drop-shadow(0 0 2px rgb(0 0 0 / 0.7))' }}
            stroke="#fff"
            strokeWidth={2.5}
            strokeDasharray="6 5"
          />
        ))}
      </svg>
      {[`L ${largura} cm`, `A ${altura} cm`, `P ${profundidade} cm`].map((texto, i) => (
        <div
          key={texto}
          ref={(el) => {
            rotulosRef.current[i] = el;
          }}
          style={{ display: 'none' }}
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-white px-3 py-1 text-[13px] font-bold text-grafite-900 shadow-md"
        >
          {texto}
        </div>
      ))}

      {/* Topo: resumo das medidas e fechar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="rounded-xl bg-black/40 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Medidas (cm)</p>
          <p className="text-sm font-semibold">
            L {largura} · A {altura} · P {profundidade}
          </p>
        </div>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className={`${estiloBotao} size-14 shrink-0`}>
          <IconeX className="size-7" />
        </button>
      </div>

      {/* Lateral: medidas, seguir o celular e foto */}
      <div className="absolute right-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+4.5rem)] flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMostrarMedidas((v) => !v)}
          aria-pressed={mostrarMedidas}
          className={`${mostrarMedidas ? estiloBotaoAtivo : estiloBotao} size-16`}
        >
          <span className="flex flex-col items-center leading-none">
            <IconeRegua className="size-6" />
            <span className="mt-1 text-[10px] font-medium">Medidas</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSeguirCelular((v) => !v)}
          aria-pressed={seguirCelular}
          className={`${seguirCelular ? estiloBotaoAtivo : estiloBotao} size-16`}
        >
          <span className="flex flex-col items-center leading-none">
            <IconeMovimento className="size-6" />
            <span className="mt-1 text-[10px] font-medium">{seguirCelular ? 'Seguindo' : 'Travado'}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void tirarFoto()}
          disabled={!modeloPronto || estadoCamera !== 'ok' || tirandoFoto}
          className={`${estiloBotao} size-16 disabled:opacity-40`}
        >
          <span className="flex flex-col items-center leading-none">
            <IconeCamera className="size-6" />
            <span className="mt-1 text-[10px] font-medium">Tirar foto</span>
          </span>
        </button>
      </div>

      {semSensores && (
        <p className="absolute inset-x-3 top-[calc(max(env(safe-area-inset-top),0.75rem)+4.5rem)] mr-20 rounded-xl bg-black/45 px-3 py-2 text-xs backdrop-blur-sm">
          {seguirCelular
            ? 'Movimento do celular indisponível. Use as setas — ou ative “Sensores de movimento” nas configurações do site.'
            : 'Seu celular não informou a inclinação. Se o móvel não estiver encostado no chão, ajuste com Subir / Descer.'}
        </p>
      )}

      {!modeloPronto && !erroModelo && !erro3D && estadoCamera !== 'negada' && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-medium drop-shadow">
          Carregando o móvel…
        </p>
      )}
      {erro3D && (
        <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 p-4 text-center text-sm">
          Este celular não conseguiu abrir o 3D. Tente fechar outras abas do navegador e abrir de novo.
        </p>
      )}
      {erroModelo && (
        <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-black/60 p-4 text-center text-sm">
          Não foi possível carregar o modelo 3D. Verifique sua conexão e tente de novo.
        </p>
      )}

      {dica && modeloPronto && estadoCamera === 'ok' && (
        <div className="absolute inset-x-6 top-[38%] mx-auto max-w-xs rounded-2xl bg-white/95 p-4 text-center text-grafite-900 shadow-xl">
          <p className="font-semibold">Aponte o celular para onde quer o móvel e toque em Centralizar. Depois, ajuste com as setas</p>
          <button type="button" onClick={fecharDica} className="btn-primario mt-3 w-full">
            Entendi
          </button>
        </div>
      )}

      {/* Base: aviso + controles */}
      <div className="absolute inset-x-0 bottom-0 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <p className="mx-auto mb-2 max-w-sm text-center text-[11px] leading-snug text-white/80 drop-shadow">
          Visualização aproximada. Para conferir se cabe, use a{' '}
          <button type="button" onClick={aoIrParaTabela} className="font-semibold text-white underline underline-offset-2">
            tabela de medidas
          </button>
          .
        </p>
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col gap-1.5">
            <BotaoControle rotulo="Subir" icone={<IconeAltura sentido="subir" className="size-6" />} props={segurar(mudarAltura(1), 80, 2.5)} />
            <BotaoControle rotulo="Descer" icone={<IconeAltura sentido="descer" className="size-6" />} props={segurar(mudarAltura(-1), 80, 2.5)} />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            <BotaoControle rotulo="Afastar" icone={<IconeSeta direcao="cima" className="size-6" />} props={segurar(mover(1, 0), 80, 2.5)} />
            <span />
            <BotaoControle rotulo="Esquerda" icone={<IconeSeta direcao="esquerda" className="size-6" />} props={segurar(mover(0, -1), 80, 2.5)} />
            <button
              type="button"
              onClick={() => cenaRef.current?.centralizar()}
              aria-label="Centralizar"
              className={`${estiloBotao} size-14`}
            >
              <span className="flex flex-col items-center leading-none">
                <IconeMira className="size-6" />
                <span className="mt-0.5 text-[9px] font-medium text-white/85">Centralizar</span>
              </span>
            </button>
            <BotaoControle rotulo="Direita" icone={<IconeSeta direcao="direita" className="size-6" />} props={segurar(mover(0, 1), 80, 2.5)} />
            <span />
            <BotaoControle rotulo="Aproximar" icone={<IconeSeta direcao="baixo" className="size-6" />} props={segurar(mover(-1, 0), 80, 2.5)} />
            <span />
          </div>
          <div className="flex flex-col gap-1.5">
            <BotaoControle rotulo="Girar esq." icone={<IconeGirarEsquerda className="size-6" />} props={segurar(girar(1), 160, 2)} />
            <BotaoControle rotulo="Girar dir." icone={<IconeGirarDireita className="size-6" />} props={segurar(girar(-1), 160, 2)} />
          </div>
        </div>
      </div>

      {/* Câmera negada / indisponível */}
      {(estadoCamera === 'negada' || estadoCamera === 'erro' || estadoCamera === 'sem-https') && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-grafite-900/95 p-6 text-center">
          <div className="max-w-sm">
            <IconeCamera className="mx-auto size-12 text-areia-300" />
            <p className="mt-4 text-xl font-bold">
              {estadoCamera === 'negada'
                ? 'Precisamos da câmera para mostrar o móvel na sua casa'
                : estadoCamera === 'sem-https'
                  ? 'A câmera só funciona em endereço seguro (https)'
                  : 'Não foi possível abrir a câmera'}
            </p>
            {estadoCamera === 'sem-https' && (
              <p className="mt-2 text-sm text-white/70">
                Abra o site pelo link publicado (começando com https://) para usar a câmera.
              </p>
            )}
            {estadoCamera === 'negada' && (
              <p className="mt-2 text-sm text-white/70">
                Se o pedido não aparecer, toque no cadeado ao lado do endereço do site e permita a câmera.
              </p>
            )}
            {estadoCamera !== 'sem-https' && (
              <button type="button" onClick={() => setTentativa((n) => n + 1)} className="btn mt-6 w-full bg-white text-grafite-900">
                Tentar de novo
              </button>
            )}
            <button type="button" onClick={aoFechar} className="mt-3 min-h-12 w-full text-sm font-semibold text-white/80">
              Voltar ao produto
            </button>
          </div>
        </div>
      )}

      {/* Prévia da foto */}
      {foto && (
        <div className="absolute inset-0 z-20 flex flex-col bg-black/90 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]">
          <img src={foto.url} alt={`Foto de ${produto.nome} na sua casa`} className="min-h-0 flex-1 rounded-xl object-contain" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {podeCompartilhar ? (
              <button type="button" onClick={() => void compartilhar()} className="btn-whatsapp">
                <IconeCompartilhar /> Compartilhar
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={salvar} className="btn bg-white text-grafite-900">
              <IconeBaixar /> Salvar
            </button>
          </div>
          <button type="button" onClick={() => setFoto(null)} className="mt-3 min-h-12 text-sm font-semibold text-white/80">
            Voltar para a câmera
          </button>
        </div>
      )}
    </div>
  );
}
