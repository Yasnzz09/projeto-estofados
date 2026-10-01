/** Parte da API do <model-viewer> usada no projeto. */
export interface ModelViewerElement extends HTMLElement {
  loaded: boolean;
  canActivateAR: boolean;
  activateAR(): Promise<void>;
  getDimensions(): { x: number; y: number; z: number };
  getBoundingBoxCenter(): { x: number; y: number; z: number };
  updateHotspot(config: { name: string; position?: string; normal?: string }): void;
  queryHotspot(name: string): { canvasPosition: { x: number; y: number }; facingCamera: boolean } | null;
  /** Cena carregada: materiais editáveis (troca de tecido). */
  model?: { materials: MaterialModelViewer[] };
  createTexture(uri: string): Promise<TexturaModelViewer>;
}

export interface TexturaModelViewer {
  sampler: { setScale?: (escala: { u: number; v: number }) => void };
}

export interface MaterialModelViewer {
  name: string;
  pbrMetallicRoughness: {
    setBaseColorFactor(cor: string | [number, number, number, number]): void;
    setRoughnessFactor(valor: number): void;
    setMetallicFactor(valor: number): void;
    baseColorTexture: { setTexture(textura: TexturaModelViewer | null): void };
  };
}

interface AtributosModelViewer {
  src?: string;
  'ios-src'?: string;
  alt?: string;
  ar?: boolean;
  'ar-modes'?: string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  'camera-controls'?: boolean;
  'camera-orbit'?: string;
  'touch-action'?: string;
  'shadow-intensity'?: string;
  'shadow-softness'?: string;
  exposure?: string;
  'interaction-prompt'?: string;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> &
        AtributosModelViewer;
    }
  }
}
