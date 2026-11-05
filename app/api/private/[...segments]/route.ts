import { privateHandler } from "@/lib/server/private-http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = privateHandler;
export const POST = privateHandler;
export const PUT = privateHandler;
export const DELETE = privateHandler;
