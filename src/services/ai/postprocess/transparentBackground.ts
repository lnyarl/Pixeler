/**
 * 배경을 투명으로 변환.
 * 좌상단 픽셀을 배경색으로 판단하고, 해당 색과 유사한 픽셀을 투명 처리.
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

  // 좌상단 픽셀을 배경색으로
  const bgR = src.data[0];
  const bgG = src.data[1];
  const bgB = src.data[2];

  for (let i = 0; i < dst.data.length; i += 4) {
    const r = dst.data[i];
    const g = dst.data[i + 1];
    const b = dst.data[i + 2];

    const dist = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
    );

    if (dist <= tolerance) {
      dst.data[i + 3] = 0; // 투명
    }
  }

  return dst;
}
