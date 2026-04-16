import { downscale } from "./downscale";
import { paletteMap } from "./paletteMap";
import { makeTransparentBackground } from "./transparentBackground";

export type ModelType = "general" | "pixel-specialized";

interface PipelineOptions {
  targetWidth: number;
  targetHeight: number;
  modelType: ModelType;
  /** 팔레트 색상 수 (기본 16) */
  paletteSize?: number;
}

/**
 * 후처리 파이프라인.
 * 범용 모델: 다운스케일 → 팔레트 매핑 → 투명 배경
 * 특화 모델: 팔레트 매핑 → 투명 배경 (다운스케일 스킵)
 */
export function runPostProcess(
  imageData: ImageData,
  options: PipelineOptions
): ImageData {
  const { targetWidth, targetHeight, modelType, paletteSize = 16 } = options;

  let result = imageData;

  // 범용 모델이면 다운스케일 적용
  if (modelType === "general") {
    result = downscale(result, targetWidth, targetHeight);
  }

  // 팔레트 매핑 (안티앨리어싱 제거 포함)
  result = paletteMap(result, paletteSize);

  // 투명 배경
  result = makeTransparentBackground(result);

  return result;
}
