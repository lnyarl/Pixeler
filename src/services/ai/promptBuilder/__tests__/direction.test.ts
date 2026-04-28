/**
 * 방향 prompt builder 단위 테스트 (β-N2 / M6).
 */
import { describe, it, expect } from "vitest";
import {
  buildDirectionSheetPrompt,
  buildSingleDirectionPrompt,
  serializePaletteHint,
} from "../direction";
import type { RGB } from "@/services/persistence/types";

const PALETTE: RGB[] = [
  [10, 20, 30],
  [200, 100, 50],
];

describe("serializePaletteHint", () => {
  it("rgb() 형식 직렬화", () => {
    expect(serializePaletteHint(PALETTE)).toBe("rgb(10,20,30), rgb(200,100,50)");
  });

  it("빈 배열 → 빈 문자열", () => {
    expect(serializePaletteHint([])).toBe("");
  });

  it("16색 초과 → 16색까지만 잘라서 직렬화", () => {
    const big: RGB[] = [];
    for (let i = 0; i < 30; i++) big.push([i, 0, 0]);
    const out = serializePaletteHint(big);
    const count = (out.match(/rgb\(/g) ?? []).length;
    expect(count).toBe(16);
  });
});

describe("buildDirectionSheetPrompt (β-N2 / M6)", () => {
  it("4방향 — 2x2 grid 본문 + 좌표 표 일치", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "knight",
      mode: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("knight");
    expect(out).toContain("2x2 grid");
    expect(out).toContain("top-left: back view");
    expect(out).toContain("top-right: right side view");
    expect(out).toContain("bottom-left: left side view");
    expect(out).toContain("bottom-right: front view");
    expect(out).toContain("Use these base colors where possible: rgb(10,20,30)");
    expect(out).toContain("Style: 32x32 pixel art per cell");
  });

  it("8방향 — 3x3 grid + center empty 명시 + 8개 방향 모두 텍스트 포함", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "wizard",
      mode: 8,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("3x3 grid");
    expect(out).toContain("center cell intentionally left empty");
    expect(out).toContain("[empty/blank]");
    // 모든 방향 텍스트.
    expect(out).toContain("back-left diagonal (NW)");
    expect(out).toContain("back view (N");
    expect(out).toContain("back-right diagonal (NE)");
    expect(out).toContain("left side view (W)");
    expect(out).toContain("right side view (E)");
    expect(out).toContain("front-left diagonal (SW)");
    expect(out).toContain("front view (S");
    expect(out).toContain("front-right diagonal (SE)");
  });

  it("requireEdges=true → 외곽선 텍스트 포함", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "knight",
      mode: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
      requireEdges: true,
    });
    expect(out).toContain("1-pixel dark outlines");
  });

  it("paletteSize=0 → 'limited color palette' 사용", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "knight",
      mode: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 0,
    });
    expect(out).toContain("limited color palette");
    expect(out).not.toContain("strictly limited 0");
  });

  it("userExtra가 있으면 'Additional notes: ...' 포함", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "knight",
      mode: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
      userExtra: "wearing red cape",
    });
    expect(out).toContain("Additional notes: wearing red cape");
  });

  it("빈 팔레트 → palette hint 줄 생략", () => {
    const out = buildDirectionSheetPrompt({
      characterDescription: "knight",
      mode: 4,
      basePalette: [],
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).not.toContain("Use these base colors");
  });
});

describe("buildSingleDirectionPrompt", () => {
  it("단일 방향 (E) 본문 + 일관성 강조", () => {
    const out = buildSingleDirectionPrompt({
      characterDescription: "knight",
      direction: "E",
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("Single right side view (E)");
    expect(out).toContain("knight");
    expect(out).toContain("consistent with the reference image");
    expect(out).toContain("Use these base colors");
  });

  it("NE 단일 방향", () => {
    const out = buildSingleDirectionPrompt({
      characterDescription: "knight",
      direction: "NE",
      basePalette: [],
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("back-right diagonal (NE)");
  });
});
