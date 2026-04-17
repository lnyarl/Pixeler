/**
 * Nearest-neighbor 다운스케일.
 * 각 출력 픽셀에서 원본의 좌상단 1픽셀만 샘플링. 빠르지만 픽셀아트 경계에 취약.
 */
export function downscale(
  src: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  if (src.width === targetWidth && src.height === targetHeight) return src;

  const dst = new ImageData(targetWidth, targetHeight);
  const xRatio = src.width / targetWidth;
  const yRatio = src.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio);
      const srcY = Math.floor(y * yRatio);
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;

      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }

  return dst;
}

/**
 * Mode(최빈색) 기반 다운스케일.
 * 각 출력 픽셀 = 해당 원본 블록에서 가장 많이 나타난 색.
 * AI가 이미 픽셀아트 스타일로 그렸을 때 (1024x1024에 32x32 픽셀이 32x32 블록으로 표현) 훨씬 깨끗한 결과.
 *
 * 색 비교는 4단계 양자화 (0~63, 64~127, 128~191, 192~255) 후 mode 추출 → 원본 색 복원.
 */
export function downscaleMode(
  src: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  if (src.width === targetWidth && src.height === targetHeight) return src;

  const dst = new ImageData(targetWidth, targetHeight);
  const blockW = src.width / targetWidth;
  const blockH = src.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const startX = Math.floor(x * blockW);
      const startY = Math.floor(y * blockH);
      const endX = Math.floor((x + 1) * blockW);
      const endY = Math.floor((y + 1) * blockH);

      // 블록 내 색상 빈도 + 대표 원본 색 저장
      const counts = new Map<number, { count: number; r: number; g: number; b: number; a: number }>();

      for (let by = startY; by < endY; by++) {
        for (let bx = startX; bx < endX; bx++) {
          const idx = (by * src.width + bx) * 4;
          const r = src.data[idx];
          const g = src.data[idx + 1];
          const b = src.data[idx + 2];
          const a = src.data[idx + 3];

          // 4단계 양자화로 해시
          const key = (r >> 6) * 125 + (g >> 6) * 25 + (b >> 6) * 5 + (a >> 6);
          const existing = counts.get(key);
          if (existing) {
            existing.count++;
          } else {
            counts.set(key, { count: 1, r, g, b, a });
          }
        }
      }

      // 최빈 색 선택
      let best = { count: 0, r: 0, g: 0, b: 0, a: 0 };
      for (const entry of counts.values()) {
        if (entry.count > best.count) best = entry;
      }

      const dstIdx = (y * targetWidth + x) * 4;
      dst.data[dstIdx] = best.r;
      dst.data[dstIdx + 1] = best.g;
      dst.data[dstIdx + 2] = best.b;
      dst.data[dstIdx + 3] = best.a;
    }
  }

  return dst;
}
