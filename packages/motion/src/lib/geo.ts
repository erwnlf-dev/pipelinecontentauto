/** Garis pantai yang disederhanakan (lon, lat) — cukup untuk siluet motion graphic, bukan peta presisi. */
export type LonLat = readonly [number, number];

export const BORNEO: LonLat[] = [
  [116.8, 7.0], [117.3, 6.6], [117.7, 5.95], [118.4, 5.85], [119.25, 5.25], [118.6, 4.55], [118.0, 4.3],
  [117.6, 3.6], [117.4, 2.4], [118.1, 1.6], [118.95, 1.0], [117.9, 0.6], [117.5, -0.2], [117.4, -0.65],
  [116.8, -1.3], [116.5, -2.0], [116.3, -3.0], [116.0, -3.65], [115.2, -4.0], [114.6, -4.15], [114.4, -3.5],
  [113.5, -3.3], [113.0, -3.15], [112.2, -3.4], [111.7, -2.95], [110.9, -3.05], [110.2, -2.6], [110.0, -1.8],
  [109.6, -1.0], [109.2, -0.2], [108.9, 0.8], [109.1, 1.6], [109.6, 2.05], [110.3, 1.7], [111.0, 1.6],
  [111.4, 2.4], [112.0, 2.9], [113.0, 3.2], [114.0, 4.4], [114.6, 4.85], [115.3, 5.2], [115.6, 5.7],
  [116.1, 6.1], [116.6, 6.8],
];

export const BALI: LonLat[] = [
  [114.43, -8.1], [114.62, -8.15], [114.85, -8.12], [115.1, -8.1], [115.35, -8.15], [115.55, -8.22],
  [115.71, -8.36], [115.6, -8.48], [115.42, -8.56], [115.26, -8.69], [115.22, -8.8], [115.15, -8.85],
  [115.09, -8.83], [115.15, -8.72], [114.98, -8.55], [114.75, -8.42], [114.58, -8.36], [114.45, -8.24],
];

/** Area kebakaran dominan (gambut Kalteng/Kalsel/Kalbar) untuk menyebar titik api. */
export const HOTSPOT_ZONES: { lon: number; lat: number; rLon: number; rLat: number; weight: number }[] = [
  { lon: 113.6, lat: -2.4, rLon: 1.6, rLat: 0.7, weight: 0.45 }, // Kalimantan Tengah
  { lon: 110.6, lat: -1.6, rLon: 0.8, rLat: 0.9, weight: 0.25 }, // Kalimantan Barat (Ketapang)
  { lon: 115.0, lat: -2.9, rLon: 0.6, rLat: 0.5, weight: 0.15 }, // Kalimantan Selatan
  { lon: 116.6, lat: -0.8, rLon: 0.5, rLat: 0.6, weight: 0.15 }, // Kalimantan Timur
];

export interface Projection {
  project: (p: LonLat) => [number, number];
  width: number;
  height: number;
}

/** Equirectangular dengan koreksi cos(lat) agar bentuk tidak gepeng, di-fit ke kotak w×h. */
export function fitProjection(shape: LonLat[], w: number, h: number, pad = 0): Projection {
  const lons = shape.map((p) => p[0]);
  const lats = shape.map((p) => p[1]);
  const midLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  const k = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lons) * k;
  const maxX = Math.max(...lons) * k;
  const minY = -Math.max(...lats);
  const maxY = -Math.min(...lats);
  const s = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
  const ox = (w - (maxX - minX) * s) / 2;
  const oy = (h - (maxY - minY) * s) / 2;
  return {
    width: w,
    height: h,
    project: ([lon, lat]) => [ox + (lon * k - minX) * s, oy + (-lat - minY) * s],
  };
}

/** Path SVG halus (Catmull-Rom → Bezier) dari polygon tertutup. */
export function smoothPath(points: [number, number][]): string {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n]!;
  let d = `M${at(0)[0].toFixed(1)},${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)},${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)},${c2[1]!.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}
