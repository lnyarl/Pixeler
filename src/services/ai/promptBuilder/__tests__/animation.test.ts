/**
 * 애니메이션 prompt builder 단위 테스트 (γ-N2).
 *
 * - 4 프리셋 + 직접 설명 + palette 힌트 + 방향 텍스트 매핑.
 * - frameCount → grid 결정 (1xN / 2xK).
 */
import { describe, it, expect } from "vitest";
import {
  buildAnimationSheetPrompt,
  buildSingleAnimationFramePrompt,
  frameCountToGrid,
} from "../animation";
import type { RGB } from "@/services/persistence/types";

const PALETTE: RGB[] = [
  [10, 20, 30],
  [200, 100, 50],
];

describe("frameCountToGrid (§5.3.6)", () => {
  it.each([
    [2, { cols: 2, rows: 1, label: "1xN" }],
    [3, { cols: 3, rows: 1, label: "1xN" }],
    [4, { cols: 2, rows: 2, label: "2xK" }],
    [5, { cols: 3, rows: 2, label: "2xK" }],
    [6, { cols: 3, rows: 2, label: "2xK" }],
    [7, { cols: 4, rows: 2, label: "2xK" }],
    [8, { cols: 4, rows: 2, label: "2xK" }],
  ])("frameCount=%i → %o", (fc, expected) => {
    expect(frameCountToGrid(fc)).toEqual(expected);
  });
});

describe("buildAnimationSheetPrompt (γ-N2)", () => {
  it("walk 프리셋 + S 방향 + 4프레임 → 2x2 grid 본문", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "S",
      presetDescriptor: "a 4-frame walking cycle",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("knight");
    expect(out).toContain("toward the camera (front view)");
    expect(out).toContain("4 sequential frames of a 4-frame walking cycle");
    expect(out).toContain("2x2 grid");
    expect(out).toContain("top-to-bottom");
    expect(out).toContain("Use these base colors where possible: rgb(10,20,30)");
    expect(out).toContain("Style: 32x32 pixel art per cell");
    // 일관성 강조.
    expect(out).toContain("Keep all frames consistent");
  });

  it("idle 프리셋 + 2프레임 → 2x1 grid (1xN)", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "E",
      presetDescriptor: "subtle breathing",
      frameCount: 2,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("2x1 grid");
    expect(out).toContain("1xN");
    // 1행이므로 top-to-bottom 없음.
    expect(out).not.toContain("top-to-bottom");
    expect(out).toContain("to the right");
  });

  it("attack 프리셋 + 3프레임 → 3x1 grid", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "W",
      presetDescriptor: "attack motion",
      frameCount: 3,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("3x1 grid");
    expect(out).toContain("to the left");
  });

  it("8프레임 → 4x2 grid + top-to-bottom 명시", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "N",
      presetDescriptor: "long animation",
      frameCount: 8,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("4x2 grid");
    expect(out).toContain("top-to-bottom");
    expect(out).toContain("away from the camera (back view)");
  });

  it("프리셋 + customDescriptor → 두 motion이 모두 prompt에 포함", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "wizard",
      direction: "S",
      presetDescriptor: "subtle breathing motion",
      customDescriptor: "with hair flowing",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("subtle breathing motion");
    expect(out).toContain("with hair flowing");
  });

  it("직접 설명 모드 (presetDescriptor 없음) → customDescriptor만 사용", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "robot",
      direction: "S",
      customDescriptor: "spinning in place with sparks",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("spinning in place with sparks");
    // 프리셋 stub 텍스트가 없어야 함.
    expect(out).not.toContain("subtle breathing");
    expect(out).not.toContain("walking cycle");
  });

  it("preset + custom 모두 비어있으면 generic 문구 fallback", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "ghost",
      direction: "S",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("4-frame animation cycle");
  });

  it("빈 팔레트 → palette hint 줄 생략", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "S",
      presetDescriptor: "walk",
      frameCount: 4,
      basePalette: [],
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).not.toContain("Use these base colors");
  });

  it("requireEdges=true → 외곽선 텍스트 포함", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "S",
      presetDescriptor: "walk",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
      requireEdges: true,
    });
    expect(out).toContain("1-pixel dark outlines");
  });

  it("paletteSize=0 → 'limited color palette' 사용", () => {
    const out = buildAnimationSheetPrompt({
      characterDescription: "knight",
      direction: "S",
      presetDescriptor: "walk",
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 0,
    });
    expect(out).toContain("limited color palette");
    expect(out).not.toContain("strictly limited 0");
  });
});

describe("buildSingleAnimationFramePrompt", () => {
  it("frame N of M context + 일관성 강조", () => {
    const out = buildSingleAnimationFramePrompt({
      characterDescription: "knight",
      direction: "S",
      presetDescriptor: "walk cycle",
      frameIndex: 2,
      frameCount: 4,
      basePalette: PALETTE,
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("Single frame 2 of 4 of knight");
    expect(out).toContain("toward the camera");
    expect(out).toContain("Motion context: walk cycle");
    expect(out).toContain("consistent with the reference image");
    expect(out).toContain("Use these base colors");
  });

  it("직접 설명 모드 — preset 없이 custom만", () => {
    const out = buildSingleAnimationFramePrompt({
      characterDescription: "robot",
      direction: "E",
      customDescriptor: "raising arm",
      frameIndex: 1,
      frameCount: 3,
      basePalette: [],
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).toContain("raising arm");
    expect(out).toContain("Single frame 1 of 3");
  });

  it("preset + custom 모두 없으면 motion 줄 생략", () => {
    const out = buildSingleAnimationFramePrompt({
      characterDescription: "ghost",
      direction: "S",
      frameIndex: 1,
      frameCount: 2,
      basePalette: [],
      width: 32,
      height: 32,
      paletteSize: 16,
    });
    expect(out).not.toContain("Motion context");
  });
});
