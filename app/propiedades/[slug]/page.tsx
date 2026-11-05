import { notFound } from "next/navigation";
import { getProperty, properties } from "@/lib/properties";
import { PropertyPageView } from "@/components/PropertyPageView";
import { publishedProperties } from "@/lib/server/publications";
export const dynamic = "force-dynamic";
function resolve(slug: string) { return getProperty(slug) ?? publishedProperties().find(p => p.slug === slug); }
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: resolve(slug)?.title ?? "Propiedad no encontrada" };
}
export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = resolve(slug);
  if (!property) notFound();
  return <PropertyPageView property={property} />;
}
