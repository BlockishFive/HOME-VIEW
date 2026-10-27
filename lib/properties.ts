import { defaultRentalTerms, type Maintenance, type RentalTerms, type SaleTerms, type Community } from "./property-terms";
export { formatMXN } from "./property-terms";
export type RoomId = "sala" | "cocina" | "recamara";
export type Hotspot = { target: RoomId; yaw: number; pitch: number };
export type Room = {
  id: RoomId;
  name: string;
  panorama: string;
  x: number;
  y: number;
  hotspots: Hotspot[];
};
type PropertyBase = {
  slug: string;
  title: string;
  location: string;
  price: string;
  area: number;
  beds: number;
  baths: number;
  tag: string;
  description: string;
  cover: string;
  rooms: Room[];
  priceValue: number;
  propertyType: "Casa" | "Departamento" | "Terreno";
  coordinates: { lat: number; lng: number };
  address: string;
  maintenance: Maintenance;
  community: Community;
  plotArea: number | null;
  builtYear: number;
  parking: number;
  features: string[];
  gallery: { src: string; alt: string; label: string }[];
  buildingType: string;
  levels: number;
  ownership: string;
  neighborhood: string;
  reference: string;
};

export type Property = PropertyBase & (
  | { operation: "Venta"; sale: SaleTerms; rental?: never }
  | { operation: "Renta"; rental: RentalTerms; sale?: never }
);

const rooms: Room[] = [
  {
    id: "sala",
    name: "Sala de estar",
    panorama: "/panoramas/sala.jpg",
    x: 30,
    y: 61,
    hotspots: [
      { target: "cocina", yaw: 0.4, pitch: 0.12 },
      { target: "recamara", yaw: -0.4, pitch: 0.12 },
    ],
  },
  {
    id: "cocina",
    name: "Cocina",
    panorama: "/panoramas/cocina.jpg",
    x: 72,
    y: 28,
    hotspots: [{ target: "sala", yaw: -0.35, pitch: 0.12 }],
  },
  {
    id: "recamara",
    name: "Recámara",
    panorama: "/panoramas/recamara.jpg",
    x: 73,
    y: 76,
    hotspots: [{ target: "sala", yaw: 0.35, pitch: 0.12 }],
  },
];
const demoImages = [
  {
    src: "/panoramas/sala-cover.jpg",
    alt: "Ilustración sintética de una sala con sofá verde y ventanales",
    label: "Sala de estar",
  },
  {
    src: "/panoramas/cocina-cover.jpg",
    alt: "Ilustración sintética de una cocina con isla y acabados de madera",
    label: "Cocina",
  },
  {
    src: "/panoramas/recamara-cover.jpg",
    alt: "Ilustración sintética de una recámara con textiles en tonos naturales",
    label: "Recámara",
  },
];
export const properties: Property[] = [
  {
    gallery: demoImages,
    buildingType: "Casa independiente",
    levels: 2,
    ownership: "Propiedad privada (demo)",
    neighborhood: "Distrito Jardín",
    reference: "HV-DEMO-001",
    priceValue: 4850000,
    propertyType: "Casa",
    address: "Paseo de los Olivos 124 · Dirección ficticia",
    sale: { purchasePrice: 4850000, annualTax: 7800 },
    maintenance: { status: "yes", amount: 1200, included: "unknown" },
    community: "unknown",
    plotArea: 210,
    builtYear: 2021,
    parking: 2,
    features: ["Jardín privado", "Cocina abierta", "Área de lavado", "Terraza"],
    operation: "Venta",
    coordinates: { lat: 21.133, lng: -101.697 },
    slug: "casa-oliva",
    title: "Casa Oliva",
    location: "Barrio Jardín (demo) · León, Guanajuato",
    price: "$4,850,000",
    area: 185,
    beds: 3,
    baths: 2,
    tag: "Selección Home View",
    cover: "/panoramas/sala-cover.jpg",
    description:
      "Luz natural, tonos cálidos y espacios que invitan a quedarse. Una casa de concepto abierto con sala, cocina y recámara conectadas en un recorrido pensado para explorar a tu ritmo.",
    rooms,
  },
  {
    gallery: [demoImages[1], demoImages[0], demoImages[2]],
    buildingType: "Loft",
    levels: 1,
    ownership: "Condominio (demo)",
    neighborhood: "Barrio del Sol",
    reference: "HV-DEMO-002",
    priceValue: 2950000,
    propertyType: "Departamento",
    address: "Avenida del Sol 38, interior 4 · Dirección ficticia",
    sale: { purchasePrice: 2950000, annualTax: 4200 },
    maintenance: { status: "yes", amount: 1800, included: "unknown" },
    community: "unknown",
    plotArea: null,
    builtYear: 2023,
    parking: 1,
    features: ["Elevador", "Balcón", "Cocina integral", "Área de trabajo"],
    operation: "Venta",
    coordinates: { lat: 21.115, lng: -101.674 },
    slug: "loft-arena",
    title: "Loft Arena",
    location: "Barrio del Sol (demo) · León, Guanajuato",
    price: "$2,950,000",
    area: 92,
    beds: 1,
    baths: 1,
    tag: "Espacios con carácter",
    cover: "/panoramas/cocina-cover.jpg",
    description:
      "Un refugio urbano de líneas sencillas y materiales cálidos. Explora una distribución ilustrativa que reúne comodidad y diseño en un espacio abierto.",
    rooms,
  },
  {
    gallery: [demoImages[2], demoImages[0], demoImages[1]],
    buildingType: "Casa independiente",
    levels: 2,
    ownership: "Propiedad privada (demo)",
    neighborhood: "Colinas del Norte",
    reference: "HV-DEMO-003",
    priceValue: 6200000,
    propertyType: "Casa",
    address: "Camino de la Brisa 76 · Dirección ficticia",
    sale: { purchasePrice: 6200000, annualTax: 11600 },
    maintenance: { status: "yes", amount: 2400, included: "unknown" },
    community: "unknown",
    plotArea: 320,
    builtYear: 2020,
    parking: 3,
    features: ["Jardín", "Terraza cubierta", "Estudio", "Bodega"],
    operation: "Venta",
    coordinates: { lat: 21.149, lng: -101.676 },
    slug: "residencia-brisa",
    title: "Residencia Brisa",
    location: "Colinas del Norte (demo) · León, Guanajuato",
    price: "$6,200,000",
    area: 240,
    beds: 4,
    baths: 3,
    tag: "Para vivir en calma",
    cover: "/panoramas/recamara-cover.jpg",
    description:
      "Un hogar imaginario para disfrutar de la calma. Sus ambientes amplios y su paleta natural son el escenario de esta experiencia de demostración.",
    rooms,
  },
  {
    slug: "casa-jardin-renta",
    title: "Casa Jardín en renta",
    operation: "Renta",
    propertyType: "Casa",
    priceValue: 18500,
    price: "$18,500",
    area: 150,
    beds: 3,
    baths: 2,
    plotArea: 180,
    tag: "Renta mensual · Demostración",
    address: "Ubicación aproximada de demostración · Sin domicilio real",
    location: "Zona de referencia · León, Guanajuato",
    neighborhood: "Por confirmar · Demo",
    rental: { ...defaultRentalTerms(), monthlyRent: 18500 },
    maintenance: { status: "unknown", amount: null, included: "unknown" },
    community: "unknown",
    builtYear: 2022,
    parking: 2,
    levels: 2,
    buildingType: "Casa independiente",
    ownership: "Por verificar · Demo",
    reference: "HV-DEMO-004",
    description:
      "Casa ficticia en renta mensual en León, Guanajuato. Esta ficha muestra cómo presentar una vivienda con fotografías convencionales. Las imágenes son ilustraciones compartidas de demostración; el domicilio, las condiciones de renta y las fotos de tu inmueble se incorporarán cuando los proporciones. No incluye un recorrido 360.",
    features: ["Sala y comedor", "Cocina", "Patio", "Sin recorrido 360"],
    cover: "/panoramas/sala-cover.jpg",
    gallery: demoImages,
    rooms: [],
    coordinates: { lat: 21.122, lng: -101.686 },
  },
  {
    slug: "terreno-leon-demo",
    title: "Terreno en León",
    operation: "Venta",
    propertyType: "Terreno",
    priceValue: 980000,
    price: "$980,000",
    area: 320,
    beds: 0,
    baths: 0,
    plotArea: 320,
    tag: "Terreno · Demostración",
    address: "Ubicación aproximada de demostración · Sin domicilio real",
    location: "Zona de referencia · León, Guanajuato",
    neighborhood: "Por confirmar · Demo",
    sale: { purchasePrice: 980000, annualTax: 1800 },
    maintenance: { status: "no", amount: null, included: "unknown" },
    community: "unknown",
    builtYear: 0,
    parking: 0,
    levels: 0,
    buildingType: "Sin construcción",
    ownership: "Por verificar · Demo",
    reference: "HV-DEMO-005",
    description:
      "Terreno ficticio de 320 m² en la zona de León. El polígono de la ilustración no es un levantamiento topográfico. Uso de suelo, medidas, servicios y situación jurídica requieren verificación. Los terrenos se presentan con imágenes, descripción y ubicación; no tienen recorrido 360.",
    features: [
      "Superficie ilustrativa",
      "Uso de suelo por verificar",
      "Sin recorrido 360",
    ],
    cover: "/illustrations/terreno.svg",
    gallery: [
      {
        src: "/illustrations/terreno.svg",
        alt: "Esquema original de un terreno ficticio, sin validez topográfica",
        label: "Esquema del terreno",
      },
    ],
    rooms: [],
    coordinates: { lat: 21.096, lng: -101.705 },
  },
];
export function getProperty(slug: string) {
  return properties.find((property) => property.slug === slug);
}

export function filterProperties(
  items: Property[],
  query: string,
  type: string,
  maxPrice: number,
  operation: string = "Todas",
) {
  const normalized = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  return items.filter(
    (p) =>
      normalized(`${p.title} ${p.location}`).includes(
        normalized(query.trim()),
      ) &&
      (type === "Todos" || p.propertyType === type) &&
      p.priceValue <= maxPrice &&
      (operation === "Todas" || p.operation === operation),
  );
}

export function hasTour(property: Property) {
  return property.propertyType !== "Terreno" && property.rooms.length > 0;
}
export function priceUnit(property: Property) {
  return property.operation === "Renta" ? "MXN / mes" : "MXN";
}
