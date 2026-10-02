import type { ReactNode } from 'react';

function Icone({ children, className = 'size-5' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const IconeRegua = (p: P) => (
  <Icone {...p}>
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
    <path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
  </Icone>
);

export const IconeCubo = (p: P) => (
  <Icone {...p}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </Icone>
);

export const IconeChat = (p: P) => (
  <Icone {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Icone>
);

export const IconeCheck = (p: P) => (
  <Icone {...p}>
    <path d="M5 12.5 10 17.5 20 7" />
  </Icone>
);

export const IconeX = (p: P) => (
  <Icone {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
);

export const IconeVoltar = (p: P) => (
  <Icone {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icone>
);

export const IconeSeta = ({ direcao, className }: P & { direcao: 'cima' | 'baixo' | 'esquerda' | 'direita' }) => {
  const giro = { cima: 0, direita: 90, baixo: 180, esquerda: 270 }[direcao];
  return (
    <Icone className={className}>
      <path d="M12 19V5M5 12l7-7 7 7" transform={`rotate(${giro} 12 12)`} />
    </Icone>
  );
};

export const IconeGirarEsquerda = (p: P) => (
  <Icone {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icone>
);

export const IconeGirarDireita = (p: P) => (
  <Icone {...p}>
    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </Icone>
);

export const IconeMira = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icone>
);

/** Seta para cima ou para baixo com uma linha de "chão": usada em Subir / Descer. */
export const IconeAltura = ({ sentido, className }: P & { sentido: 'subir' | 'descer' }) => (
  <Icone className={className}>
    {sentido === 'subir' ? <path d="M12 16V4M7 9l5-5 5 5" /> : <path d="M12 4v12M7 11l5 5 5-5" />}
    <path d="M4 20h16" />
  </Icone>
);

export const IconeCamera = (p: P) => (
  <Icone {...p}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </Icone>
);

export const IconeCompartilhar = (p: P) => (
  <Icone {...p}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Icone>
);

export const IconeBaixar = (p: P) => (
  <Icone {...p}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </Icone>
);

export const IconeInstagram = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </Icone>
);

export const IconeFacebook = (p: P) => (
  <Icone {...p}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </Icone>
);

export const IconePinterest = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M11 8.5c2.6-.8 5 .6 5 3 0 2.2-1.6 3.8-3.4 3.4-.9-.2-1.4-.9-1.4-.9L10 21" />
  </Icone>
);

export const IconeTelefone = (p: P) => (
  <Icone {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Icone>
);

export const IconeEmail = (p: P) => (
  <Icone {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </Icone>
);

export const IconeLocal = (p: P) => (
  <Icone {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icone>
);

export const IconeRelogio = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icone>
);

export const IconeSetaDireita = (p: P) => (
  <Icone {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icone>
);

export const IconeMenu = (p: P) => (
  <Icone {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icone>
);
