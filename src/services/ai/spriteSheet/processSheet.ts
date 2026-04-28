/**
 * processSheet — 시트 ImageData를 셀로 분할 + 셀별 후처리 + palette 추출.
 *
 * §5.2.3 시트 생성 흐름의 후반부:
 *   AI 응답 → ImageData → split → 각 셀 runPostProcess + extractPalette → DirectionSprite[]
 *
 * 셀별 sourceCellRect는 분할 시 grid 위치로부터 계산.
 */
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import type { AIProviderType } from "@/services/ai/types";
import type { PostProcessConfig } from "@/stores/settingsStore";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import type { DirectionSprite } from "@/services/persistence/types";
import { splitSpriteSheet } from "./splitSheet";
import { getDirectionLayout, getGridSize, getSkipCells } from "./directionLayout";
import type { DirectionMode } from "@/services/persistence/types";

export interface ProcessSheetOptions {
  /** 입력 시트 (보통 1024x1024). */
  sheet: ImageData;
  mode: DirectionMode;
  targetWidth: number;
  targetHeight: number;
  paletteSize: number;
  providerType: AIProviderType;
  postProcessConfig?: PostProcessConfig;
}

export interface ProcessedDirectionCell {
  direction: import("@/services/persistence/types").DirKey;
  sprite: DirectionSprite;
}

/**
 * 시트를 mode에 따라 분할 → 각 셀 후처리 → palette 추출 → DirectionSprite[].
 *
 * 결과 순서는 directionLayout의 selDirections 순서와 동일.
 */
export async function processSheetToDirections(
  opts: ProcessSheetOptions
): Promise<ProcessedDirectionCell[]> {
  const { cols, rows } = getGridSize(opts.mode);
  const skipCells = getSkipCells(opts.mode);
  const layout = getDirectionLayout(opts.mode);

  // 분할 — splitSpriteSheet은 row 우선 순회 + skipCells 제외 결과를 반환.
  const cells = splitSpriteSheet(opts.sheet, cols, rows, { skipCells });
  if (cells.length !== layout.length) {
    throw new Error(
      `processSheetToDirections: layout(${layout.length})와 cells(${cells.length}) 길이 불일치`
    );
  }

  const W = opts.sheet.width;
  const H = opts.sheet.height;
  const baseW = Math.floor(W / cols);
  const baseH = Math.floor(H / rows);

  const results: ProcessedDirectionCell[] = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const { direction, col, row } = layout[i];

    // 셀 좌표 계산 (잔여 흡수 동일 로직).
    const cellW = col === cols - 1 ? W - baseW * (cols - 1) : baseW;
    const cellH = row === rows - 1 ? H - baseH * (rows - 1) : baseH;
    const cellX = col === cols - 1 ? W - cellW : baseW * col;
    const cellY = row === rows - 1 ? H - cellH : baseH * row;

    const processed = await runPostProcess(cell, {
      targetWidth: opts.targetWidth,
      targetHeight: opts.targetHeight,
      paletteSize: opts.paletteSize,
      providerType: opts.providerType,
      config: opts.postProcessConfig,
    });
    const palette = extractPaletteFromImageData(processed, opts.paletteSize);

    results.push({
      direction,
      sprite: {
        imageData: processed,
        palette,
        sourceCellRect: { x: cellX, y: cellY, width: cellW, height: cellH },
      },
    });
  }

  return results;
}
