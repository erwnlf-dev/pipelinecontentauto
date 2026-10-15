import { createHash } from "node:crypto";
import type { ClaimVerdict, ResearchedClaim, SourceQuote, SourceTier, VerifiedSource } from "@pca/core";

/** Suffix dua level yang umum; cukup untuk sumber Indonesia & internasional. */
const MULTI_PART_SUFFIXES = new Set([
  "co.id", "ac.id", "go.id", "or.id", "sch.id", "web.id", "my.id", "biz.id", "mil.id", "net.id", "ponpes.id", "desa.id",
  "co.uk", "ac.uk", "gov.uk", "org.uk", "com.au", "edu.au", "gov.au", "org.au", "co.jp", "ac.jp", "go.jp",
  "com.sg", "edu.sg", "gov.sg", "com.my", "edu.my", "gov.my", "co.nz", "ac.nz", "com.br", "co.in", "ac.in", "gov.in",
]);

const TOP_SUFFIXES = ["go.id", "ac.id", "mil.id", "gov", "edu", "gov.uk", "ac.uk", "gov.au", "edu.au", "int"];

/** Lembaga ilmiah, ensiklopedia, museum, dan penerbit jurnal. */
const TOP_DOMAINS = new Set([
  "britannica.com", "nature.com", "science.org", "sciencedirect.com", "springer.com", "wiley.com", "jstor.org",
  "nih.gov", "who.int", "un.org", "unesco.org", "nasa.gov", "noaa.gov", "si.edu", "smithsonianmag.com",
  "nationalgeographic.com", "britishmuseum.org", "metmuseum.org", "rijksmuseum.nl", "cambridge.org", "oup.com",
  "royalsocietypublishing.org", "pnas.org", "plos.org", "arxiv.org", "doi.org", "esa.int", "cern.ch",
]);

/** Konten buatan pengguna / tanya-jawab / media sosial: tidak dihitung sebagai sumber. */
const BLOCKED_DOMAINS = new Set([
  "quora.com", "brainly.co.id", "brainly.com", "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
  "x.com", "twitter.com", "youtube.com", "pinterest.com", "blogspot.com", "wordpress.com", "kaskus.co.id",
  "kompasiana.com", "medium.com", "threads.net", "linkedin.com", "scribd.com", "answers.com",
]);

export function registrableDomain(url: string): string {
  const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join(".");
  return MULTI_PART_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

export function sourceTier(url: string): SourceTier {
  const host = new URL(url).hostname.toLowerCase();
  const domain = registrableDomain(url);
  if (BLOCKED_DOMAINS.has(domain)) return "blocked";
  if (TOP_DOMAINS.has(domain)) return "top";
  if (TOP_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return "top";
  return "standard";
}

/** Normalisasi longgar untuk mencocokkan kutipan: huruf kecil, kutip/spasi seragam, tanpa tanda baca. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’“”'"`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Kutipan dianggap ada bila (setelah normalisasi) muncul di teks halaman.
 * Bagian yang dipisah elipsis ("...") harus muncul berurutan.
 */
export function quoteFoundIn(quote: string, pageText: string): boolean {
  const page = normalizeForMatch(pageText);
  const parts = quote
    .split(/\.{3}|…/)
    .map(normalizeForMatch)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return false;
  let from = 0;
  for (const part of parts) {
    if (part.split(" ").length < 4) return false; // kutipan terlalu pendek untuk jadi bukti
    const idx = page.indexOf(part, from);
    if (idx < 0) return false;
    from = idx + part.length;
  }
  return true;
}

export interface FactCheckRules {
  minDistinctDomains: number;
  requireTopTier: boolean;
}

export const DEFAULT_FACTCHECK_RULES: FactCheckRules = {
  minDistinctDomains: 2,
  requireTopTier: true,
};

/** Teks halaman per URL (hasil fetch); `null` bila halaman gagal diambil. */
export type PageTexts = ReadonlyMap<string, string | null>;

function verifySource(source: SourceQuote, pages: PageTexts): VerifiedSource {
  let domain = "";
  let tier: SourceTier = "blocked";
  try {
    domain = registrableDomain(source.url);
    tier = sourceTier(source.url);
  } catch {
    // URL tidak valid diperlakukan sebagai blocked.
  }
  const page = pages.get(source.url) ?? null;
  return {
    ...source,
    domain,
    tier,
    quoteFound: page !== null && quoteFoundIn(source.quote, page),
    snapshotHash: page === null ? null : createHash("sha256").update(page).digest("hex"),
  };
}

/** Verdict deterministik untuk satu klaim berdasarkan sumber yang sudah di-fetch. */
export function evaluateClaim(
  claim: ResearchedClaim,
  pages: PageTexts,
  rules: FactCheckRules = DEFAULT_FACTCHECK_RULES,
): ClaimVerdict {
  const supporting = claim.supporting.map((s) => verifySource(s, pages));
  const refuting = claim.refuting.map((s) => verifySource(s, pages));
  const reasons: string[] = [];

  const credibleRefutation = refuting.find((s) => s.tier !== "blocked" && s.quoteFound);
  if (credibleRefutation) {
    return {
      id: claim.id,
      text: claim.text,
      status: "refuted",
      reasons: [`dibantah oleh ${credibleRefutation.domain}: "${credibleRefutation.quote}"`],
      sources: [...supporting, ...refuting],
    };
  }

  const valid = supporting.filter((s) => s.tier !== "blocked" && s.quoteFound);
  const domains = new Set(valid.map((s) => s.domain));
  if (domains.size < rules.minDistinctDomains) {
    reasons.push(`hanya ${domains.size} domain dengan kutipan terverifikasi (butuh ${rules.minDistinctDomains})`);
  }
  if (rules.requireTopTier && !valid.some((s) => s.tier === "top")) {
    reasons.push("tidak ada sumber tier atas (lembaga resmi/akademik/ensiklopedia/museum)");
  }
  for (const s of supporting) {
    if (s.tier === "blocked") reasons.push(`sumber diabaikan (blocked): ${s.domain || s.url}`);
    else if (!s.quoteFound) reasons.push(`kutipan tidak ditemukan di ${s.url}`);
  }

  const verified = domains.size >= rules.minDistinctDomains && (!rules.requireTopTier || valid.some((s) => s.tier === "top"));
  return {
    id: claim.id,
    text: claim.text,
    status: verified ? "verified" : "rejected",
    reasons: verified ? [] : reasons,
    sources: [...supporting, ...refuting],
  };
}
