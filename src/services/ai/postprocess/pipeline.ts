import { boxAverage } from "./boxAverage";
import { downscale, downscaleMode } from "./downscale";
import { paletteMap } from "./paletteMap";
import { makeTransparentBackground } from "./transparentBackground";
import type { PostProcessConfig } from "@/stores/settingsStore";

interface PipelineOptions {
  targetWidth: number;
  targetHeight: number;
  paletteSize?: number;
  /** 각 단계 on/off + 알고리즘 선택 */
  config?: PostProcessConfig;
}

const DEFAULT_CONFIG: PostProcessConfig = {
  downscale: "mode",
  transparentBg: true,
  paletteMap: true,
  outlinePreserve: false,
};

/**
 * boxAverage 중간 해상도 배수. mid = target × N.
 * 기획서 §4.2: N=4 기본 (mid=128 for target=32). config 노출 안 함.
 */
const BOX_AVERAGE_N = 4;

/**
 * 후처리 파이프라인 (기획서 v2 §3 / §6.1).
 *
 * 단일 provider(Stability) 운영 — 모든 입력은 일반 모델(고해상도) 출력으로 가정.
 * 순서: Step A (paletteMap 1차, 1024 시점)
 *      → Step A' (transparentBg 1차, alpha 0/255 이진화로 boxAverage 가장자리 오염 차단)
 *      → Step B (boxAverage 1024 → mid)
 *      → Step C (paletteMap 2차, mid 시점, fixedPalette로 K-means 스킵)
 *      → Step D (downscale mid → target)
 *      → Step E (transparentBg 2차, target 시점 최종 안전망).
 *
 * 토글 매트릭스 (기획서 §4.7):
 *   - paletteMap=true:  A 실행, A'은 transparentBg=true일 때만, C 실행.
 *   - paletteMap=false: A·A'·C 스킵. B·D는 항상 실행 (다운스케일은 paletteMap 토글과 무관).
 *   - transparentBg=true:  A'은 paletteMap=true일 때, E는 무조건 실행.
 *   - transparentBg=false: A'·E 둘 다 스킵 (1차/2차 모두 끔 — 토글 의미 일관성).
 */
export async function runPostProcess(
  imageData: ImageData,
  options: PipelineOptions
): Promise<ImageData> {
  const {
    targetWidth,
    targetHeight,
    paletteSize = 16,
    config = DEFAULT_CONFIG,
  } = options;

  let result = imageData;
  let palette: ReadonlyArray<readonly [number, number, number]> | null = null;

  // Step A: paletteMap 1차 (입력 해상도 유지, 보통 1024)
  if (config.paletteMap && paletteSize > 0) {
    const out = paletteMap(result, paletteSize, { preserveAlpha: true });
    result = out.result;
    palette = out.palette;
  }

  // Step A': transparentBg 1차 — boxAverage 가장자리 오염 방지 (M1 / R9·R10).
  // paletteMap·transparentBg 둘 다 켜져 있을 때만 실행 (기획서 §4.7 N-m4 응답).
  if (config.paletteMap && config.transparentBg) {
    result = makeTransparentBackground(result);
  }

  // Step B: boxAverage src → mid (mid = target × N).
  // paletteMap 토글과 무관하게 항상 실행 (M4 / 기획서 §4.7).
  // src.width <= midW면 boxAverage 내부에서 항등 반환.
  const midW = targetWidth * BOX_AVERAGE_N;
  const midH = targetHeight * BOX_AVERAGE_N;
  if (result.width > midW && result.height > midH) {
    result = await boxAverage(result, midW, midH);
  }

  // Step C: paletteMap 2차 (mid 시점, palette₀ 재사용).
  // boxAverage가 만든 보간 색을 다시 palette₀에 스냅. K-means 스킵.
  if (config.paletteMap && palette && palette.length > 0) {
    const out = paletteMap(result, paletteSize, {
      preserveAlpha: true,
      fixedPalette: palette,
    });
    result = out.result;
  }

  // Step D: mid → target. paletteMap 토글과 무관하게 항상 실행.
  // outlinePreserve는 mode 알고리즘에서만 의미 있음. nearest는 옵션 무시.
  result =
    config.downscale === "mode"
      ? downscaleMode(result, targetWidth, targetHeight, {
          preserveOutline: config.outlinePreserve,
        })
      : downscale(result, targetWidth, targetHeight);

  // Step E: transparentBg 2차 (target 해상도 최종 안전망).
  if (config.transparentBg) {
    result = makeTransparentBackground(result);
  }

  return result;
}
