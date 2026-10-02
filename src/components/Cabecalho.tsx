import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { config } from '../config';
import { linkWhatsApp } from '../lib/whatsapp';
import { registrarEvento } from '../lib/analytics';
import { IconeChat } from './Icones';

const estiloLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? 'bg-areia-100 text-grafite-900' : 'text-grafite-700 hover:bg-areia-100/70 hover:text-grafite-900'
  }`;

export function Marca({ claro = false }: { claro?: boolean }) {
  const [primeira, ...resto] = config.nomeLoja.split(' ');
  return (
    <>
      {primeira}{' '}
      <span className={`italic ${claro ? 'text-terracota-300' : 'text-terracota-600'}`}>{resto.join(' ')}</span>
    </>
  );
}

export default function Cabecalho() {
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-300 ${
        rolou
          ? 'bg-offwhite/75 shadow-[0_1px_0_rgb(35_34_33/0.06),0_8px_24px_-16px_rgb(35_34_33/0.25)] backdrop-blur-md'
          : 'bg-offwhite/0'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.5rem]">
        <Link to="/" className="font-serif text-xl font-medium tracking-tight sm:text-2xl">
          <Marca />
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/" end className={(s) => `${estiloLink(s)} hidden sm:inline-flex`}>
            Início
          </NavLink>
          <NavLink to="/catalogo" className={estiloLink}>
            Catálogo
          </NavLink>
          <a
            href="#contato"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-grafite-700 hover:bg-areia-100/70 sm:inline-flex"
          >
            Contato
          </a>
          <a
            href={linkWhatsApp('Olá! Gostaria de mais informações sobre os móveis.')}
            onClick={() => registrarEvento('contato_whatsapp', { origem: 'cabecalho' })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar no WhatsApp"
            className="ml-1 grid size-11 place-items-center rounded-full bg-grafite-900 text-offwhite transition hover:bg-grafite-700"
          >
            <IconeChat className="size-5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
