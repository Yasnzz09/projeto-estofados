import tecidos from '../data/tecidos.json';
import type { TipoTecido } from '../types';

/**
 * Acabamento de cada tipo de tecido (rugosidade, relevo, brilho) — fonte única em src/data/tecidos.json,
 * usada também pelo build (scripts/gerar-acabamentos.mjs) para montar os modelos 3D de cada cor.
 */
const TIPOS = tecidos.tipos as Record<TipoTecido, { arquivo: string; rugosidade: number }>;

/** Rugosidade por tipo: 1 = fosco (bouclê, veludo, suede); couro com leve brilho. */
export const RUGOSIDADE = Object.fromEntries(
  Object.entries(TIPOS).map(([tipo, t]) => [tipo, t.rugosidade]),
) as Record<TipoTecido, number>;

/**
 * Foto de tecido (campo `textura` do acabamento): cobre ~30 cm. O UV das peças de tecido conta
 * "ladrilhos" de `metrosPorRepeticao`, então a escala da foto é a razão entre os dois.
 */
export const REPETICAO_TEXTURA_FOTO = tecidos.metrosPorRepeticao / 0.3;

/** Materiais do .glb que recebem o tecido (os pés e outras partes ficam como estão). */
export const ehMaterialDeTecido = (nome: string | undefined) =>
  !!nome && /tecido|fabric|estofad|almofad|assento|encosto|upholster|cushion/i.test(nome);

/** Textura (cinza claro, tingida pela cor) do tipo de tecido: public/texturas/<tipo>-cor.jpg. */
export function urlTexturaDeTecido(tipo: TipoTecido): string {
  return `/texturas/${TIPOS[tipo].arquivo}-cor.jpg`;
}
