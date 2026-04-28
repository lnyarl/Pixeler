/**
 * splitSpriteSheet 단위 테스트 (β-N1 / β-N5 / m3).
 */
import { describe, it, expect } from "vitest";
import { splitSpriteSheet } from "../splitSheet";
import { SKIP_CELLS_8 } from "../directionLayout";

/** 픽셀 (x, y)에 색 [r,g,b,a] 채운 ImageData. */
function makeImage(
  w: number,
  h: number,
  fill: (x: number, y: number) => [number, number, number, number]
): ImageData {
  const out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fill(x, y);
      const i = (y * w + x) * 4;
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = a;
    }
  }
  return out;
}

describe("splitSpriteSheet (β-N1 / m3)", () => {
  it("정사각 1024×1024 → 2×2 = 4 셀 (각 512×512)", () => {
    const img = makeImage(1024, 1024, () => [0, 0, 0, 255]);
    const cells = splitSpriteSheet(img, 2, 2);
    expect(cells).toHaveLength(4);
    cells.forEach((c) => {
      expect(c.width).toBe(512);
      expect(c.height).toBe(512);
    });
  });

  it("정사각 1024×1024 → 3×3 = 9 셀 (col0/col1/row0/row1=341, 마지막=342) — 잔여 흡수", () => {
    const img = makeImage(1024, 1024, () => [255, 255, 255, 255]);
    const cells = splitSpriteSheet(img, 3, 3);
    expect(cells).toHaveLength(9);
    // 9개 순서: row0 col0,1,2 / row1 col0,1,2 / row2 col0,1,2.
    // col0,1=341, col2=342; row0,1=341, row2=342.
    const widths = [341, 341, 342, 341, 341, 342, 341, 341, 342];
    const heights = [341, 341, 341, 341, 341, 341, 342, 342, 342];
    cells.forEach((c, idx) => {
      expect(c.width).toBe(widths[idx]);
      expect(c.height).toBe(heights[idx]);
    });
  });

  it("8방향 mid-center skip → 9 - 1 = 8 셀", () => {
    const img = makeImage(1024, 1024, () => [0, 0, 0, 255]);
    const cells = splitSpriteSheet(img, 3, 3, { skipCells: SKIP_CELLS_8 });
    expect(cells).toHaveLength(8);
  });

  it("픽셀 색이 위치에 따라 정확히 분리됨 (4×4 → 2×2)", () => {
    // 좌상=R, 우상=G, 좌하=B, 우하=Y로 4분할 채움.
    const img = makeImage(4, 4, (x, y) => {
      if (x < 2 && y < 2) return [255, 0, 0, 255]; // R
      if (x >= 2 && y < 2) return [0, 255, 0, 255]; // G
      if (x < 2 && y >= 2) return [0, 0, 255, 255]; // B
      return [255, 255, 0, 255]; // Y
    });
    const cells = splitSpriteSheet(img, 2, 2);
    expect(cells).toHaveLength(4);
    // cells[0]=top-left=R, cells[1]=top-right=G, cells[2]=bot-left=B, cells[3]=bot-right=Y.
    expect([cells[0].data[0], cells[0].data[1], cells[0].data[2]]).toEqual([
      255, 0, 0,
    ]);
    expect([cells[1].data[0], cells[1].data[1], cells[1].data[2]]).toEqual([
      0, 255, 0,
    ]);
    expect([cells[2].data[0], cells[2].data[1], cells[2].data[2]]).toEqual([
      0, 0, 255,
    ]);
    expect([cells[3].data[0], cells[3].data[1], cells[3].data[2]]).toEqual([
      255, 255, 0,
    ]);
  });

  it("33×33 → 2×2 — 잔여 픽셀 1px 흡수", () => {
    const img = makeImage(33, 33, () => [0, 0, 0, 255]);
    const cells = splitSpriteSheet(img, 2, 2);
    expect(cells).toHaveLength(4);
    // col0=16, col1=33-16=17 / row0=16, row1=17.
    expect(cells[0].width).toBe(16);
    expect(cells[0].height).toBe(16);
    expect(cells[1].width).toBe(17); // 마지막 col 잔여 흡수
    expect(cells[3].width).toBe(17);
    expect(cells[3].height).toBe(17);
  });

  it("cols/rows=0 또는 음수 → throw", () => {
    const img = makeImage(2, 2, () => [0, 0, 0, 255]);
    expect(() => splitSpriteSheet(img, 0, 2)).toThrow();
    expect(() => splitSpriteSheet(img, -1, 2)).toThrow();
  });

  it("skipCells가 결과 순서에 영향 — 행 우선 순회 + 스킵 제외", () => {
    // 9칸 (3x3) 중 (1,1) skip → 8개.
    // 셀에 다른 색을 채워서 순서 확인.
    const colors: [number, number, number][] = [
      [10, 0, 0], [20, 0, 0], [30, 0, 0],
      [40, 0, 0], [50, 0, 0], [60, 0, 0],
      [70, 0, 0], [80, 0, 0], [90, 0, 0],
    ];
    const img = makeImage(3, 3, (x, y) => {
      const idx = y * 3 + x;
      const c = colors[idx];
      return [c[0], c[1], c[2], 255];
    });
    const cells = splitSpriteSheet(img, 3, 3, {
      skipCells: [{ col: 1, row: 1 }],
    });
    expect(cells).toHaveLength(8);
    // 순서 확인 (row 0~2, skip 1,1):
    const expected = [10, 20, 30, 40, 60, 70, 80, 90];
    cells.forEach((c, idx) => {
      expect(c.data[0]).toBe(expected[idx]);
    });
  });
});
