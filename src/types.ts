export const CATEGORIAS = ['Sofás', 'Poltronas', 'Geladeiras', 'Fogões'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const TIPOS_TECIDO = ['Linho', 'Veludo', 'Suede', 'Couro'] as const;
export type TipoTecido = (typeof TIPOS_TECIDO)[number];

/** Tecido + cor de um estofado. */
export interface Acabamento {
  id: string;
  nome: string;
  tipo: TipoTecido;
  corHex: string;
  /** Foto do tecido em public/texturas/ (quadrada, que se repete sem emenda). */
  textura?: string;
  precoAdicional?: number;
}

/** Medidas em centímetros. */
export interface Medidas {
  largura: number;
  altura: number;
  profundidade: number;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: Categoria;
  descricao: string;
  preco: number;
  medidas: Medidas;
  fotos: string[];
  /** Modelo 3D para web e Android (escala real, em metros). */
  modeloGlb: string;
  /** Modelo para iPhone (Quick Look). Se vazio, o model-viewer gera um a partir do .glb. */
  modeloUsdz?: string;
  /** Tecidos e cores disponíveis (só estofados). O primeiro é o padrão. */
  acabamentos?: Acabamento[];
}
