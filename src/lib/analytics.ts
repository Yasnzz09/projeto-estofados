import { config } from '../config';
import { isAndroid, isIOS } from './plataforma';

/**
 * Medição de cliques com o Google Analytics 4 (gratuito).
 * Só liga se `googleAnalyticsId` estiver preenchido em src/config.ts.
 *
 * Eventos enviados:
 * - ver_na_casa       → clicou em "Veja na sua casa"            (produto, acabamento, plataforma)
 * - pedir_orcamento   → clicou para pedir orçamento no WhatsApp (produto, acabamento, origem)
 *                       origem: pagina | formulario | ar
 * - contato_whatsapp  → clicou num WhatsApp geral do site        (origem)
 */

type Parametros = Record<string, string | number | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let iniciado = false;

export function iniciarAnalytics() {
  const id = config.googleAnalyticsId;
  if (!id || iniciado || typeof window === 'undefined') return;
  iniciado = true;

  window.dataLayer = window.dataLayer || [];
  // O gtag precisa receber o objeto `arguments` (não um array).
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function plataforma(): 'android' | 'iphone' | 'computador' {
  if (isIOS()) return 'iphone';
  if (isAndroid()) return 'android';
  return 'computador';
}

export function registrarEvento(nome: string, parametros: Parametros = {}) {
  const dados = { plataforma: plataforma(), ...parametros, transport_type: 'beacon' };
  if (import.meta.env.DEV) console.info('[evento]', nome, dados);
  window.gtag?.('event', nome, dados);
}
