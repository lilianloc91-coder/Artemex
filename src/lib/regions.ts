import { images, pieces, type Piece } from './toltek';
import acatlanCover from '@/assets/acatlan-mixteca-cover.jpg';

export type CulturalRegion = {
  id: string; name: string; state: string; area: string; description: string;
  image: string; communities: string[]; techniques: string[]; pieceIds: string[];
  position: { lat: number; lng: number };
  municipalityCode?: string;
};

// Public editorial catalog. Region membership is explicit, never inferred from a translated label.
export const culturalRegions: CulturalRegion[] = [
  { id: 'cuetzalan', municipalityCode: '043', name: 'Cuetzalan del Progreso', state: 'Puebla', area: 'Sierra Norte de Puebla', description: 'Comunidad de origen Nahua que habita entre la niebla y el verdor de la Sierra Norte. Sus familias entrelazan la vida cotidiana entre el cultivo de café y el ritmo ancestral del telar de cintura, preservando saberes que dan forma a su identidad.', image: images.cuetzalanCourtyard, communities: ['Cuetzalan', 'Nahua', 'Masehual'], techniques: ['Telar de cintura', 'Bordado a mano', 'Cestería de jonote'], pieceIds: ['TK-0701', 'TK-0702', 'TK-0703'], position: { lat: 20.0172893, lng: -97.523066 } },
  { id: 'acatlan', municipalityCode: '003', name: 'Acatlán de Osorio', state: 'Puebla', area: 'Mixteca Poblana', description: 'Cuna de la danza del Tecuani y el barro bruñido rojo. Entre cerros secos y cantos de carrizo, los maestros mixtecos tallan máscaras de felino y modelan figuras ceremoniales que preservan el rito de la lluvia.', image: acatlanCover, communities: ['Acatlán de Osorio', 'Mixteca'], techniques: ['Tallado en copal', 'Confección textil', 'Ensamble de ixtle'], pieceIds: ['TK-0512'], position: { lat: 18.2019204, lng: -98.0484434 } },
  { id: 'puebla', municipalityCode: '114', name: 'Puebla de Zaragoza', state: 'Puebla', area: 'Valle de Puebla', description: 'Talavera y cerámica poblana: modelado, esmaltado y decoración a mano que dan identidad a cada pieza del taller.', image: images.talavera, communities: ['Puebla de Zaragoza', 'Gremio Alfarero de Puebla'], techniques: ['Talavera y Cerámica', 'Esmaltado', 'Pintura a mano'], pieceIds: ['TK-0388'], position: { lat: 19.0414398, lng: -98.2062727 } },
  { id: 'tilcajete', name: 'San Martín Tilcajete', state: 'Oaxaca', area: 'Valles Centrales de Oaxaca', description: 'Tierras zapotecas donde la madera de copal cobra vida en nahuales y alebrijes. Cada pieza es tallada con machete siguiendo la veta viva del árbol y decorada a mano con pigmentos minerales.', image: images.alebrije, communities: ['San Martín Tilcajete', 'Zapoteca'], techniques: ['Talla en copal', 'Pigmentos naturales'], pieceIds: ['TK-0042'], position: { lat: 16.8602196, lng: -96.69470099999999 } },
  { id: 'coyotepec', name: 'San Bartolo Coyotepec', state: 'Oaxaca', area: 'Valles Centrales de Oaxaca', description: 'El barro negro toma forma en manos del taller: modelado, calado y bruñido preservan la memoria del oficio alfarero.', image: images.barroNegro, communities: ['San Bartolo Coyotepec', 'Zapoteca'], techniques: ['Barro negro bruñido', 'Calado'], pieceIds: ['TK-0117'], position: { lat: 16.9541863, lng: -96.7079287 } },
  { id: 'chamula', name: 'San Juan Chamula', state: 'Chiapas', area: 'Los Altos de Chiapas', description: 'El telar de cintura conserva la memoria textil de los Altos de Chiapas, entre hilos, bordados y símbolos transmitidos entre generaciones.', image: images.huipil, communities: ['San Juan Chamula', 'Tsotsil'], techniques: ['Telar de cintura', 'Bordado a mano'], pieceIds: ['TK-0203'], position: { lat: 16.7862345, lng: -92.68900029999999 } },
  { id: 'olinala', name: 'Olinalá', state: 'Guerrero', area: 'Montaña de Guerrero', description: 'La laca rayada reúne madera, tierras minerales y motivos florales. Cada trazo conserva la memoria del taller olinalteco.', image: images.olinala, communities: ['Olinalá', 'Nahua'], techniques: ['Laca rayada', 'Laca y Maque'], pieceIds: ['TK-0251'], position: { lat: 17.7774254, lng: -98.7387789 } },
  { id: 'santaclara', name: 'Santa Clara del Cobre', state: 'Michoacán', area: 'Meseta Purépecha, Michoacán', description: 'Antigua tradición purépecha de forja y martillado a fuego vivo. Bloques de cobre fundido son transformados en cazos y joyas sin un solo punto de soldadura.', image: images.cobre, communities: ['Santa Clara del Cobre', 'Purépecha'], techniques: ['Cobre martillado', 'Metalistería'], pieceIds: ['TK-0310'], position: { lat: 19.4064279, lng: -101.6396979 } },
];

export function getRegion(id: string) { return culturalRegions.find(region => region.id === id); }
export function regionWorks(region: CulturalRegion): Piece[] {
  return region.pieceIds.flatMap(id => { const piece = pieces.find(piece => piece.id === id); return piece ? [piece] : []; });
}
export const craftFilters = ['Textil', 'Cerámica', 'Talla en Madera', 'Cestería', 'Laca', 'Filigrana'] as const;
export function filterRegions(query: string, state: string, crafts: string[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const search = normalize(query.trim());
  return culturalRegions.filter(region => (state === 'all' || region.state === state)
    && normalize([region.name, region.state, region.area, ...region.communities, ...region.techniques, ...regionWorks(region).map(piece => piece.title)].join(' ')).includes(search)
    && (crafts.length === 0 || regionWorks(region).some(piece => crafts.includes(piece.technique))));
}