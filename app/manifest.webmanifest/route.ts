import manifest from "@/lib/pwa-manifest";
export const dynamic = "force-static";
export function GET() {
  return Response.json(manifest(), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
