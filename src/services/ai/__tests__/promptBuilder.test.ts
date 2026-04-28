import { describe, it, expect } from "vitest";
import { buildGeneratePrompt, buildFeedbackPrompt } from "../promptBuilder";

const EDGE_TEXT = "Each shape must have clear 1-pixel dark outlines along its edges.";

describe("buildGeneratePrompt", () => {
  it("해상도와 스타일 힌트가 포함된다", () => {
    const result = buildGeneratePrompt("기사 캐릭터", 32, 32);
    expect(result).toContain("32x32");
    expect(result).toContain("pixel art");
    expect(result).toContain("기사 캐릭터");
  });

  it("뷰타입 인자가 없어도 동작", () => {
    const result = buildGeneratePrompt("마법사", 16, 16);
    expect(result).toContain("16x16");
    expect(result).toContain("마법사");
  });

  it("비정사각 해상도", () => {
    const result = buildGeneratePrompt("나무", 32, 64);
    expect(result).toContain("32x64");
  });

  // T16: requireEdges=true → 외곽선 텍스트 포함
  it("requireEdges=true이면 외곽선 텍스트가 포함된다", () => {
    const result = buildGeneratePrompt("기사", 32, 32, 16, true);
    expect(result).toContain(EDGE_TEXT);
  });

  // T17: requireEdges=false 또는 미전달 → 미포함
  it("requireEdges=false면 외곽선 텍스트가 없다", () => {
    const result = buildGeneratePrompt("기사", 32, 32, 16, false);
    expect(result).not.toContain(EDGE_TEXT);
  });

  it("requireEdges 인자 미전달 시 기존 출력과 동일 (회귀)", () => {
    const without = buildGeneratePrompt("기사", 32, 32, 16);
    const explicitFalse = buildGeneratePrompt("기사", 32, 32, 16, false);
    expect(without).toBe(explicitFalse);
    expect(without).not.toContain(EDGE_TEXT);
  });

  // T18: 직교성 — paletteSize=0과 requireEdges=true 동시 동작
  it("requireEdges=true && paletteSize=0이면 외곽선 + limited color palette 둘 다 포함", () => {
    const result = buildGeneratePrompt("기사", 32, 32, 0, true);
    expect(result).toContain(EDGE_TEXT);
    expect(result).toContain("limited color palette");
    expect(result).not.toContain("strictly limited 0-color");
  });
});

describe("buildFeedbackPrompt", () => {
  it("원본 프롬프트와 피드백이 결합된다", () => {
    const result = buildFeedbackPrompt("기사 캐릭터", "검을 더 크게", 32, 32);
    expect(result).toContain("Original: 기사 캐릭터");
    expect(result).toContain("Change: 검을 더 크게");
    expect(result).toContain("pixel art");
  });

  // T16(feedback): requireEdges=true
  it("requireEdges=true이면 외곽선 텍스트가 포함된다", () => {
    const result = buildFeedbackPrompt("기사", "검 크게", 32, 32, 16, true);
    expect(result).toContain(EDGE_TEXT);
  });

  // T17(feedback): 미전달 = 회귀 0
  it("requireEdges 미전달 시 외곽선 텍스트가 없다 (기존 회귀)", () => {
    const result = buildFeedbackPrompt("기사", "검 크게", 32, 32, 16);
    expect(result).not.toContain(EDGE_TEXT);
  });
});
