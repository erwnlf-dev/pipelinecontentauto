import type { FactSheet, Script } from "@pca/core";

/**
 * Script contoh untuk dry-run (provider stub) dan test. FactSheet di bawah
 * hanya data demo: klaimnya ditandai verified tanpa sumber, bukan hasil
 * fact-check sungguhan.
 */
export const DEMO_SCRIPT: Script = {
  title: "Kenapa flamingo berwarna pink?",
  hook: "Flamingo lahir TIDAK pink",
  sentences: [
    { display: "Tahukah kamu, flamingo sebenarnya lahir berwarna abu-abu?", spoken: "Tahukah kamu, flamingo sebenarnya lahir berwarna abu-abu?", claimIds: ["c1"] },
    { display: "Warna pink-nya datang dari makanan: udang kecil dan alga.", spoken: "Warna pink-nya datang dari makanan: udang kecil dan alga.", claimIds: ["c2"] },
    { display: "Keduanya mengandung pigmen karotenoid, zat yang sama yang membuat wortel berwarna oranye.", spoken: "Keduanya mengandung pigmen karotenoid, zat yang sama yang membuat wortel berwarna oranye.", claimIds: ["c3"] },
    { display: "Anak flamingo butuh sampai 3 tahun untuk jadi pink sepenuhnya.", spoken: "Anak flamingo butuh sampai tiga tahun untuk jadi pink sepenuhnya.", claimIds: ["c4"] },
    { display: "Kalau kurang karotenoid, bulunya perlahan memudar jadi pucat.", spoken: "Kalau kurang karotenoid, bulunya perlahan memudar jadi pucat.", claimIds: ["c5"] },
    { display: "Itu sebabnya kebun binatang sengaja menambahkan pigmen ini ke pakan flamingo mereka.", spoken: "Itu sebabnya kebun binatang sengaja menambahkan pigmen ini ke pakan flamingo mereka.", claimIds: ["c6"] },
    { display: "Ternyata, warna cantik itu benar-benar hasil dari apa yang mereka makan.", spoken: "Ternyata, warna cantik itu benar-benar hasil dari apa yang mereka makan.", claimIds: ["c2"] },
    { display: "Baru tahu fakta ini? Follow untuk hidden knowledge berikutnya!", spoken: "Baru tahu fakta ini? Follow untuk hidden knowledge berikutnya!", claimIds: [] },
  ],
  scenes: [
    { id: "s1", fromSentence: 0, toSentence: 1, visualPrompt: "Fluffy grey flamingo chick standing next to a bright pink adult flamingo in a shallow lagoon, golden hour, photorealistic, vertical", assetType: "image", onScreenText: null },
    { id: "s2", fromSentence: 2, toSentence: 3, visualPrompt: "Macro shot of tiny red brine shrimp and green algae in salty water, vivid colors, photorealistic, vertical", assetType: "image", onScreenText: "Pigmen karotenoid" },
    { id: "s3", fromSentence: 4, toSentence: 5, visualPrompt: "Pale washed-out flamingo beside a vivid pink flamingo at a zoo pond, keeper scattering feed, photorealistic, vertical", assetType: "image", onScreenText: null },
    { id: "s4", fromSentence: 6, toSentence: 7, visualPrompt: "Flock of pink flamingos taking off over a lake at sunrise, cinematic wide shot, vertical", assetType: "image", onScreenText: null },
  ],
  postCaption: "Flamingo ternyata tidak lahir berwarna pink 🦩 Warnanya datang dari makanan!",
  hashtags: ["#faktaunik", "#hiddenknowledge", "#flamingo", "#tahukahkamu"],
};

export const DEMO_FACTSHEET: FactSheet = {
  topic: DEMO_SCRIPT.title,
  claims: ["c1", "c2", "c3", "c4", "c5", "c6"].map((id) => ({
    id,
    text: `klaim demo ${id}`,
    status: "verified" as const,
    reasons: ["data demo, bukan hasil fact-check"],
    sources: [],
  })),
};
