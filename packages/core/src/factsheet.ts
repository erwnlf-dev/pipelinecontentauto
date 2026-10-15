import { z } from "zod";

/** Kutipan dari satu sumber, hasil research call Claude (belum diverifikasi). */
export const SourceQuoteSchema = z.object({
  url: z.string(),
  title: z.string(),
  /** Kalimat verbatim dari halaman sumber yang mendukung/membantah klaim. */
  quote: z.string(),
});
export type SourceQuote = z.infer<typeof SourceQuoteSchema>;

/** Output call ekstraksi (structured) setelah research dengan web search. */
export const ResearchResultSchema = z.object({
  claims: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      supporting: z.array(SourceQuoteSchema),
      refuting: z.array(SourceQuoteSchema),
    }),
  ),
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type ResearchedClaim = ResearchResult["claims"][number];

export type SourceTier = "top" | "standard" | "blocked";

export interface VerifiedSource extends SourceQuote {
  domain: string;
  tier: SourceTier;
  quoteFound: boolean;
  snapshotHash: string | null;
}

export type ClaimStatus = "verified" | "rejected" | "refuted";

export interface ClaimVerdict {
  id: string;
  text: string;
  status: ClaimStatus;
  reasons: string[];
  sources: VerifiedSource[];
}

export interface FactSheet {
  topic: string;
  claims: ClaimVerdict[];
}
