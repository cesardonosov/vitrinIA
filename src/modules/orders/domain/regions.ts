/** The 16 regions of Chile, as the checkout selector lists them (ADR-0005 §5). */
export const CHILE_REGIONS: ReadonlyArray<string> = Object.freeze([
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Región Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
]);

export function isChileRegion(value: string): boolean {
  return CHILE_REGIONS.includes(value);
}
