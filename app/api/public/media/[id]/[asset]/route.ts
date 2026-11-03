import { publishedAsset } from "@/lib/server/publications";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; asset: string }> }) {
  const {id, asset} = await params;
  const bytes = publishedAsset(id, asset);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" };
  return bytes ? new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/jpeg" } }) : new Response(null, {status:404, headers});
}
