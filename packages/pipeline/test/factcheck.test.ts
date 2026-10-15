import type { FactSheet, ResearchedClaim, Script } from "@pca/core";
import { describe, expect, it } from "vitest";
import {
  DEMO_FACTSHEET,
  DEMO_SCRIPT,
  checkScriptClaims,
  evaluateClaim,
  quoteFoundIn,
  registrableDomain,
  screenTopic,
  sourceTier,
} from "../src";

describe("sumber", () => {
  it("menghitung registrable domain termasuk suffix .co.id/.go.id", () => {
    expect(registrableDomain("https://www.kompas.co.id/read/1")).toBe("kompas.co.id");
    expect(registrableDomain("https://kbbi.kemdikbud.go.id/entri/x")).toBe("kemdikbud.go.id");
    expect(registrableDomain("https://en.wikipedia.org/wiki/Flamingo")).toBe("wikipedia.org");
  });

  it("memberi tier sesuai jenis sumber", () => {
    expect(sourceTier("https://www.brin.go.id/x")).toBe("top");
    expect(sourceTier("https://ugm.ac.id/x")).toBe("top");
    expect(sourceTier("https://www.britannica.com/animal/flamingo")).toBe("top");
    expect(sourceTier("https://en.wikipedia.org/wiki/Flamingo")).toBe("standard");
    expect(sourceTier("https://brainly.co.id/tugas/1")).toBe("blocked");
    expect(sourceTier("https://www.quora.com/q")).toBe("blocked");
  });

  it("mencocokkan kutipan dengan normalisasi tanda baca dan elipsis", () => {
    const page = "Flamingos are born with grey or white plumage. Their pink color comes from carotenoid pigments in their diet.";
    expect(quoteFoundIn("“Flamingos are born with grey or white plumage”", page)).toBe(true);
    expect(quoteFoundIn("born with grey or white plumage ... carotenoid pigments in their diet", page)).toBe(true);
    expect(quoteFoundIn("Flamingos are born pink and stay pink", page)).toBe(false);
    expect(quoteFoundIn("grey", page)).toBe(false); // terlalu pendek untuk jadi bukti
  });
});

describe("evaluateClaim", () => {
  const claim: ResearchedClaim = {
    id: "c1",
    text: "Flamingo lahir berwarna abu-abu",
    supporting: [
      { url: "https://www.britannica.com/animal/flamingo", title: "Flamingo", quote: "chicks are born with grey plumage" },
      { url: "https://en.wikipedia.org/wiki/Flamingo", title: "Flamingo", quote: "young flamingos hatch with greyish plumage" },
    ],
    refuting: [],
  };
  const pages = new Map<string, string | null>([
    ["https://www.britannica.com/animal/flamingo", "Flamingo chicks are born with grey plumage and turn pink."],
    ["https://en.wikipedia.org/wiki/Flamingo", "Young flamingos hatch with greyish plumage, but adults range from light pink to bright red."],
  ]);

  it("verified bila ≥2 domain dengan kutipan ditemukan dan ada sumber tier atas", () => {
    const v = evaluateClaim(claim, pages);
    expect(v.status).toBe("verified");
    expect(v.sources.every((s) => s.quoteFound && s.snapshotHash)).toBe(true);
  });

  it("rejected bila kutipan tidak ada di halaman", () => {
    const v = evaluateClaim(claim, new Map([...pages, ["https://en.wikipedia.org/wiki/Flamingo", "Something else entirely."]]));
    expect(v.status).toBe("rejected");
    expect(v.reasons.join(" ")).toMatch(/kutipan tidak ditemukan/);
  });

  it("rejected bila tidak ada sumber tier atas", () => {
    const noTop = { ...claim, supporting: [claim.supporting[1]!, { url: "https://www.kompas.com/a", title: "a", quote: "young flamingos hatch with greyish plumage" }] };
    const v = evaluateClaim(noTop, new Map([...pages, ["https://www.kompas.com/a", "Young flamingos hatch with greyish plumage."]]));
    expect(v.status).toBe("rejected");
    expect(v.reasons.join(" ")).toMatch(/tier atas/);
  });

  it("refuted bila ada bantahan kredibel", () => {
    const refuted = { ...claim, refuting: [{ url: "https://cekfakta.com/x", title: "x", quote: "klaim ini adalah mitos yang keliru" }] };
    const v = evaluateClaim(refuted, new Map([...pages, ["https://cekfakta.com/x", "Ternyata klaim ini adalah mitos yang keliru."]]));
    expect(v.status).toBe("refuted");
  });
});

describe("checkScriptClaims", () => {
  it("script demo lolos terhadap factsheet demo", () => {
    expect(checkScriptClaims(DEMO_SCRIPT, DEMO_FACTSHEET)).toEqual([]);
  });

  it("menandai angka tanpa claimId dan klaim yang tidak terverifikasi", () => {
    const facts: FactSheet = {
      ...DEMO_FACTSHEET,
      claims: DEMO_FACTSHEET.claims.map((c) => (c.id === "c2" ? { ...c, status: "rejected" as const } : c)),
    };
    const script: Script = {
      ...DEMO_SCRIPT,
      sentences: [...DEMO_SCRIPT.sentences, { display: "Ada 6 spesies flamingo.", spoken: "Ada enam spesies flamingo.", claimIds: [] }],
      postCaption: "Flamingo bisa hidup 50 tahun!",
    };
    const errors = checkScriptClaims(script, facts);
    expect(errors.some((e) => e.includes("tidak terverifikasi: c2"))).toBe(true);
    expect(errors.some((e) => e.includes("memuat angka (6) tanpa claimId"))).toBe(true);
    expect(errors.some((e) => e.includes("postCaption memuat angka 50"))).toBe(true);
  });
});

describe("screenTopic", () => {
  it("menandai topik sensitif", () => {
    expect(screenTopic("Fakta unik pemilu pertama Indonesia")).toEqual(["politik"]);
    expect(screenTopic("Investasi saham paling cuan")).toEqual(["keuangan"]);
    expect(screenTopic("Kenapa flamingo berwarna pink")).toEqual([]);
  });
});
