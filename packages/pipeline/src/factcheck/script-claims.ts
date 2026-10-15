import type { FactSheet, Script } from "@pca/core";

const NUMBER = /\d+(?:[.,]\d+)*/g;

const numbersIn = (text: string) => (text.match(NUMBER) ?? []).map((n) => n.replace(/[.,]/g, ""));

/**
 * Memastikan script tidak menambah klaim di luar FactSheet:
 * - setiap claimId harus menunjuk klaim berstatus verified;
 * - kalimat yang memuat angka wajib punya claimId (angka hampir selalu klaim faktual);
 * - angka di hook, on-screen text dan caption post harus muncul di kalimat yang punya claimId.
 */
export function checkScriptClaims(script: Script, facts: FactSheet): string[] {
  const errors: string[] = [];
  const verified = new Set(facts.claims.filter((c) => c.status === "verified").map((c) => c.id));
  const known = new Set(facts.claims.map((c) => c.id));

  const backedNumbers = new Set<string>();
  script.sentences.forEach((s, i) => {
    for (const id of s.claimIds) {
      if (!known.has(id)) errors.push(`kalimat ${i} merujuk claimId tidak dikenal: ${id}`);
      else if (!verified.has(id)) errors.push(`kalimat ${i} merujuk klaim yang tidak terverifikasi: ${id}`);
    }
    const nums = numbersIn(s.display);
    if (nums.length && s.claimIds.length === 0) {
      errors.push(`kalimat ${i} memuat angka (${nums.join(", ")}) tanpa claimId: "${s.display}"`);
    }
    if (s.claimIds.length) nums.forEach((n) => backedNumbers.add(n));
  });

  const extraTexts: [string, string][] = [
    ["hook", script.hook],
    ["postCaption", script.postCaption],
    ...script.scenes.map((sc): [string, string] => [`onScreenText ${sc.id}`, sc.onScreenText ?? ""]),
  ];
  for (const [label, text] of extraTexts) {
    for (const n of numbersIn(text)) {
      if (!backedNumbers.has(n)) errors.push(`${label} memuat angka ${n} yang tidak didukung kalimat terverifikasi`);
    }
  }
  return errors;
}

export type TopicFlag = "politik" | "sara" | "kesehatan" | "keuangan";

const TOPIC_PATTERNS: Record<TopicFlag, RegExp> = {
  politik: /\b(pemilu|pilpres|pilkada|capres|cawapres|partai|kampanye|presiden terpilih|dpr ri)\b/i,
  sara: /\b(kafir|penistaan|suku terbelakang|ras unggul|aliran sesat)\b/i,
  kesehatan: /\b(menyembuhkan|obat (?:alami|herbal) untuk|mencegah kanker|detoks|dosis)\b/i,
  keuangan: /\b(investasi|saham|kripto|crypto|trading|cuan|pasti untung)\b/i,
};

/**
 * Penyaring topik kasar sebelum ideasi diproses lebih lanjut. Hasilnya bukan
 * keputusan final: topik yang ditandai harus ditolak atau di-review manual.
 */
export function screenTopic(text: string): TopicFlag[] {
  return (Object.keys(TOPIC_PATTERNS) as TopicFlag[]).filter((flag) => TOPIC_PATTERNS[flag].test(text));
}
