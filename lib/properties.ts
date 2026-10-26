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
export type Property = {
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
  propertyType: "Casa" | "Departamento";
  address: string;
  annualTax: number;
  monthlyMaintenance: number;
  plotArea: number | null;
  builtYear: number;
  parking: number;
  features: string[];
  mapPosition: { x: number; y: number };
  gallery: { src: string; alt: string; label: string }[];
  buildingType: string;
  levels: number;
  ownership: string;
  neighborhood: string;
  reference: string;
};

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
    annualTax: 7800,
    monthlyMaintenance: 1200,
    plotArea: 210,
    builtYear: 2021,
    parking: 2,
    features: ["Jardín privado", "Cocina abierta", "Área de lavado", "Terraza"],
    mapPosition: { x: 370, y: 295 },
    slug: "casa-oliva",
    title: "Casa Oliva",
    location: "Distrito Jardín · Ciudad demo",
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
    annualTax: 4200,
    monthlyMaintenance: 1800,
    plotArea: null,
    builtYear: 2023,
    parking: 1,
    features: ["Elevador", "Balcón", "Cocina integral", "Área de trabajo"],
    mapPosition: { x: 625, y: 390 },
    slug: "loft-arena",
    title: "Loft Arena",
    location: "Barrio del Sol · Ciudad demo",
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
    annualTax: 11600,
    monthlyMaintenance: 2400,
    plotArea: 320,
    builtYear: 2020,
    parking: 3,
    features: ["Jardín", "Terraza cubierta", "Estudio", "Bodega"],
    mapPosition: { x: 550, y: 165 },
    slug: "residencia-brisa",
    title: "Residencia Brisa",
    location: "Colinas del Norte · Ciudad demo",
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
];
export function getProperty(slug: string) {
  return properties.find((property) => property.slug === slug);
}

export function formatMXN(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}
export function filterProperties(
  items: Property[],
  query: string,
  type: string,
  maxPrice: number,
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
      p.priceValue <= maxPrice,
  );
}
