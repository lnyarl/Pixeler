/**
 * Nearest-neighbor 다운스케일.
 * AI가 생성한 큰 이미지(예: 1024x1024)를 목표 해상도(예: 32x32)로 축소.
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
      // nearest-neighbor: 원본에서 가장 가까운 픽셀 선택
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
