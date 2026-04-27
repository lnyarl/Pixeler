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
 * 색 비교는 16단계 양자화 (`>>4` 시프트, 채널당 16버킷) 후 mode 추출 → 첫 등장 원본 RGBA 복원.
 * 양자화 키는 채널별 시프트를 비트 OR로 합쳐 65536 버킷 단일 정수로 인코딩 (기획서 §4.6 / §6.2).
 */
export function downscaleMode(
  src: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  if (src.width === targetWidth && src.height === targetHeight) return src;

  // M4 안전망: blockW<1이면 빈 블록 발생 → nearest 폴백 (기획서 §4.3 / §6.2 변경 1).
  const blockW = src.width / targetWidth;
  const blockH = src.height / targetHeight;
  if (blockW < 1 || blockH < 1) {
    return downscale(src, targetWidth, targetHeight);
  }

  const dst = new ImageData(targetWidth, targetHeight);

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

          // 16단계 양자화 비트 OR 인코딩 (4비트 시프트 × 4채널 = 16비트 키, 65536 버킷, 충돌 없음).
          const key = ((r >> 4) << 12) | ((g >> 4) << 8) | ((b >> 4) << 4) | (a >> 4);
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
