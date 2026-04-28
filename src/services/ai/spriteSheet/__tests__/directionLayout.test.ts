/**
 * directionLayout 단위 테스트 (β-N8 / M6).
 */
import { describe, it, expect } from "vitest";
import {
  DIRECTION_LAYOUT_4,
  DIRECTION_LAYOUT_8,
  SKIP_CELLS_8,
  getDirectionLayout,
  getSkipCells,
  getGridSize,
  getCellPosForDirection,
} from "../directionLayout";

describe("directionLayout (β-N8)", () => {
  it("4방향 layout은 4개 항목 + 좌표 일치", () => {
    expect(DIRECTION_LAYOUT_4).toHaveLength(4);
    const map = Object.fromEntries(
      DIRECTION_LAYOUT_4.map((c) => [c.direction, [c.col, c.row]])
    );
    expect(map.N).toEqual([0, 0]);
    expect(map.E).toEqual([1, 0]);
    expect(map.W).toEqual([0, 1]);
    expect(map.S).toEqual([1, 1]);
  });

  it("8방향 layout은 8개 항목 + 좌표 일치 (mid-center 스킵)", () => {
    expect(DIRECTION_LAYOUT_8).toHaveLength(8);
    const map = Object.fromEntries(
      DIRECTION_LAYOUT_8.map((c) => [c.direction, [c.col, c.row]])
    );
    expect(map.NW).toEqual([0, 0]);
    expect(map.N).toEqual([1, 0]);
    expect(map.NE).toEqual([2, 0]);
    expect(map.W).toEqual([0, 1]);
    expect(map.E).toEqual([2, 1]);
    expect(map.SW).toEqual([0, 2]);
    expect(map.S).toEqual([1, 2]);
    expect(map.SE).toEqual([2, 2]);
  });

  it("SKIP_CELLS_8은 [(1,1)] 단일 항목", () => {
    expect(SKIP_CELLS_8).toHaveLength(1);
    expect(SKIP_CELLS_8[0]).toEqual({ col: 1, row: 1 });
  });

  it("getGridSize는 4 → 2x2, 8 → 3x3", () => {
    expect(getGridSize(4)).toEqual({ cols: 2, rows: 2 });
    expect(getGridSize(8)).toEqual({ cols: 3, rows: 3 });
  });

  it("getDirectionLayout(4)와 (8)이 각 모드 layout 반환", () => {
    expect(getDirectionLayout(4)).toBe(DIRECTION_LAYOUT_4);
    expect(getDirectionLayout(8)).toBe(DIRECTION_LAYOUT_8);
  });

  it("getSkipCells: 4=빈 배열, 8=SKIP_CELLS_8", () => {
    expect(getSkipCells(4)).toHaveLength(0);
    expect(getSkipCells(8)).toBe(SKIP_CELLS_8);
  });

  it("getCellPosForDirection — 4모드 N 위치", () => {
    expect(getCellPosForDirection(4, "N")).toEqual({
      direction: "N",
      col: 0,
      row: 0,
    });
  });

  it("getCellPosForDirection — 4모드에서 NE 요청 시 null", () => {
    expect(getCellPosForDirection(4, "NE")).toBeNull();
  });

  it("getCellPosForDirection — 8모드 NE 위치", () => {
    expect(getCellPosForDirection(8, "NE")).toEqual({
      direction: "NE",
      col: 2,
      row: 0,
    });
  });

  it("8방향 layout이 mid-center를 포함하지 않음 (SKIP과 정합)", () => {
    const overlap = DIRECTION_LAYOUT_8.find((c) => c.col === 1 && c.row === 1);
    expect(overlap).toBeUndefined();
  });
});
