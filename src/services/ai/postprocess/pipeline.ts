import { downscale, downscaleMode } from "./downscale";
import { paletteMap } from "./paletteMap";
import { makeTransparentBackground } from "./transparentBackground";
import type { AIProviderType } from "../types";

export type DownscaleMode = "nearest" | "mode";

interface PipelineOptions {
  targetWidth: number;
  targetHeight: number;
  /** 팔레트 색상 수. 0이면 팔레트 매핑 스킵. */
  paletteSize?: number;
  /** 제공자 타입 */
  providerType?: AIProviderType;
  /** 다운스케일 알고리즘 (기본 mode — AI 픽셀아트에 적합) */
  downscaleMode?: DownscaleMode;
  /** 투명 배경 스킵 */
  skipTransparentBg?: boolean;
  /** 전체 후처리 스킵 (AI 원본 그대로 사용하되 다운스케일만) */
  skipAll?: boolean;
}

/**
 * 후처리 파이프라인.
 * 범용 모델: 다운스케일 → (투명 배경) → (팔레트 매핑)
 * skipAll이면 nearest 다운스케일만 수행.
 */
export function runPostProcess(
  imageData: ImageData,
  options: PipelineOptions
): ImageData {
  const {
    targetWidth,
    targetHeight,
    paletteSize = 16,
    providerType,
    downscaleMode: dmode = "mode",
    skipTransparentBg = false,
    skipAll = false,
  } = options;

  const isGeneral = providerType !== undefined;
  let result = imageData;

  if (skipAll) {
    // 다운스케일만 (AI 원본 그대로)
    if (isGeneral) {
      result =
        dmode === "mode"
          ? downscaleMode(result, targetWidth, targetHeight)
          : downscale(result, targetWidth, targetHeight);
    }
    return result;
  }

  if (isGeneral) {
    result =
      dmode === "mode"
        ? downscaleMode(result, targetWidth, targetHeight)
        : downscale(result, targetWidth, targetHeight);
  }

  if (!skipTransparentBg) {
    result = makeTransparentBackground(result);
  }

  if (paletteSize > 0) {
    result = paletteMap(result, paletteSize);
  }

  return result;
}
