/** Detecção simples de plataforma pelo navegador. */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ se identifica como Mac, mas tem tela de toque.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !isIOS() && /Android/i.test(navigator.userAgent);
}
