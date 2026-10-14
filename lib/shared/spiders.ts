// Spider identities. Keep SPIDER_IDS in sync with the CHECK constraints in
// supabase/migrations/003_spider_identity.sql.

export const SPIDER_IDS = ["classic", "miles", "gwen", "2099", "symbiote", "scarlet", "stealth", "solar"] as const;
export type SpiderId = (typeof SPIDER_IDS)[number];

export const DEFAULT_SPIDER: SpiderId = "classic";

export const SPIDER_LABELS: Record<SpiderId, string> = {
  classic: "CLASSIC",
  miles: "MILES",
  gwen: "GWEN",
  "2099": "2099",
  symbiote: "SYMBIOTE",
  scarlet: "SCARLET",
  stealth: "STEALTH",
  solar: "SOLAR",
};

export function isSpiderId(value: unknown): value is SpiderId {
  return typeof value === "string" && (SPIDER_IDS as readonly string[]).includes(value);
}

/** First identity that isn't `taken` (used when a joiner didn't pick one). */
export function firstFreeSpider(taken: SpiderId | null): SpiderId {
  return SPIDER_IDS.find((s) => s !== taken) ?? DEFAULT_SPIDER;
}
