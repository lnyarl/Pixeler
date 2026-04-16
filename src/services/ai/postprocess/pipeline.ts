import { downscale } from "./downscale";
import { paletteMap } from "./paletteMap";
import { makeTransparentBackground } from "./transparentBackground";
import type { AIProviderType } from "../types";

interface PipelineOptions {
  targetWidth: number;
  targetHeight: number;
  /** 팔레트 색상 수 (기본 16) */
  paletteSize?: number;
  /** 제공자 타입으로 모델 유형 자동 판별 */
  providerType?: AIProviderType;
}

/**
 * 후처리 파이프라인.
 * 범용 모델(openai 등): 다운스케일 → 투명 배경 → 팔레트 매핑
 * 특화 모델: 투명 배경 → 팔레트 매핑 (다운스케일 스킵)
 *
 * 투명 배경 감지를 팔레트 매핑 전에 수행하여,
 * 팔레트 매핑이 배경색을 변경하는 문제를 방지.
 */
export function runPostProcess(
  imageData: ImageData,
  options: PipelineOptions
): ImageData {
  const { targetWidth, targetHeight, paletteSize = 16, providerType } = options;

  // 제공자 타입으로 모델 유형 자동 판별
  // 현재 지원 제공자는 전부 범용 모델
  const isGeneral = providerType !== undefined; // 추후 특화 모델 추가 시 조건 변경

  let result = imageData;

  // 범용 모델이면 다운스케일
  if (isGeneral) {
    result = downscale(result, targetWidth, targetHeight);
  }

  // 투명 배경을 팔레트 매핑 전에 적용 (원본 색 기반 배경 감지)
  result = makeTransparentBackground(result);

  // 팔레트 매핑 (안티앨리어싱 제거 포함). 0이면 제한 없음(스킵).
  if (paletteSize > 0) {
    result = paletteMap(result, paletteSize);
  }

  return result;
}
