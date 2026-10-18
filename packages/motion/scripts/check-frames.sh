#!/usr/bin/env bash
# Loop verifikasi wajib (claude-remotion-skill aturan #10): render frame kunci + overlay safe zone,
# lalu BUKA dan periksa tiap PNG sebelum render final.
#   pnpm --filter @pca/motion check:karhutla [frame ...]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=../../out/karhutla/frames
mkdir -p "$OUT"
FRAMES=("$@")
[ ${#FRAMES[@]} -eq 0 ] && FRAMES=(8 40 150 240 310 400 480 560 650 730 790 910 1020)
GL="${REMOTION_GL:-swangle}"
for f in "${FRAMES[@]}"; do
  npx remotion still src/index.ts KarhutlaReel "$OUT/f$(printf %04d "$f").png" \
    --frame "$f" --gl="$GL" --overwrite --props='{"showSafeZone":true}' >/dev/null
  echo "✓ $OUT/f$(printf %04d "$f").png"
done
