/**
 * 배경을 투명으로 변환.
 * 네 귀퉁이 픽셀을 배경색 후보로 사용하여 가장 빈번한 색을 배경색으로 판단.
 */
export function makeTransparentBackground(
  src: ImageData,
  tolerance: number = 30
): ImageData {
  const dst = new ImageData(
    new Uint8ClampedArray(src.data),
    src.width,
    src.height
  );

  const bgColor = detectBackgroundColor(src);
  if (!bgColor) return dst;

  const [bgR, bgG, bgB] = bgColor;

  for (let i = 0; i < dst.data.length; i += 4) {
    if (dst.data[i + 3] === 0) continue; // 이미 투명

    const r = dst.data[i];
    const g = dst.data[i + 1];
    const b = dst.data[i + 2];

    const dist = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    if (dist <= tolerance) {
      dst.data[i + 3] = 0;
    }
  }

  return dst;
}

/** 네 귀퉁이 픽셀 중 가장 빈번한 색을 배경색으로 판단 */
function detectBackgroundColor(
  src: ImageData
): [number, number, number] | null {
  const w = src.width;
  const h = src.height;
  const corners = [
    0, // 좌상
    (w - 1) * 4, // 우상
    (h - 1) * w * 4, // 좌하
    ((h - 1) * w + (w - 1)) * 4, // 우하
  ];

  const votes: Map<string, { color: [number, number, number]; count: number }> =
    new Map();

  for (const idx of corners) {
    const r = src.data[idx];
    const g = src.data[idx + 1];
    const b = src.data[idx + 2];
    const key = `${r},${g},${b}`;
    const existing = votes.get(key);
    if (existing) {
      existing.count++;
    } else {
      votes.set(key, { color: [r, g, b], count: 1 });
    }
  }

  let best: { color: [number, number, number]; count: number } | null = null;
  for (const entry of votes.values()) {
    if (!best || entry.count > best.count) {
      best = entry;
    }
  }

  return best?.color ?? null;
}
