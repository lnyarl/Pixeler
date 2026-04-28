/**
 * processAnimationSheet — 애니메이션 시트 → 프레임 ImageData[] 변환.
 *
 * §5.3.5 시트 생성 흐름의 후반부:
 *   AI 응답 → ImageData → splitSpriteSheet (1xN/2xK) → 각 프레임 runPostProcess → palette 추출.
 *
 * 출력 순서는 frameCountToGrid의 row-major 순회 (좌→우, 상→하) — splitSpriteSheet의 기본 순회와 동일.
 * 즉 첫 N개는 사용자가 의도한 시간 순서.
 */
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import type { AIProviderType } from "@/services/ai/types";
import type { PostProcessConfig } from "@/stores/settingsStore";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import type { AnimationFrame } from "@/services/persistence/types";
import { splitSpriteSheet } from "@/services/ai/spriteSheet/splitSheet";
import { frameCountToGrid } from "@/services/ai/promptBuilder/animation";

export interface ProcessAnimationSheetOptions {
  /** 입력 시트 (보통 1024x1024). */
  sheet: ImageData;
  frameCount: number;
  targetWidth: number;
  targetHeight: number;
  paletteSize: number;
  providerType: AIProviderType;
  postProcessConfig?: PostProcessConfig;
}

/**
 * 시트를 frameCount × grid → 셀 분할 → 각 셀 후처리 → AnimationFrame[].
 *
 * 결과 길이는 frameCount.
 */
export async function processAnimationSheetToFrames(
  opts: ProcessAnimationSheetOptions
): Promise<AnimationFrame[]> {
  const { cols, rows } = frameCountToGrid(opts.frameCount);
  const totalCells = cols * rows;

  // splitSpriteSheet은 row-major (top-left, ..., bottom-right) 순회 결과를 반환.
  const cells = splitSpriteSheet(opts.sheet, cols, rows);
  if (cells.length !== totalCells) {
    throw new Error(
      `processAnimationSheet: expected ${totalCells} cells, got ${cells.length}`
    );
  }

  const results: AnimationFrame[] = [];
  // frameCount만 사용 (grid가 더 클 수도 있는 케이스는 frameCountToGrid의 정의상 발생 안 하지만 안전하게 slice).
  for (let i = 0; i < opts.frameCount; i++) {
    const cell = cells[i];
    const processed = await runPostProcess(cell, {
      targetWidth: opts.targetWidth,
      targetHeight: opts.targetHeight,
      paletteSize: opts.paletteSize,
      providerType: opts.providerType,
      config: opts.postProcessConfig,
    });
    const palette = extractPaletteFromImageData(processed, opts.paletteSize);
    results.push({ imageData: processed, palette });
  }

  return results;
}
