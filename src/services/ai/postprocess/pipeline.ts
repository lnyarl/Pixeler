import { downscale, downscaleMode } from "./downscale";
import { paletteMap } from "./paletteMap";
import { makeTransparentBackground } from "./transparentBackground";
import type { AIProviderType } from "../types";
import type { PostProcessConfig } from "@/stores/settingsStore";

interface PipelineOptions {
  targetWidth: number;
  targetHeight: number;
  paletteSize?: number;
  providerType?: AIProviderType;
  /** 각 단계 on/off + 알고리즘 선택 */
  config?: PostProcessConfig;
}

const DEFAULT_CONFIG: PostProcessConfig = {
  downscale: "mode",
  transparentBg: true,
  paletteMap: true,
};

/**
 * 후처리 파이프라인.
 * 각 단계를 개별로 on/off 가능.
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
    config = DEFAULT_CONFIG,
  } = options;

  const isGeneral = providerType !== undefined;
  let result = imageData;

  // 다운스케일 (범용 모델만)
  if (isGeneral) {
    result =
      config.downscale === "mode"
        ? downscaleMode(result, targetWidth, targetHeight)
        : downscale(result, targetWidth, targetHeight);
  }

  if (config.transparentBg) {
    result = makeTransparentBackground(result);
  }

  if (config.paletteMap && paletteSize > 0) {
    result = paletteMap(result, paletteSize).result;
  }

  return result;
}
