import { notFound } from "next/navigation";
import { getProperty, properties } from "@/lib/properties";
import { PropertyPageView } from "@/components/PropertyPageView";
export function generateStaticParams() {
  return properties.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: getProperty(slug)?.title ?? "Propiedad no encontrada" };
}
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getProperty(slug);
  if (!property) notFound();
  return <PropertyPageView property={property} />;
}
