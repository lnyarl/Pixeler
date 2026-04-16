/**
 * 마스크 기반 합성: 마스킹된 영역만 새 이미지로 교체, 나머지는 원본 유지.
 * mask에서 흰색(R>128) 픽셀 = 새 이미지, 그 외 = 원본.
 */
export function compositeWithMask(
  original: ImageData,
  generated: ImageData,
  mask: ImageData
): ImageData {
  const w = original.width;
  const h = original.height;
  const result = new ImageData(new Uint8ClampedArray(original.data), w, h);

  for (let i = 0; i < result.data.length; i += 4) {
    if (mask.data[i] > 128) {
      // 마스킹된 영역: 생성된 이미지 사용
      result.data[i] = generated.data[i];
      result.data[i + 1] = generated.data[i + 1];
      result.data[i + 2] = generated.data[i + 2];
      result.data[i + 3] = generated.data[i + 3];
    }
  }

  return result;
}
