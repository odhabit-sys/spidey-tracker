import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** 256-bit capability token, URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this digest is ever stored. Tokens have 256 bits of entropy, so a plain SHA-256 is sufficient. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before touching the database. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer (\S+)$/.exec(header);
  return match && looksLikeToken(match[1]) ? match[1] : null;
}
