type ComPedidoDePermissao = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * Pede/verifica a permissão dos sensores de movimento.
 * O Chrome do Android não tem pop-up (a permissão vem da configuração do site),
 * então lá só consultamos se ela foi bloqueada. Retorna false se estiver negada.
 */
export async function pedirPermissaoSensores(): Promise<boolean> {
  try {
    const evento = window.DeviceOrientationEvent as unknown as ComPedidoDePermissao | undefined;
    if (evento?.requestPermission) {
      return (await evento.requestPermission()) === 'granted';
    }
    if (navigator.permissions?.query) {
      const nomes = ['accelerometer', 'gyroscope'] as unknown as PermissionName[];
      const estados = await Promise.all(
        nomes.map((name) =>
          navigator.permissions
            .query({ name })
            .then((r) => r.state)
            .catch(() => 'prompt' as PermissionState),
        ),
      );
      return !estados.includes('denied');
    }
  } catch {
    // Sem como verificar: seguimos e o fallback por tempo trata a falta de sensor.
  }
  return true;
}
