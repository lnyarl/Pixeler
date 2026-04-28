/**
 * directionLayout — 방향 페이즈 시트 레이아웃 단일 좌표 표 (M6 / §5.2.2).
 *
 * splitSpriteSheet, buildDirectionSheetPrompt 양쪽이 동일 source를 import.
 *
 * 4방향 (2x2):
 *   top-left=N  top-right=E
 *   bot-left=W  bot-right=S
 *
 * 8방향 (3x3, mid-center skip):
 *   NW  N  NE
 *   W  [-]  E
 *   SW  S  SE
 */
import type { DirKey, DirectionMode } from "@/services/persistence/types";

export interface DirectionCellPos {
  direction: DirKey;
  col: number;
  row: number;
}

export const DIRECTION_LAYOUT_4: ReadonlyArray<DirectionCellPos> = [
  { direction: "N", col: 0, row: 0 },
  { direction: "E", col: 1, row: 0 },
  { direction: "W", col: 0, row: 1 },
  { direction: "S", col: 1, row: 1 },
];

export const DIRECTION_LAYOUT_8: ReadonlyArray<DirectionCellPos> = [
  { direction: "NW", col: 0, row: 0 },
  { direction: "N", col: 1, row: 0 },
  { direction: "NE", col: 2, row: 0 },
  { direction: "W", col: 0, row: 1 },
  // mid-center (col=1, row=1) skip
  { direction: "E", col: 2, row: 1 },
  { direction: "SW", col: 0, row: 2 },
  { direction: "S", col: 1, row: 2 },
  { direction: "SE", col: 2, row: 2 },
];

/** 8방향 시트에서 분할 시 제외할 셀 (mid-center, 빈 셀). */
export const SKIP_CELLS_8: ReadonlyArray<{ col: number; row: number }> = [
  { col: 1, row: 1 },
];

/** 모드별 그리드 크기 (cols, rows). */
export function getGridSize(mode: DirectionMode): {
  cols: number;
  rows: number;
} {
  return mode === 4 ? { cols: 2, rows: 2 } : { cols: 3, rows: 3 };
}

/** 모드별 좌표 표. */
export function getDirectionLayout(
  mode: DirectionMode
): ReadonlyArray<DirectionCellPos> {
  return mode === 4 ? DIRECTION_LAYOUT_4 : DIRECTION_LAYOUT_8;
}

/** 모드별 skip cells (4방향은 빈 배열). */
export function getSkipCells(
  mode: DirectionMode
): ReadonlyArray<{ col: number; row: number }> {
  return mode === 8 ? SKIP_CELLS_8 : [];
}

/** 단일 방향에 대한 grid 위치. 없으면 null. */
export function getCellPosForDirection(
  mode: DirectionMode,
  dir: DirKey
): DirectionCellPos | null {
  return getDirectionLayout(mode).find((c) => c.direction === dir) ?? null;
}
