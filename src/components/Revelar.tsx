import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Aparece com fade/slide quando entra na tela. Sem animação se o usuário pediu menos movimento (CSS). */
export default function Revelar({
  children,
  atraso = 0,
  className = '',
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisivel(true);
      return;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={`revelar ${visivel ? 'visivel' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
