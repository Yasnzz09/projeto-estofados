import { Link } from 'react-router-dom';
import { config } from '../config';
import { linkWhatsApp } from '../lib/whatsapp';
import { registrarEvento } from '../lib/analytics';
import { CATEGORIAS } from '../types';
import { Marca } from './Cabecalho';
import {
  IconeChat,
  IconeEmail,
  IconeFacebook,
  IconeInstagram,
  IconeLocal,
  IconePinterest,
  IconeRelogio,
  IconeTelefone,
} from './Icones';

export default function Rodape() {
  const { contato, redesSociais } = config;
  const redes = [
    { nome: 'Instagram', url: redesSociais.instagram, Icone: IconeInstagram },
    { nome: 'Facebook', url: redesSociais.facebook, Icone: IconeFacebook },
    { nome: 'Pinterest', url: redesSociais.pinterest, Icone: IconePinterest },
  ].filter((r) => r.url);

  return (
    <footer id="contato" className="scroll-mt-20 bg-grafite-900 text-areia-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.2fr]">
        <div>
          <p className="font-serif text-2xl">
            <Marca claro />
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-areia-300">{config.slogan}</p>
          <div className="mt-6 flex gap-2">
            {redes.map(({ nome, url, Icone }) => (
              <a
                key={nome}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={nome}
                className="grid size-12 place-items-center rounded-full ring-1 ring-white/15 transition hover:bg-white/10"
              >
                <Icone className="size-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow text-terracota-300">Catálogo</p>
          <ul className="mt-3 text-sm">
            {CATEGORIAS.map((c) => (
              <li key={c}>
                <Link
                  to={`/catalogo?categoria=${encodeURIComponent(c)}`}
                  className="inline-flex min-h-10 items-center text-areia-200 hover:text-white"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow text-terracota-300">Contato</p>
          <ul className="mt-4 space-y-3 text-sm text-areia-200">
            <li>
              <a
                href={linkWhatsApp('Olá! Gostaria de mais informações sobre os móveis.')}
                onClick={() => registrarEvento('contato_whatsapp', { origem: 'rodape' })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 hover:text-white"
              >
                <IconeChat className="size-4 shrink-0" /> WhatsApp
              </a>
            </li>
            <li>
              <a href={`tel:+${config.whatsappNumero}`} className="inline-flex items-center gap-3 hover:text-white">
                <IconeTelefone className="size-4 shrink-0" /> {contato.telefone}
              </a>
            </li>
            <li>
              <a href={`mailto:${contato.email}`} className="inline-flex items-center gap-3 break-all hover:text-white">
                <IconeEmail className="size-4 shrink-0" /> {contato.email}
              </a>
            </li>
            <li className="flex gap-3">
              <IconeLocal className="mt-0.5 size-4 shrink-0" /> {contato.endereco}
            </li>
            <li className="flex gap-3">
              <IconeRelogio className="mt-0.5 size-4 shrink-0" /> {contato.horario}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-areia-400">
          © {new Date().getFullYear()} {config.nomeLoja}. Imagens e modelos 3D ilustrativos.
        </p>
      </div>
    </footer>
  );
}
