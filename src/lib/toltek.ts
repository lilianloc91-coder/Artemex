import alebrije from "@/assets/alebrije-pearl.jpg";
import barroNegro from "@/assets/barro-negro-pearl.jpg";
import huipil from "@/assets/huipil-pearl.jpg";
import olinala from "@/assets/olinala-pearl.jpg";
import cobre from "@/assets/cobre-pearl.jpg";
import talavera from "@/assets/talavera-pearl.jpg";
import hero from "@/assets/hero.jpg";
import tecuani from "@/assets/tecuani-tk0512.jpg";
import rebozoCuetzalan from "@/assets/rebozo-cuetzalan-pearl.jpg";
import huipilCuetzalan from "@/assets/huipil-cuetzalan-pearl.jpg";
import canastaCuetzalan from "@/assets/canasta-cuetzalan-pearl.jpg";
import cuetzalanCourtyard from "@/assets/cuetzalan-workshop-cover.jpg";
import artisanTelar from "@/assets/artesana-telar.jpg";
import type { BankingHashes } from "./artisan-banking";

export const images = {
  alebrije,
  barroNegro,
  huipil,
  olinala,
  cobre,
  talavera,
  hero,
  tecuani,
  rebozoCuetzalan,
  huipilCuetzalan,
  canastaCuetzalan,
  cuetzalanCourtyard,
  artisanTelar,
};

export const USDC_RATE = 17.2; // MXN por USDC (mock)

export type Piece = {
  id: string;
  title: string;
  artisan: string;
  community: string;
  region: "Oaxaca" | "Chiapas" | "Jalisco" | "Michoacán" | "Guerrero" | "Puebla";
  technique: "Textil" | "Cerámica" | "Talla en Madera" | "Filigrana" | "Laca" | "Cestería";
  priceMxn: number;
  image: string;
  gallery?: string[] | undefined;
  unesco?: string;
  /** Campos extendidos para piezas destacadas con pasaporte completo. */
  featured?: boolean;
  badge?: string;
  category?: string;
  location?: string;
  techniqueDetail?: string;
  dimensions?: string;
  priceUsd?: number;
  certFeeMxn?: number;
  shippingMxn?: number;
  status?: "available" | "sold" | "reserved";
  stellarTxHash?: string;
  ledgerStatus?: string;
  story?: string;
  curatorialId?: string;
  regionDetail?: string;
  regionStory?: string;
  artisanBio?: string;
  processAndMaterials?: string;
  artisanPhoto?: string;
};

export const pieces: Piece[] = [
  {
    id: "TK-0701",
    title: "Rebozo de Lana Tradicional",
    artisan: "María Dolores - Telar de Cintura",
    community: "Cuetzalan",
    region: "Puebla",
    technique: "Textil",
    priceMxn: 1850,
    image: rebozoCuetzalan,
    gallery: [rebozoCuetzalan, huipilCuetzalan, cuetzalanCourtyard],
    featured: true,
    badge: "Cuetzalan · Telar de Cintura",
    category: "Textiles / Rebozos y Fajas",
    location: "Cuetzalan del Progreso, Puebla, México",
    techniqueDetail: "Tejido en telar de cintura con lana virgen hilada a mano y teñido con tintes naturales de la Sierra Norte",
    dimensions: "210cm x 75cm (520g)",
    priceUsd: 108,
    certFeeMxn: 92,
    shippingMxn: 0,
    status: "available",
    stellarTxHash: "4a28f72c01998b795f328f99e9ba60d863202d06aa1166016d0cd573eadd49e1",
    ledgerStatus: "Verified on Soroban Testnet",
    story: "El rebozo tradicional de lana es prenda de abrigo y símbolo de identidad en la Sierra Norte de Puebla. Elaborado pacientemente durante cuatro semanas en telar de cintura por la maestra María Dolores, entrelaza saberes ancestrales transmitidos de generación en generación.",
    curatorialId: "CUET-MD-012026",
    regionDetail: "Cuetzalan, Sierra Norte de Puebla",
    regionStory: "El entorno montañoso se enamora de la bruma de la Sierra Norte, cobijando la tradición y preservando la técnica del telar de cintura Nahua de la Sierra Norte de Puebla.",
    artisanBio: "María Dolores preserva la herencia familiar y legado generacional en el telar de cintura, transmitido de madres a hijas a lo largo de cuatro generaciones.",
    processAndMaterials: "Preciada lana virgen natural, teñida con tintes naturales de plantas locales. Tiempo de 3 a 4 semanas de elaboración con la técnica ancestral del telar de cintura.",
    artisanPhoto: artisanTelar,
  },
  {
    id: "TK-0702",
    title: "Huipil Ceremonial Bordado",
    artisan: "Colectivo Masehual - Textil",
    community: "Cuetzalan",
    region: "Puebla",
    technique: "Textil",
    priceMxn: 3200,
    image: huipilCuetzalan,
    gallery: [huipilCuetzalan, rebozoCuetzalan, cuetzalanCourtyard],
    featured: true,
    badge: "Cuetzalan · Bordado Masehual",
    category: "Textil Ceremonial / Huipiles",
    location: "Cuetzalan del Progreso, Puebla, México",
    techniqueDetail: "Lienzo de algodón puro tejido en telar de cintura con bordado en punto de cruz hilvanado con motivos de flores y fauna sagrada",
    dimensions: "105cm x 68cm (380g)",
    priceUsd: 186,
    certFeeMxn: 160,
    shippingMxn: 0,
    status: "available",
    stellarTxHash: "5b39e83d12998b795f328f99e9ba60d863202d06aa1166016d0cd573eadd50f2",
    ledgerStatus: "Verified on Soroban Testnet",
    story: "Vestimenta tradicional de las festividades patronales de San Francisco de Asís. El bordado en el pecho representa la unión del cielo, la tierra y las flores de café de la montaña, custodiado por el Colectivo Masehual para sostener a familias tejedoras.",
    curatorialId: "CUET-MH-022026",
    regionDetail: "Cuetzalan, Sierra Norte de Puebla",
    regionStory: "Comunidad de origen Nahua que habita entre la niebla y el verdor de la Sierra Norte, preservando saberes ancestrales que dan forma a su identidad.",
    artisanBio: "El Colectivo Masehual preserva el bordado ceremonial y la iconografía sagrada de las fiestas patronales de la montaña.",
    processAndMaterials: "Lienzo de algodón puro hilado en telar de cintura con bordado en punto de cruz hilvanado con tintes autóctonos. 6 semanas de labor.",
    artisanPhoto: cuetzalanCourtyard,
  },
  {
    id: "TK-0703",
    title: "Canasta de Fibra de Jonote",
    artisan: "Pedro Juárez - Cestería",
    community: "Cuetzalan",
    region: "Puebla",
    technique: "Cestería",
    priceMxn: 850,
    image: canastaCuetzalan,
    gallery: [canastaCuetzalan, cuetzalanCourtyard, rebozoCuetzalan],
    featured: true,
    badge: "Cuetzalan · Cestería Ancestral",
    category: "Cestería y Fibras Vegetales",
    location: "Cuetzalan del Progreso, Puebla, México",
    techniqueDetail: "Tejido en espiral con corteza interna del árbol de jonote (Heliocarpus appendiculatus) recolectada en luna menguante",
    dimensions: "32cm diámetro x 22cm alto (410g)",
    priceUsd: 49,
    certFeeMxn: 42,
    shippingMxn: 0,
    status: "available",
    stellarTxHash: "6c4af94e23998b795f328f99e9ba60d863202d06aa1166016d0cd573eadd61a3",
    ledgerStatus: "Verified on Soroban Testnet",
    story: "La fibra de jonote es recolectada en las barrancas húmedas de Cuetzalan. Don Pedro Juárez trabaja la fibra con las manos húmedas logrando una resistencia que dura generaciones sin deformarse.",
    curatorialId: "CUET-PJ-032026",
    regionDetail: "Cuetzalan, Sierra Norte de Puebla",
    regionStory: "Entre barrancas húmedas y selva alta, la tradición de cestería nahua aprovecha los recursos forestales con respeto a la tierra.",
    artisanBio: "Don Pedro Juárez es maestro cestero de tercera generación; elabora canastos utilitarios y piezas ceremoniales de corteza de jonote.",
    processAndMaterials: "Corteza interna de jonote recolectada en luna menguante, tejida a mano con humedad constante. 2 semanas de trabajo.",
    artisanPhoto: cuetzalanCourtyard,
  },
  {
    id: "TK-0512",
    title: "El Guardián del Monte: Tecuani de Acatlán",
    artisan: "Angel Cordero Sosa",
    community: "Acatlán de Osorio",
    region: "Puebla",
    technique: "Talla en Madera",
    priceMxn: 450,
    image: tecuani,
    gallery: [tecuani, alebrije, barroNegro],
    featured: true,
    badge: "Puebla · Mixteca",
    category: "Figuras de Danza / Madera & Textil",
    location: "Acatlán de Osorio, Puebla, México",
    techniqueDetail: "Tallado en madera de copal/pino, confección textil pintada a mano y ensamble de ixtle natural",
    dimensions: "18cm x 10cm x 8cm (180g)",
    priceUsd: Math.round(450 / USDC_RATE),
    certFeeMxn: 0,
    shippingMxn: 0,
    status: "available",
    stellarTxHash: "725e126cc7998b795f328f99e9ba60d863202d06aa1166016d0cd573eadd48cf",
    ledgerStatus: "Verified on Soroban Testnet",
    story: "En las entrañas de la Mixteca, el sonido del teponaztli y la flauta de carrizo anuncian la llegada del Tecuani. Esta pieza rinde homenaje a la danza ancestral de petición de lluvias y protección de las cosechas. Modelado y ensamblado a mano por el artesano Angel Cordero Sosa, viste el tradicional mazo amarillo salpicado con las rosetas del felino sagrado y una máscara decorada con cerdas naturales e hilos de ixtle trenzado.",
    curatorialId: "ACAT-MN-0512",
    regionDetail: "Acatlán de Osorio, Mixteca Poblana",
    regionStory: "Cuna de la danza del Tecuani y el barro bruñido rojo en la mixteca alta, donde el jaguar sagrado protege los campos de cultivo.",
    artisanBio: "Angel Cordero Sosa es el artesano autor de esta pieza de Tecuani de Acatlán de Osorio, vinculada a la danza de petición de lluvias y protección de las cosechas.",
    processAndMaterials: "Madera de copal tallada a mano con machete y cuchillo, pigmentos minerales, ensamble de ixtle y rosetas felinas pintadas a pincel fino.",
    artisanPhoto: tecuani,
  },
  {
    id: "TK-0388",
    title: "Plato de Talavera Poblana",
    artisan: "Uriarte Talavera",
    community: "Puebla de Zaragoza",
    region: "Puebla",
    technique: "Cerámica",
    priceMxn: 2650,
    image: talavera,
    gallery: [talavera, barroNegro, tecuani],
    unesco: "Patrimonio Cultural Inmaterial (UNESCO) · Puebla",
  },
  {
    id: "TK-0042",
    title: "Alebrije Jaguar Nahual",
    artisan: "Jacobo y María Ángeles",
    community: "San Martín Tilcajete",
    region: "Oaxaca",
    technique: "Talla en Madera",
    priceMxn: 8900,
    image: alebrije,
    gallery: [alebrije, hero, olinala],
  },
  {
    id: "TK-0117",
    title: "Cántaro Calado de Barro Negro",
    artisan: "Familia Doña Rosa",
    community: "San Bartolo Coyotepec",
    region: "Oaxaca",
    technique: "Cerámica",
    priceMxn: 3450,
    image: barroNegro,
    gallery: [barroNegro, talavera, alebrije],
  },
  {
    id: "TK-0203",
    title: "Huipil de Telar de Cintura",
    artisan: "Cooperativa Sna Jolobil",
    community: "San Juan Chamula",
    region: "Chiapas",
    technique: "Textil",
    priceMxn: 6200,
    image: huipil,
    gallery: [huipil, olinala, hero],
  },
  {
    id: "TK-0251",
    title: "Baúl de Laca Rayada",
    artisan: "Maestro Francisco Coronel",
    community: "Olinalá",
    region: "Guerrero",
    technique: "Laca",
    priceMxn: 5800,
    image: olinala,
    gallery: [olinala, cobre, tecuani],
  },
  {
    id: "TK-0310",
    title: "Cazo Martillado y Arracadas",
    artisan: "Taller Punzo Hermanos",
    community: "Santa Clara del Cobre",
    region: "Michoacán",
    technique: "Filigrana",
    priceMxn: 4100,
    image: cobre,
    gallery: [cobre, talavera, barroNegro],
  },
];

export const toUsdc = (mxn: number) => (mxn / USDC_RATE).toFixed(2);
export const fmtMxn = (n: number) => "$" + n.toLocaleString("es-MX") + " MXN";

export type Artisan = {
  bankingHashes?: BankingHashes | undefined;
  name: string;
  technique: string;
  location: string;
  status: "Activa" | "Pendiente KYC" | "Verificada";
  pieces: number;
  usdc: number;
  initials: string;
  photo?: string | undefined;
  bio?: string | undefined;
};

export const artisans: Artisan[] = [
  {
    name: "Miriam Nava",
    technique: "Talla en madera & textil",
    location: "Acatlán de Osorio, Pue.",
    status: "Verificada",
    pieces: 1,
    usdc: 1,
    initials: "MN",
    bio: "Maestra artesana de la Mixteca Baja dedicada a la preservación del Tecuani tradicional, esculpiendo máscaras de copal e indumentaria festiva con tintes e ixtle.",
  },
  {
    name: "Alain Bonilla",
    technique: "Promotor Comunitario",
    location: "Acatlán de Osorio, Pue.",
    status: "Verificada",
    pieces: 0,
    usdc: 0,
    initials: "AB",
    bio: "Promotor cultural comunitario y certificador de origen. Enlace de cooperativas mixtecas y oaxaqueñas para la soberanía económica de los talleres.",
  },
  {
    name: "Don Miguel Aguilar",
    technique: "Talla en copal",
    location: "San Antonio Arrazola, Oax.",
    status: "Verificada",
    pieces: 18,
    usdc: 920,
    initials: "MA",
    bio: "Tercera generación de talladores zapotecas en Arrazola, reconocido por sus nahuales y figuras míticas pintadas con pigmentos vegetales.",
  },
  {
    name: "Doña Rosa Real",
    technique: "Barro negro bruñido",
    location: "San Bartolo Coyotepec, Oax.",
    status: "Verificada",
    pieces: 26,
    usdc: 1140,
    initials: "RR",
    bio: "Heredera del bruñido con cuarzo en barro negro de Coyotepec, horneado en pozo de reducción de oxígeno según la tradición prehispánica.",
  },
  {
    name: "Petrona Gómez",
    technique: "Telar de cintura",
    location: "Zinacantán, Chis.",
    status: "Activa",
    pieces: 12,
    usdc: 610,
    initials: "PG",
    bio: "Tejedora tsotsil de Zinacantán, experta en cosmogramas mayas en telar de cintura con hilos teñidos con cortezas y flores endémicas.",
  },
  {
    name: "Francisco Coronel",
    technique: "Laca rayada",
    location: "Olinalá, Gro.",
    status: "Verificada",
    pieces: 9,
    usdc: 780,
    initials: "FC",
    bio: "Premio Nacional de Ciencias y Artes, maestro del vaciado en madera de lináloe y técnica de rayado doble con espina de maguey.",
  },
  {
    name: "Juana Morales",
    technique: "Alfarería de alta temperatura",
    location: "Tzintzuntzan, Mich.",
    status: "Pendiente KYC",
    pieces: 4,
    usdc: 0,
    initials: "JM",
    bio: "Artesana purépecha de la ribera de Pátzcuaro, especialista en vasijas bruñidas y loza tradicional con engobes minerales de la región.",
  },
  {
    name: "Abelardo Punzo",
    technique: "Cobre martillado",
    location: "Santa Clara del Cobre, Mich.",
    status: "Activa",
    pieces: 15,
    usdc: 540,
    initials: "AP",
    bio: "Maestro forjador de Santa Clara del Cobre, moldeando piezas ornamentales y utilitarias a golpe de marro y fuego de leña de encino.",
  },
];

export type Pattern = {
  id: string;
  name: string;
  community: string;
  description: string;
  image: string;
  royalty: number;
};

export const patterns: Pattern[] = [
  { id: "PCT-01", name: "Rombo del Universo Maya", community: "Tsotsiles de Zinacantán, Chis.", description: "Cosmograma tejido que representa los cuatro rumbos y el centro del mundo.", image: huipil, royalty: 12 },
  { id: "PCT-02", name: "Greca Escalonada Mitla", community: "Zapotecos de Mitla, Oax.", description: "Xicalcoliuhqui: el movimiento del agua y la serpiente, tallado en piedra hace siglos.", image: barroNegro, royalty: 10 },
  { id: "PCT-03", name: "Flor de Rayado Olinalteco", community: "Nahuas de Olinalá, Gro.", description: "Motivo floral esgrafiado sobre laca de linaza y tierras minerales.", image: olinala, royalty: 12 },
  { id: "PCT-04", name: "Rosetón de Talavera", community: "Gremio Alfarero de Puebla", description: "Simetría radial en azul cobalto con Denominación de Origen.", image: talavera, royalty: 8 },
];

export const sampleHash = "c0ffee112233445566778899aabbccddeeff00112233445566778899aabbccdd";
export const contractId = "CAOAFGPATXWJ6KKGXFYHY42Q4N75NOWSR3NH3K2DT7QR3YSMDGT5P2HO";

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortHash(h: string, n = 8) {
  return h.length > n * 2 ? `${h.slice(0, n)}…${h.slice(-n)}` : h;
}

export const getPiece = (id?: string) => (id ? pieces.find((p) => p.id === id.toUpperCase()) : undefined);
