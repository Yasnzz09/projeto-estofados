import { Link, Navigate, useSearchParams } from 'react-router-dom';
import CartaoProduto from '../components/CartaoProduto';
import { IconeCamera, IconeChat, IconeCubo, IconeSetaDireita } from '../components/Icones';
import Revelar from '../components/Revelar';
import { produtos } from '../lib/produtos';
import { linkWhatsApp } from '../lib/whatsapp';
import { registrarEvento } from '../lib/analytics';
import { CATEGORIAS } from '../types';

const DIFERENCIAIS = [
  {
    Icone: IconeCubo,
    titulo: 'Veja em 3D',
    texto: 'Gire, aproxime e confira cada detalhe — com as medidas reais desenhadas no modelo.',
  },
  {
    Icone: IconeCamera,
    titulo: 'Veja na sua casa',
    texto: 'Aponte o celular para o chão e veja o móvel no seu ambiente, em tamanho real.',
  },
  {
    Icone: IconeChat,
    titulo: 'Orçamento rápido no WhatsApp',
    texto: 'Escolheu o tecido? Um toque e a mensagem já vai pronta com o produto e as medidas.',
  },
];

const destaques = ['sofa-dublin', 'poltrona-aurora', 'sofa-lisboa']
  .map((id) => produtos.find((p) => p.id === id))
  .filter((p) => p !== undefined);

export default function Home() {
  const [params] = useSearchParams();
  // Links antigos (/?largura=...) continuam funcionando: o catálogo agora fica em /catalogo.
  if (params.toString()) return <Navigate to={`/catalogo?${params.toString()}`} replace />;

  return (
    <main>
      {/* ---------- Banner ---------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-40 size-[34rem] rounded-full bg-terracota-100/70 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-areia-200/70 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-16">
          <div className="motion-safe:animate-entrada">
            <p className="eyebrow">Showroom em 3D · Realidade aumentada</p>
            <h1 className="mt-4 font-serif text-[2.6rem] font-normal leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.2rem]">
              Veja o sofá na sua sala <em className="font-normal text-terracota-600">antes de comprar</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-grafite-700">
              Gire cada peça em 3D, escolha o tecido e projete o móvel no seu ambiente pela câmera do celular —
              com as medidas reais.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/catalogo" className="btn-destaque px-8">
                Ver catálogo <IconeSetaDireita className="size-5" />
              </Link>
              <a href="#como-funciona" className="btn-secundario">
                Como funciona
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-grafite-500">
              <li>✓ Medidas reais</li>
              <li>✓ Tecidos e cores à sua escolha</li>
              <li>✓ Orçamento sem compromisso</li>
            </ul>
          </div>

          <MockupCelular />
        </div>
      </section>

      {/* ---------- Diferenciais ---------- */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-areia-200 bg-white/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:gap-6 lg:py-16">
          {DIFERENCIAIS.map(({ Icone, titulo, texto }, i) => (
            <Revelar key={titulo} atraso={i * 120} className="flex gap-4 sm:flex-col">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-terracota-50 text-terracota-600 ring-1 ring-terracota-100">
                <Icone className="size-6" />
              </span>
              <div>
                <h2 className="font-serif text-xl font-medium">{titulo}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-grafite-500">{texto}</p>
              </div>
            </Revelar>
          ))}
        </div>
      </section>

      {/* ---------- Categorias ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <Revelar className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Categorias</p>
            <h2 className="mt-2 font-serif text-3xl font-normal sm:text-4xl">Para cada canto da casa</h2>
          </div>
          <Link to="/catalogo" className="hidden items-center gap-1 text-sm font-semibold hover:text-terracota-600 sm:inline-flex">
            Ver tudo <IconeSetaDireita className="size-4" />
          </Link>
        </Revelar>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {CATEGORIAS.map((categoria, i) => {
            const daCategoria = produtos.filter((p) => p.categoria === categoria);
            const capa = daCategoria[0]?.fotos[0];
            return (
              <Revelar key={categoria} atraso={i * 90}>
                <Link
                  to={`/catalogo?categoria=${encodeURIComponent(categoria)}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-areia-100 shadow-suave"
                >
                  {capa && (
                    <img
                      src={capa}
                      alt=""
                      loading="lazy"
                      className="size-full object-contain p-2 pb-16 transition duration-700 ease-out group-hover:scale-[1.07]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-grafite-900/75 via-grafite-900/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-offwhite sm:p-5">
                    <h3 className="font-serif text-2xl font-normal sm:text-[1.7rem]">{categoria}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-areia-200">
                      {daCategoria.length} {daCategoria.length === 1 ? 'modelo' : 'modelos'}
                      <IconeSetaDireita className="size-4 transition group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              </Revelar>
            );
          })}
        </div>
      </section>

      {/* ---------- Destaques ---------- */}
      <section className="bg-linho/60">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <Revelar>
            <p className="eyebrow">Mais procurados</p>
            <h2 className="mt-2 font-serif text-3xl font-normal sm:text-4xl">Escolha o tecido e veja na hora</h2>
          </Revelar>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destaques.map((p, i) => (
              <Revelar key={p.id} atraso={i * 120} className="h-full">
                <CartaoProduto produto={p} />
              </Revelar>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Chamada final ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
        <Revelar className="relative overflow-hidden rounded-[2rem] bg-grafite-900 px-6 py-12 text-center text-offwhite sm:px-12">
          <div aria-hidden="true" className="absolute -right-20 -top-24 size-72 rounded-full bg-terracota-500/25 blur-3xl" />
          <h2 className="relative font-serif text-3xl font-normal sm:text-4xl">Não achou a medida certa?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-areia-200">
            Conte o tamanho do seu espaço e a gente indica o modelo ideal — ou faz sob medida.
          </p>
          <a
            href={linkWhatsApp('Olá! Procuro um móvel para um espaço específico. Podem me ajudar?')}
            onClick={() => registrarEvento('contato_whatsapp', { origem: 'home' })}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp relative mt-7"
          >
            <IconeChat /> Falar no WhatsApp
          </a>
        </Revelar>
      </section>
    </main>
  );
}

/** Banner: celular mostrando o Sofá Dublin "na sala" (render do modelo 3D), com cota e seletor de tecido. */
function MockupCelular() {
  const amostras = ['#e9e2d6', '#d6c6ac', '#bdb8b0', '#b98a5e', '#7f7b55', '#5c5954'];
  return (
    <div className="relative mx-auto w-full max-w-[19rem] motion-safe:animate-entrada [animation-delay:150ms] sm:max-w-sm">
      <div className="relative aspect-[9/17] overflow-hidden rounded-[2.6rem] border-[10px] border-grafite-900 bg-areia-100 shadow-elevada">
        <img
          src="/fotos/hero-ar.jpg"
          alt="Sofá Cama Dublin visto pela câmera do celular, em tamanho real na sala"
          className="absolute inset-0 size-full object-cover"
        />
        {/* cota: largura medida na frente do sofá */}
        <div className="absolute left-[7%] right-[10%] top-[67%] flex items-center">
          <span className="h-3 border-l-2 border-grafite-900/70" />
          <span className="h-px flex-1 border-t-2 border-dashed border-grafite-900/70" />
          <span className="mx-2 rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow">L 190 cm</span>
          <span className="h-px flex-1 border-t-2 border-dashed border-grafite-900/70" />
          <span className="h-3 border-l-2 border-grafite-900/70" />
        </div>
        <div className="absolute inset-x-0 top-0 flex justify-center pt-2">
          <span className="h-5 w-24 rounded-full bg-grafite-900" />
        </div>
        <span className="absolute left-3 top-10 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
          Veja na sua casa
        </span>
      </div>

      {/* cartão flutuante de tecido */}
      <div className="absolute -left-6 bottom-10 w-48 rounded-2xl bg-white/95 p-3 shadow-elevada ring-1 ring-areia-200 backdrop-blur sm:-left-14">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-grafite-500">Tecido</p>
        <div className="mt-2 flex gap-1.5">
          {amostras.map((cor, i) => (
            <span
              key={cor}
              className={`size-5 rounded-full ring-black/10 ${i === 0 ? 'ring-2 ring-grafite-900 ring-offset-2' : 'ring-1'}`}
              style={{ backgroundColor: cor }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold">Bouclé Off-White</p>
      </div>
    </div>
  );
}
