import "server-only";
import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/shared/types";

const STATUS: Record<ApiErrorCode, number> = {
  invalid: 400,
  not_found: 404,
  invite_used: 409,
  spider_taken: 409,
  not_active: 409,
  expired: 410,
  rate_limited: 429,
  server: 500,
};

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

/** Safe, generic error: a code the client maps to a pixel message. Never leaks internals. */
export function fail(code: ApiErrorCode) {
  return NextResponse.json({ error: code }, { status: STATUS[code], headers: NO_STORE });
}

/** Log the real cause server-side, return a generic 500. */
export function serverError(where: string, err: unknown) {
  console.error(`[spidey] ${where}:`, err instanceof Error ? err.message : err);
  return fail("server");
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > 2048) return null;
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
