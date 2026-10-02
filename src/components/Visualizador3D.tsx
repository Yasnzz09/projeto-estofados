import '@google/model-viewer';
import { useEffect, useRef, useState } from 'react';
import { isAndroid } from '../lib/plataforma';
import {
  REPETICAO_TEXTURA_FOTO,
  REPETICAO_TEXTURA_GERADA,
  RUGOSIDADE,
  ehMaterialDeTecido,
  urlTexturaDeTecido,
} from '../lib/tecido';
import type { ModelViewerElement } from '../model-viewer';
import type { Acabamento, Produto } from '../types';
import { IconeCubo, IconeRegua } from './Icones';

/** Distância (m) entre a caixa do modelo e as linhas de cota, para não ficarem "dentro" do móvel. */
const AFASTAMENTO = 0.04;

/** Cada linha de cota liga dois hotspots (pontos invisíveis nas pontas). */
const LINHAS = [
  ['hotspot-largura-a', 'hotspot-largura-b'],
  ['hotspot-altura-a', 'hotspot-altura-b'],
  ['hotspot-profundidade-a', 'hotspot-profundidade-b'],
] as const;

export default function Visualizador3D({ produto, acabamento }: { produto: Produto; acabamento?: Acabamento }) {
  const mvRef = useRef<ModelViewerElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [carregado, setCarregado] = useState(false);

  // Troca de tecido: aplica cor, rugosidade e textura só nos materiais de tecido do .glb.
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv || !carregado || !acabamento) return;
    let cancelado = false;

    const criarTextura = async () => {
      if (acabamento.textura) {
        try {
          return { textura: await mv.createTexture(acabamento.textura), foto: true };
        } catch {
          // foto do tecido não encontrada: usa a trama gerada
        }
      }
      return { textura: await mv.createTexture(urlTexturaDeTecido(acabamento.tipo)), foto: false };
    };

    const aplicar = async () => {
      const materiais = mv.model?.materials ?? [];
      const deTecido = materiais.filter((m) => ehMaterialDeTecido(m.name));
      const alvos = deTecido.length > 0 ? deTecido : materiais.slice(0, 1);
      const { textura, foto } = await criarTextura();
      if (cancelado) return;
      const repeticao = foto ? REPETICAO_TEXTURA_FOTO : REPETICAO_TEXTURA_GERADA;
      textura.sampler.setScale?.({ u: repeticao, v: repeticao });
      for (const material of alvos) {
        const pbr = material.pbrMetallicRoughness;
        // Com foto, a cor já vem da imagem; com a trama gerada (cinza), a cor vem do corHex.
        pbr.setBaseColorFactor(foto ? '#ffffff' : acabamento.corHex);
        pbr.setRoughnessFactor(RUGOSIDADE[acabamento.tipo]);
        pbr.setMetallicFactor(0);
        pbr.baseColorTexture.setTexture(textura);
      }
    };

    aplicar().catch((erro: unknown) => console.warn('[tecido]', erro));
    return () => {
      cancelado = true;
    };
  }, [carregado, acabamento]);
  const [mostrarMedidas, setMostrarMedidas] = useState(false);
  const [avisoAR, setAvisoAR] = useState(false);
  const { largura, altura, profundidade } = produto.medidas;

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    const desenharLinhas = () => {
      const linhas = svgRef.current?.querySelectorAll('line');
      if (!linhas) return;
      LINHAS.forEach(([a, b], i) => {
        const p1 = mv.queryHotspot(a);
        const p2 = mv.queryHotspot(b);
        const linha = linhas[i];
        if (!p1 || !p2 || !linha) return;
        linha.setAttribute('x1', String(p1.canvasPosition.x));
        linha.setAttribute('y1', String(p1.canvasPosition.y));
        linha.setAttribute('x2', String(p2.canvasPosition.x));
        linha.setAttribute('y2', String(p2.canvasPosition.y));
      });
    };

    // Posiciona as cotas na caixa envolvente do modelo:
    // largura na aresta de baixo da frente, altura na aresta lateral direita de trás
    // e profundidade na aresta de baixo da lateral direita.
    const aoCarregar = () => {
      const c = mv.getBoundingBoxCenter();
      const t = mv.getDimensions();
      const x0 = c.x - t.x / 2, x1 = c.x + t.x / 2;
      const y0 = c.y - t.y / 2, y1 = c.y + t.y / 2;
      const z0 = c.z - t.z / 2, z1 = c.z + t.z / 2;
      const xd = x1 + AFASTAMENTO; // lado direito, afastado
      const zf = z1 + AFASTAMENTO; // frente, afastada

      const pontos: Record<string, [number, number, number]> = {
        'hotspot-largura-a': [x0, y0, zf],
        'hotspot-largura-b': [x1, y0, zf],
        'hotspot-largura': [c.x, y0, zf],
        'hotspot-altura-a': [xd, y0, z0],
        'hotspot-altura-b': [xd, y1, z0],
        'hotspot-altura': [xd, c.y, z0],
        'hotspot-profundidade-a': [xd, y0, z1],
        'hotspot-profundidade-b': [xd, y0, z0],
        'hotspot-profundidade': [xd, y0, c.z],
      };
      for (const [name, p] of Object.entries(pontos)) {
        mv.updateHotspot({ name, position: p.join(' ') });
      }
      setCarregado(true);
      requestAnimationFrame(desenharLinhas);
    };

    // No AR as linhas 2D não acompanham a câmera; escondemos as medidas.
    // Se o AR não abrir (celular sem suporte), mostramos o aviso com a tabela de medidas.
    const aoMudarAR = (e: Event) => {
      const status = (e as CustomEvent<{ status: string }>).detail?.status;
      if (status === 'session-started') setMostrarMedidas(false);
      if (status === 'failed' && isAndroid()) setAvisoAR(true);
    };

    mv.addEventListener('load', aoCarregar);
    mv.addEventListener('camera-change', desenharLinhas);
    mv.addEventListener('ar-status', aoMudarAR);
    window.addEventListener('resize', desenharLinhas);
    if (mv.loaded) aoCarregar();
    return () => {
      mv.removeEventListener('load', aoCarregar);
      mv.removeEventListener('camera-change', desenharLinhas);
      mv.removeEventListener('ar-status', aoMudarAR);
      window.removeEventListener('resize', desenharLinhas);
    };
  }, [produto.modeloGlb]);

  const irParaTabelaDeMedidas = () => {
    document.getElementById('vai-caber')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Mesmo fluxo para todos: iPhone abre o Quick Look e Android abre o Scene Viewer (AR do Google).
  const abrirAR = () => {
    const mv = mvRef.current;
    if (mv?.canActivateAR) {
      setAvisoAR(false);
      mv.activateAR();
    } else {
      setAvisoAR(true);
    }
  };

  return (
    <div>
      <div className="estudio relative h-[58vh] max-h-[580px] min-h-[340px] overflow-hidden rounded-3xl ring-1 ring-areia-200">
        <model-viewer
          ref={mvRef}
          src={produto.modeloGlb}
          ios-src={produto.modeloUsdz || undefined}
          alt={`Modelo 3D de ${produto.nome}`}
          camera-controls
          camera-orbit="30deg 75deg auto"
          touch-action="pan-y"
          shadow-intensity="1"
          shadow-softness="0.6"
          interaction-prompt="auto"
          ar
          ar-modes="scene-viewer webxr quick-look"
          ar-placement="floor"
          ar-scale="fixed"
          className={mostrarMedidas ? 'com-medidas' : ''}
          style={{ width: '100%', height: '100%' }}
        >
          {LINHAS.flat().map((nome) => (
            <div key={nome} slot={nome} className="cota-ponto" data-position="0 0 0" />
          ))}
          <div slot="hotspot-largura" className="cota-rotulo" data-position="0 0 0" data-normal="0 0 1">
            L {largura} cm
          </div>
          <div slot="hotspot-altura" className="cota-rotulo" data-position="0 0 0" data-normal="1 0 0">
            A {altura} cm
          </div>
          <div slot="hotspot-profundidade" className="cota-rotulo" data-position="0 0 0" data-normal="1 0 0">
            P {profundidade} cm
          </div>
          <svg ref={svgRef} className="cota-linhas" width="100%" height="100%" aria-hidden="true">
            <line />
            <line />
            <line />
          </svg>
        </model-viewer>

        {/* Resumo fixo das medidas */}
        <div className="pointer-events-none absolute right-3 top-3 rounded-xl bg-white/95 px-3 py-2 shadow-sm ring-1 ring-black/5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-grafite-500">Medidas (cm)</p>
          <dl className="mt-0.5 grid grid-cols-[auto_auto] gap-x-2 text-sm leading-5">
            <dt className="text-grafite-500">Largura</dt>
            <dd className="text-right font-semibold">{largura}</dd>
            <dt className="text-grafite-500">Altura</dt>
            <dd className="text-right font-semibold">{altura}</dd>
            <dt className="text-grafite-500">Profund.</dt>
            <dd className="text-right font-semibold">{profundidade}</dd>
          </dl>
        </div>

        {!carregado && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-medium text-grafite-500">
            Carregando modelo 3D…
          </div>
        )}
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-xs text-grafite-500">
          Arraste para girar · pinça para zoom
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMostrarMedidas((v) => !v)}
          aria-pressed={mostrarMedidas}
          className={mostrarMedidas ? 'btn-primario' : 'btn-secundario'}
        >
          <IconeRegua /> {mostrarMedidas ? 'Ocultar medidas' : 'Mostrar medidas'}
        </button>
        <button type="button" onClick={abrirAR} className="btn-primario">
          <IconeCubo /> Veja na sua casa
        </button>
      </div>

      {avisoAR &&
        (isAndroid() ? (
          <div role="status" className="mt-3 rounded-xl bg-areia-100 p-3 text-sm text-grafite-700">
            <p>
              Seu celular não tem suporte a realidade aumentada. Você ainda pode girar o móvel em 3D e
              conferir se ele cabe pela tabela de medidas.
            </p>
            <button type="button" onClick={irParaTabelaDeMedidas} className="mt-2 font-semibold underline underline-offset-2">
              Ir para a tabela de medidas
            </button>
          </div>
        ) : (
          <p role="status" className="mt-3 rounded-xl bg-areia-100 p-3 text-sm text-grafite-700">
            A visualização na sua casa funciona no celular (Android com ARCore ou iPhone).
            Abra esta página no seu celular e toque em <strong>“Veja na sua casa”</strong> — o móvel
            aparece no chão, em tamanho real.
          </p>
        ))}
    </div>
  );
}
