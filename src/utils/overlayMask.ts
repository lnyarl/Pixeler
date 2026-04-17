/**
 * 마스크 영역을 이미지에 반투명 색으로 오버레이.
 * AI에게 "여기를 주목하라"는 시각적 힌트로 전달.
 */
export function overlayMaskOnImage(
  image: ImageData,
  mask: ImageData,
  color: [number, number, number] = [255, 0, 0],
  alpha: number = 0.5
): ImageData {
  if (image.width !== mask.width || image.height !== mask.height) {
    throw new Error("image와 mask의 크기가 다름");
  }

  const result = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height
  );

  for (let i = 0; i < mask.data.length; i += 4) {
    // 마스크 흰색(>128) = 오버레이 적용
    if (mask.data[i] > 128) {
      // 알파 블렌딩: 결과 = 원본 * (1-alpha) + 오버레이 * alpha
      result.data[i] =
        result.data[i] * (1 - alpha) + color[0] * alpha;
      result.data[i + 1] =
        result.data[i + 1] * (1 - alpha) + color[1] * alpha;
      result.data[i + 2] =
        result.data[i + 2] * (1 - alpha) + color[2] * alpha;
      // alpha는 원본 유지 (투명 영역은 투명 상태로)
    }
  }

  return result;
}
