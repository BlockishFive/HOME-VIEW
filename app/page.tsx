import { HomePageView } from "@/components/HomePageView";
import { properties } from "@/lib/properties";
import { publishedProperties } from "@/lib/server/publications";
export const dynamic = "force-dynamic";
export default function Home() { return <HomePageView properties={[...publishedProperties(), ...properties]} />; }
