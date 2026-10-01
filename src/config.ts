export const config = {
  nomeLoja: 'Casa Estofados',
  /** Número do WhatsApp só com dígitos: 55 + DDD + número. */
  whatsappNumero: '5511999999999',
  /** Folga (em cm) somada a cada medida do produto ao verificar se ele cabe. */
  folgaCm: 2,

  /** Rodapé. Troque pelos dados reais da loja. */
  slogan: 'Móveis e estofados para viver bem em casa.',
  contato: {
    telefone: '(11) 99999-9999',
    email: 'contato@casaestofados.com.br',
    endereco: 'Rua das Palmeiras, 120 — Jardins, São Paulo – SP',
    horario: 'Seg. a sáb., das 9h às 19h',
  },
  redesSociais: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    pinterest: 'https://pinterest.com/',
  },

  /** Visualizador com câmera + setas (somente Android). */
  arAndroid: {
    /** Altura estimada do celular em relação ao chão, em metros. */
    alturaCameraM: 1.4,
    /** Distância em que o móvel aparece (e volta ao "Centralizar"), em metros. */
    distanciaInicialM: 2,
    /** Quanto cada toque nas setas move o móvel, em cm. */
    passoCm: 5,
    /** Quanto cada toque em ⟲ / ⟳ gira o móvel, em graus. */
    passoRotacaoGraus: 15,
    /** Campo de visão da câmera traseira no lado maior da imagem (típico: 63° a 70°). */
    fovCameraGraus: 66,
  },
};
