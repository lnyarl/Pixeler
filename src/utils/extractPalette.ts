/**
 * `extractPaletteFromImageData` — paletteMap의 K-means 부분 재사용.
 *
 * - bridge에서 HistoryItem → BaseSprite 변환 시 palette 새로 추출용 (§4.3.3 / m7).
 * - 후처리 paletteMap의 K-means를 그대로 호출하고 result는 버리고 palette만 반환.
 */

import { paletteMap } from "@/services/ai/postprocess/paletteMap";

export type RGB = readonly [number, number, number];

/**
 * ImageData에서 K-means로 targetColors개 팔레트 추출.
 *
 * - 빈/투명 이미지: 빈 배열.
 * - 단색: 1색.
 * - 다색: targetColors개.
 *
 * @param img 추출 대상 이미지
 * @param targetColors 목표 색상 수 (기본 16)
 */
export function extractPaletteFromImageData(
  img: ImageData,
  targetColors: number = 16
): RGB[] {
  if (!img || img.width === 0 || img.height === 0) return [];

  // paletteMap을 사용하여 K-means로 팔레트만 추출 (result는 버린다).
  const { palette } = paletteMap(img, targetColors);
  return palette.map((c) => [c[0], c[1], c[2]] as RGB);
}
